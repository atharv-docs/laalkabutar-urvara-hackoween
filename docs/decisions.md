# Architecture decisions

## Next.js App Router, client-rendered portals
- **Decision:** Next.js 16 (App Router), TypeScript and Tailwind v4, with no Vite anywhere. Portal pages are client components that read one shared state through `UrvaraProvider`.
- **Why:** both portals react to the same live state (approvals, reports, other tabs). Domain work is cheap and deterministic, so it runs in the browser. The server is used only where trust matters: `/api/farmers` creates Auth accounts with the Admin SDK.
- **Considered:** Server Actions for every mutation. Rejected for the hackathon because demo mode has no server-side store, and two code paths would drift.

## Pure domain services, deterministic planning
- **Decision:** all business rules live in `src/services` as pure functions `(state, args) → state`.
  - The scheduler is a greedy, constraint-checked slot finder: weather limits per task type, a 1 h machine travel buffer between farms, farmer availability, and deadlines.
  - The replanner turns events into proposals. Nothing moves until an owner approves.
- **Why:** final assignments must be explainable and testable. No language model decides a resource assignment.
- **Considered:** OR-Tools. Deferred, because the greedy planner already gives reasons per change and the tests pin its behaviour.

## Repository interface with an honest source label
- **Decision:** a `DataRepository` interface has two implementations:
  - `LocalDemoRepository`: localStorage, synced across tabs with the `storage` event.
  - `FirestoreRepository`: one collection per entity plus `meta/state`.

  Saves use a reference diff (services return new objects only for entities they change), so Firestore writes are minimal. `createRepository()` is the only place that chooses a repository, and the badge shows what was actually chosen.
- **Why:** the app must run with no credentials, and must never silently mix mock and live data.

## Synthetic, deterministic scenario with a fixed demo clock
- **Decision:** `createSeedState()` always builds the same state. "Now" is `state.now`, set to Wed 28 Oct 2026, 08:00 IST.
- **Why:** judges need the same story every time. Tests assert the seed is consistent (no machine or farmer double-booking, assignees match fields).

## Roles and access
- **Decision:** exactly two roles, owner and farmer.
  - In live mode, roles are Auth custom claims set only by the Admin SDK (seed script, `/api/farmers`).
  - `firestore.rules` limits farmers to their assigned farms and fields, their tasks (status fields only), their reports and their scores. Audit events are append-only.
  - Demo mode keeps only a salted SHA-256 of one-time codes.
- **Why:** client-side route hiding is not security. Plaintext passwords are never stored.

## Crop-risk runs on the owner side
- **Decision:** a farmer's report is saved unscored. The owner session runs `assessUnscoredReports`, which is idempotent and stamps `riskAssessedAt`.
- **Why:** scoring needs every farm, which a farmer is not allowed to read under the rules. The same path works in demo mode and live mode.

## Voice: Sarvam speech-to-text, browser fallback, confirm always
- **Decision:**
  - Sarvam AI speech-to-text (`saaras:v3`, `hi-IN` / `en-IN`) through a server route, `/api/speech-to-text`, so the key never reaches the browser. The page records a clip with `MediaRecorder` (auto-stop at 28 s; Sarvam's REST endpoint is for short clips).
  - Falls back to browser `SpeechRecognition` when the server has no key or the browser cannot record.
  - Rule-based intent extraction in English, Hindi and Punjabi.
  - A mandatory review screen before anything is saved.
  - Input mode (`voice` / `typed` / `demo_sample`) is stored and shown.
- **Trade-off:** Sarvam gives no live transcript while speaking (the browser engine does); the page shows a timer instead.
- **Future scope:** Sarvam translation.

## Punjabi as a third Farmer Portal language
- **Decision:** `Language` is `en | hi | pa`. Every Farmer Portal string, crop/stage/task label, seeded task title and score explanation has a Gurmukhi version, and the dictionaries are typed so a missing translation fails to compile. Voice uses Sarvam `pa-IN` for speech-to-text and text-to-speech; the reply model is told to answer in Gurmukhi.
- **Dates:** Punjabi dates and times are spelled out by hand ("ਬੁੱਧਵਾਰ, 28 ਅਕਤੂਬਰ", "ਦੁਪਹਿਰ 2:00") because Chrome ships without Punjabi date data and the server and browser must agree.
- **Type:** Mukta Mahee, Mukta's Gurmukhi sibling, follows Mukta in the font stack so Punjabi matches the rest of the UI.
- **Owner Portal** stays English.

## Conversation: Ollama explains, Sarvam speaks
- **Decision:**
  - The Speak tab is a conversation, not a one-shot form. Each farmer message (voice or typed) gets a spoken reply; the last 12 turns go to the model so follow-ups make sense.
  - When a message reads as a crop problem, finished work, a need, or a question Urvara could not answer, the reply carries a "Send this to the owner?" card. Only that tap (after optional correction in the review form) saves a report.
  - For each message the page builds a plain-text summary of *their* fields, soil readings, 48 h weather and upcoming tasks (`services/replyContext.ts`) and sends it with the conversation to `/api/assistant` (Ollama Cloud).
  - The prompt caps the reply at 3 short sentences / 45 words in the farmer's language, forbids invented numbers, disease certainty and chemical doses, and treats Urvara's rule-based answer (when there is one) as the truth to rephrase.
  - The reply is shown in the chat and, if the farmer sends a report, saved on it (`answerBy: "ai" | "rules"`), labelled "AI answer" on screen, and read aloud with Sarvam TTS (`/api/tts`), falling back to the browser voice.
  - The model answers any question (crops, livestock, prices, schemes, methods). Farm records go in a separate "reference only" message and are used only when the question is about the farmer's own fields, machines, tasks or weather; earlier prompts that asked for "a reason from the facts" made every answer drift to soil moisture and irrigation.
  - Reasoning models such as `gpt-oss` ignore `think: false`, so they run with `think: "low"` and a larger token budget; a reply that stops mid-sentence is never spoken.
  - If Ollama is not configured or fails, Sarvam's chat model answers (same Sarvam key); only if both fail is the rule-based answer used.
  - Replies play by themselves: the farmer's tap (mic, send, sample) unlocks a Web Audio context, which browsers then allow to play the reply when it arrives seconds later.
- **Why:** an LLM explains naturally in Hindi; grounding it in the records and the rule-based answer keeps it honest.

## Rupee Score
- **Decision:** a 0–100 index per farmer × crop × season, built from five weighted components: timeliness 30, yield 25, quality 15, health handling 15, efficiency 15.
  - Late tasks excused for causes outside the farmer's control are not counted.
  - The score is null ("not enough data") without timeliness and yield.
  - Corrections append a new version with the reason; history is never rewritten.
  - Leaderboards compare the same crop and season only.

## Visual system
- **Decision:** the brief's six colours are the source tokens. Darker `-ink` shades exist only so small text in a brand hue passes 4.5:1 on ivory.
- **Font:** Mukta (Ek Type) for both Latin and Devanagari, so Hindi never falls back to a mismatched face.
- **Signature view:** the shared-machine board, with weather zones running above the machine lanes. Replans draw ghost (current) and gold (proposed) slots on it.
