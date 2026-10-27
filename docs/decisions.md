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

## Voice: browser speech first, confirm always
- **Decision:**
  - Browser `SpeechRecognition` (`hi-IN` / `en-IN`) with feature detection.
  - Rule-based intent extraction in English and Hindi.
  - A mandatory review screen before anything is saved.
  - Input mode (`voice` / `typed` / `demo_sample`) is stored and shown.
- **Considered:** Sarvam AI for Indian-language speech and translation. Kept as future scope behind the same adapter shape.

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
