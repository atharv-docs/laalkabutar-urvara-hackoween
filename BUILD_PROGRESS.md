# Build progress

The brief's §9 says to build one step at a time. At the team's request, Steps 1–7 were built in one pass on 2026-10-27.

- [x] **Step 1: Foundation and UX shell.**
  - Next.js 16, TypeScript and Tailwind v4.
  - Brand tokens, Mukta font, login, Owner and Farmer shells.
  - README, docs/decisions.md, docs/architecture.png.
- [x] **Step 2: Data model and Firebase foundation.**
  - Typed domain model and a deterministic seed.
  - DataRepository with demo and Firestore implementations, `firestore.rules`, `.env.example`, seed script.
  - DEMO DATA / LIVE DATA badge and reset.
- [x] **Step 3: Owner analytics.**
  - Overview, Farms & Fields, crop and farm comparison.
  - Rupee Score leaderboard and history.
  - Weather and crop-risk summaries.
- [x] **Step 4: Owner operations.**
  - Tasks with constraint validation, farmers (create, assign, deactivate, reissue code), farms and fields.
  - Resources, stock and conflicts, plus the audit trail.
- [x] **Step 5: Farmer Portal.**
  - Today, voice/typed/sample report with transcript review, task actions and blockers.
  - Fields, My record, Settings, in Hindi and English.
- [x] **Step 6: Weather, soil and replanning.**
  - Seeded forecasts with a storm event, and soil readings with source labels.
  - Before/after replan with approval, machine breakdown, extend-and-replan.
- [x] **Step 7: Disease risk and Rupee Score detail.**
  - Explainable scouting risk, scouting tasks, report review.
  - Score breakdown, corrections and audit.
- [ ] **Step 8: Optional integrations and hardening.**
  - Live weather API adapter (Open-Meteo).
  - Sarvam AI speech-to-text: done (`/api/speech-to-text`). Translation/TTS and sensor adapters remain.
  - Run against a real Firebase project.
  - Localise the strings that services generate.

Verified on 2026-10-27:
- `npm run typecheck`, `npm run lint` and `npm test` (12 tests) all pass.
- `npm run build` passes.
- Screenshots checked at 1440 px and 390 px.
