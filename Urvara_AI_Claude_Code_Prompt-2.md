# URVARA AI — Claude Code Build Prompt

> **Use this entire document as the implementation brief.** Build the application in the current repository; do not respond with a plan only. Inspect the existing codebase first, preserve useful work, implement the highest-priority end-to-end experience, and run the available checks before finishing.

## 0. Mission and product principle

Build **Urvara AI**, a voice-first, AI-assisted agricultural operations and coordination platform for farm owners and farmers who work across one or more farms.

**Tagline:** *Every Farm. Every Resource. In Sync.*

Urvara is not merely a farm-monitoring dashboard or a chatbot. Its defining capability is **autonomous multi-farm coordination**: it brings together weather forecasts, local conditions, soil readings, crop-health reports, inventory, people, machines, and task schedules; recommends and schedules actions; and replans when conditions change. Users must be able to see *what changed, why it changed, and what needs confirmation*.

Design the product for real-world agricultural workflows in India, including farmers who may have limited literacy or limited experience with digital apps. The farmer experience must be voice-first, visual, forgiving, and usable on a basic mobile screen. The Owner Portal should feel like a polished operational command centre, while the separate Farmer Portal stays simple, voice-first, and mobile-friendly.

**Primary hackathon constraint:** a convincing working MVP must be demoable in approximately 12 hours. Do not attempt to finish every advanced integration before the core loop works. Implement all requirements in this document in the correct phase: working MVP, clearly labelled simulated/demo functionality, or future-ready extension. Never present simulated values as live data.

**Execution reference provided by the team:** [Google Slides — slide `p12`](https://docs.google.com/presentation/d/1r_x3YgahJo4TD7yYdyGYFib_JHE4lLe6aA5zRXo6Tt4/edit?pli=1&slide=id.p12). If you can access it in the development environment, inspect the specified slide and respect any implementation/execution requirements that do not conflict with this brief. If it is inaccessible, continue using this prompt and ask the team for a PDF export or screenshot when that slide is essential; do not invent its contents.

---

## 1. Start by inspecting the repository

1. Confirm the repository is empty or inspect all existing files before making changes. This is a new project, so scaffold from scratch if it is genuinely empty.
2. Use Next.js App Router + TypeScript + Tailwind + Firebase. **Do not use Vite.**
3. Build in small, verifiable steps. Do not attempt to implement the entire specification in one giant pass.
4. At the end of each step, run relevant checks, summarise changed files and how to test the result, and STOP. Wait for the user to request the next step before proceeding.
5. If an external API or credential is unavailable, create a clean adapter and a labelled synthetic-data fallback. Do not hard-code secrets or fake successful API calls.
6. Keep the project easy to run locally. Add a README with setup, environment variables, demo accounts, feature status, and known limitations.
7. The user wants to build the repository step by step; each step must leave the repo runnable and must not break previously completed steps.

### Default implementation stack for this empty repository

The repository starts empty. Scaffold the project from scratch with this stack; **do not use Vite**. Use only synthetic data for the hackathon, with deterministic seed data and repeatable scenario/reset controls; never rely on real farmer or farm data.

- **Frontend/full-stack framework:** Next.js with the App Router, React, and TypeScript. Use the current stable setup available in the environment.
- **Styling:** Tailwind CSS, with reusable design tokens and components.
- **Icons:** lucide-react; use consistent, meaningful icons rather than emoji as interface icons.
- **Charts:** Recharts, only where charts genuinely improve understanding.
- **Database:** Firebase Firestore.
- **Authentication:** Firebase Authentication. Use role-aware demo accounts and Firebase custom claims or trusted user-role documents with secure rules as appropriate. Never trust a role value supplied only by the browser.
- **Firebase local development:** use the Firebase Emulator Suite if it can be configured quickly; otherwise provide a clearly labelled synthetic-data adapter that works without credentials.
- **Scheduling:** deterministic rules/priority scheduling first; use OR-Tools only if it can be integrated quickly and reliably.
- **Maps:** Leaflet/OpenStreetMap if practical. A usable schematic farm map is acceptable in demo mode, but label it clearly.
- **Weather:** Open-Meteo or another suitable forecast provider where practical, plus a seeded-data fallback.
- **Voice:** browser capability or a provider behind an adapter. Sarvam AI is future scope unless access and time are already available.

Do not use Vite anywhere in the setup or documentation. Do not add a separate Python/FastAPI backend unless there is a demonstrated need; prefer Next.js server actions/route handlers and Firebase for this hackathon. Do not add heavyweight infrastructure without a clear need. Prefer a complete, reliable product loop over architectural theatre.

### Firebase requirements

- Add `.env.example` with the required `NEXT_PUBLIC_FIREBASE_*` variables and explain which values are safe for client use. Never commit real credentials or service-account JSON.
- Keep Firebase initialisation in one reusable module. Handle missing configuration gracefully and show a clear demo-mode indicator.
- Use Firestore collections with documented types and relationships, for example `users`, `farms`, `fields`, `tasks`, `resources`, `reports`, `sensorReadings`, `weatherSnapshots`, `rupeeScoreRecords`, and `auditEvents`. Adjust the model when implementation reveals a simpler sound design.
- Write Firestore security rules that prevent farmers from reading or changing records outside their assignments and restrict owner actions by role. Do not treat client-side route hiding as security.
- Provide a deterministic synthetic-data seeder/reset path. Seed data must be usable without real IoT devices, live APIs, or private farmer data.
- Do not silently mix local mock state with Firestore state. Put data access behind a repository/service interface and display a persistent `DEMO DATA` / `LIVE DATA` indicator based on the actual source.

---

## Repository structure — follow this organisation

Build from an empty repository. Use the following structure as the target, adapting only where Next.js App Router requires its standard conventions. **Do not use Vite.** In particular, include `src/app/` for Next.js routes and route handlers; keep `src/api/` for typed API clients/contracts if needed rather than replacing Next.js route handlers.

```text
urvara-ai/
├── README.md
├── BUILD_PROGRESS.md
├── package.json
├── package-lock.json       # or the lockfile for the package manager chosen
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs       # or valid Next.js lint configuration for the installed version
├── .gitignore
├── .env.example
├── LICENSE
├── docs/
│   ├── architecture.png
│   └── decisions.md
├── public/
│   └── ... static assets
├── src/
│   ├── app/                 # Next.js App Router pages, layouts, loading/error states, route handlers
│   │   ├── (auth)/          # sign-in and demo entry
│   │   ├── owner/           # Owner Portal routes
│   │   ├── farmer/          # separate Farmer Portal routes
│   │   └── api/             # Next.js Route Handlers, if needed
│   ├── api/                 # typed API contracts/clients; no duplicate server implementation
│   ├── components/          # shared UI primitives and domain components
│   │   ├── ui/
│   │   ├── owner/
│   │   └── farmer/
│   ├── services/            # domain services and orchestration (planning, scoring, risk, weather)
│   ├── lib/                 # Firebase initialisation, auth helpers, validation, utilities
│   ├── repositories/        # Firestore and synthetic-data repository implementations
│   ├── data/                # deterministic synthetic fixtures and seed definitions
│   ├── types/               # shared TypeScript domain types
│   └── styles/              # global CSS and design tokens if not colocated
├── scripts/                 # seed/reset, demo utilities, architecture image generation if needed
└── tests/                   # unit/integration tests for services, access rules, and key flows
```

Repository rules:
- The example tree is a guide, not permission to omit files required to run Next.js. Create valid framework/build configuration files such as `package.json`, the package-manager lockfile, `tsconfig.json`, `next.config.ts`, and the appropriate Tailwind/PostCSS and lint config for the installed versions.
- Create `docs/decisions.md` with concise architecture choices, alternatives considered, and decisions (Next.js, Firebase, synthetic data, role model, data access abstractions).
- Create `docs/architecture.png` as a simple, readable architecture diagram showing Owner Portal and Farmer Portal flowing through shared domain services/repositories to Firebase Firestore/Auth and synthetic demo data. If image tooling is unavailable, generate an SVG and convert it to PNG with an available local tool; don't leave a broken or fake image path.
- Keep business logic out of React components. Put domain rules in `src/services/`, data access in `src/repositories/`, and reusable UI in `src/components/`.
- Use TypeScript types shared across portals. Use Next.js server components by default where suitable and client components only for interactivity.
- Keep the tree purposeful; don't create empty folders simply to match a diagram. Every committed file should have a role.

---

## 2. Required portal architecture and roles

**IMPORTANT: There are exactly two user portals: the Owner Portal and the Farmer Portal.** Do not create a third role or duplicate owner dashboards. The Owner Portal combines business/performance analytics with user management and daily farm operations, organised into clearly distinct navigation areas. The Farmer Portal is a separate, mobile-first experience with its own layout and permissions.

### 2.1 Owner Portal — analytics, administration, and farm operations

Audience: a farm owner/landowner managing one or more farms, fields, farmers, shared resources, and agricultural operations.

The Owner Portal combines two clear areas in one account and portal:

**A. Overview & business/performance analytics**
- Understand performance across all owned farms at a glance.
- Compare farms and crops using transparent, crop-specific records.
- Review yield, produce quality, crop health, estimated crop value, input costs where recorded, and farm-level trends.
- Review crop-wise Rupee Score performance and historical score changes.
- Understand current and forecast weather, soil conditions, crop risks, disease/scouting alerts, task progress, and resource utilisation.
- See recommended actions, rationale, estimated benefit, cost/risk where known, and whether owner approval is needed.
- Approve or reject consequential schedule changes and review unresolved issues.
- Drill into an individual farm, crop, field, or farmer record.
- View crop-specific leaderboards with clear metrics and context.
- Export or view a simple report if it can be completed without delaying core workflows.

**B. Operations & administration**
- Add, edit, deactivate, and manage farmer accounts.
- Create a unique login ID and secure invitation/temporary credential flow for each farmer. Never store plaintext passwords in Firestore.
- Assign farmers to specific farms, fields, crops, and tasks; support multiple assignments where appropriate.
- Create and edit farms and fields with location, optional size/area, crop, crop stage, and assigned people.
- Create tasks, assign responsible farmers and due dates, monitor completion, and handle missed tasks.
- View task queues, schedules, resource conflicts, machine availability, labour availability, and inventory.
- Manage shared machinery, seeds, fertilisers, pesticides, irrigation water, labour, and other configured resources.
- Coordinate resource distribution across farms.
- Review crop-health reports, weather alerts, risk alerts, scouting recommendations, and follow-up status.
- Reassign tasks when weather changes, machinery breaks down, labour becomes unavailable, or a crop issue emerges.
- Review farmer reports and task completion evidence; maintain an audit trail.
- View Rupee Score details and farmer records.
- In future scope, create/assign scouting pins and track/share field scouts across farms.

**Owner Portal navigation should separate analytics from actions**, for example: Overview, Farms & Fields, Operations & Tasks, Farmers, Resources, Crop Health, Weather & Sensors, Rupee Score, Scouting (future scope), and Settings. Use section headers or grouped navigation rather than mixing every capability on one crowded screen.

The Owner Portal prioritises both **understanding performance** and **coordinating work**. The overview should remain concise; put detailed tables and administration flows in their own sections.

### 2.2 Farmer Portal — voice-first, mobile-first

Audience: farmers and agricultural workers, including users who may have limited literacy or limited experience with digital apps. This must be a separate portal, not merely a smaller version of the owner dashboard.

Primary jobs:
- Report a crop problem or field condition by speaking.
- Ask practical questions such as “When will the sprayer reach my field?” or “Should I irrigate today?”
- Hear understandable instructions in their selected language where speech output is supported.
- See today’s tasks and schedule changes as simple cards with large icons and short wording.
- Report task completion, required resources, crop symptoms, and current conditions.
- Correct a transcript or confirm what the system understood before a report or consequential action is submitted.
- View only their assigned farms/fields and permitted personal records.
- Receive visual/audio warnings for important tasks, weather changes, and crop risks.

Farmer Portal UX rules:
- Mobile-first; comfortable at 360px width and usable on lower-resolution phones.
- One obvious primary action per screen. It should be findable without reading a long paragraph.
- Large touch targets (aim for 44px or more), high-contrast text, short labels, clear progress states, and no tiny dense tables.
- Voice recording must have clear states: ready, recording, processing, transcript available, correction needed, confirmed, and failed.
- Keep typed input as a fallback, but do not make typing the only path.
- Avoid shame-inducing or overly technical wording. Give practical, respectful explanations.
- Speak/translate only when a real voice or language provider is available. Otherwise make the demo limitation visible and retain an editable text transcript.

### 2.3 Authentication and permissions

- Provide a simple login experience and seeded demo accounts for Owner and Farmer roles.
- Route users into the correct portal after login.
- Enforce role-aware navigation and actions at the UI layer, and in server/API logic where present.
- Farmers should only see assigned farms/fields, tasks, and their permitted records.
- Owner permissions include farm analytics, accounts, assignments, tasks, inventory, approvals, and operational replanning.
- For demo account creation, show a temporary credential only once or use a safe invite/reset flow. Never store plain-text passwords as a persistent field.
- Do not include real personal or farmer data. Seed synthetic records only.

---

## 3. Visual design system — follow exactly

The attached palette is the source of truth. Use these six colours as reusable design tokens. **Do not replace the palette with blue, purple, neon gradients, or generic AI gradients.**

| Token | Hex | Intended use |
|---|---|---|
| **Deep Forest** | `#234735` | Primary brand colour; main navigation, primary buttons, selected states, important headings, brand mark |
| **Sage Green** | `#8FAF8A` | Secondary elements, subtle success/healthy states, secondary charts, supportive surfaces |
| **Harvest Gold** | `#D5A84B` | Highlights, key metrics, crop/financial performance, important counts and attention-worthy indicators |
| **Terracotta** | `#B96F4E` | Alerts, warnings, risk accents, destructive/attention states when appropriate; do not use as the only warning signal |
| **Warm Ivory** | `#F6F3E9` | Main application background, page canvas, calm empty states |
| **Soil Brown** | `#66513E` | Primary text/supporting elements, secondary labels, borders and earthy supporting details |

### Colour implementation rules

- Create CSS variables/design tokens for all six colours; use them consistently across pages.
- Use Warm Ivory as the main canvas, white/ivory surfaces for cards, Deep Forest for navigation and key actions, and Soil Brown for readable text.
- Use Harvest Gold deliberately for data emphasis, not as a large block behind long text.
- Use Terracotta for incidents and urgent states, paired with an icon and text label. Do not rely on colour alone to convey risk.
- Validate text contrast. If a colour pairing is weak, put the text on an appropriate contrasting surface instead of changing the brand colours arbitrarily.
- Make charts use the palette consistently and include legends, units, labels, and tooltips.
- The palette should feel natural, grounded, premium, calm, and agricultural—not rustic or cluttered.
- Avoid excessive gradients, glassmorphism, giant empty hero sections, excessive rounded pills, and generic SaaS template layouts.

### Suggested design tokens

```css
:root {
  --color-deep-forest: #234735;
  --color-sage-green: #8FAF8A;
  --color-harvest-gold: #D5A84B;
  --color-terracotta: #B96F4E;
  --color-warm-ivory: #F6F3E9;
  --color-soil-brown: #66513E;
}
```

Use the names above as source tokens even if the component library has its own semantic aliases. Define semantic mappings such as `primary`, `background`, `text`, `success`, `warning`, and `danger` without losing the original brand tokens.

---

## 4. UX quality bar — more important than feature count

The application must feel like one coherent product. UX quality is a first-class requirement, not a final styling step.

### 4.1 Information architecture

- Use two separate portals: **Owner Portal** and **Farmer Portal**.
- Use role-appropriate navigation and a clear page title on every view.
- Keep the most urgent information near the top: tasks requiring action, crop risks, weather changes, pending confirmations, and inventory conflicts.
- Avoid showing every metric on every screen. Put detailed analytics behind relevant drill-downs.
- Make the primary next action obvious.
- Keep labels consistent: farm, field, crop, farmer, task, resource, report, scouting alert, Rupee Score.

### 4.2 Layout and components

- Desktop owner layout: sidebar navigation, compact top bar, clear content grid, concise KPI cards, and actionable tables/lists.
- Tablet: collapse the sidebar and preserve the most important information hierarchy.
- Farmer mobile layout: bottom navigation or a simple compact menu, large action cards, voice control, today’s tasks, and visible alerts.
- Create reusable components for KPI cards, farm cards, sensor-status cards, weather strips, alert panels, task rows, task timelines, status chips, data-source labels, score breakdowns, confirmation dialogs, and empty/error/loading states.
- Use tables only when comparing records benefits from rows and columns; provide mobile card layouts or horizontal scroll with clear labels where necessary.
- Maps and charts should support the task rather than dominate the page.

### 4.3 Feedback and state handling

Every interactive feature needs visible feedback:

- Loading/skeleton state while data is being retrieved.
- Empty state with a useful next action, not a blank panel.
- Error state with a clear explanation and retry/fallback path.
- Success confirmation after a save, assignment, approval, report, or status change.
- Disabled state when an action is not allowed, with the reason explained.
- Unsaved-change warning for forms when appropriate.
- Confirmation for consequential actions such as reassigning shared machinery or committing a schedule change.
- Undo or revert where practical for non-destructive demo actions.

### 4.4 Forms and accessible language

- Use clear labels, helpful examples, and validation messages next to fields.
- Do not make users infer units. Display units for moisture, temperature, rainfall, quantity, area, time, and money.
- Prefer understandable language over agricultural or AI jargon; add concise explanations for terms such as “risk score” or “replan”.
- Support keyboard navigation for owner workspaces and visible focus states.
- Use semantic headings, accessible labels, and appropriate contrast.
- Do not encode status by colour alone: pair colour with text and/or an icon.

### 4.5 Visual polish

- Choose a consistent spacing scale, type scale, border radius, icon size, and interaction pattern.
- Use whitespace to make complex farm information easier to scan.
- Keep animation subtle and functional (e.g., recording pulse, task update, loading transition). Respect reduced-motion preferences.
- Prioritise legibility of metric values and labels; avoid visual noise.
- Create a polished logo/wordmark treatment using text and a simple sprout/field-line symbol if no logo asset exists. Do not block the app on logo work.

---

## 5. Functional feature specifications

### 5.1 Voice reporting and assistant

The platform should support the following voice journey:

1. Farmer taps a prominent microphone button.
2. UI indicates recording state and allows stopping/cancelling.
3. Speech is transcribed if a working provider is available.
4. The system extracts structured details where possible: farm, field, crop, issue/question, symptom, severity, observed time, and requested resource.
5. Show the transcript and inferred details in simple language.
6. Farmer can correct the transcript/details or confirm.
7. Confirmed report appears in the right farm’s activity log and relevant owner views.
8. If it is a question, provide an answer based on current known data, with the data timestamp/source when relevant.
9. If the provider is unavailable, enable manual transcript entry or seeded voice demo records and label that state. Never claim a recording was genuinely transcribed if it was not.

Support general voice queries, not just crop problem reports. Examples:
- “My tomato leaves have yellow spots.”
- “I finished irrigation in Field 2.”
- “We need another sprayer tomorrow.”
- “When will the tractor reach my farm?”
- “Should we irrigate today?”

**Future scope:** Sarvam AI for Indian-language speech recognition, translation, and text-to-speech. Verify supported languages, model names, and API limits before wiring it in. Keep the provider behind a replaceable adapter.

### 5.2 Farm, field, crop, and farmer records

Minimum entities should include:

- User: identity, role, login identifier, status, permitted farms/fields.
- Farm: name, location/coordinates when available, optional area, crop portfolio, assigned farmers, local conditions.
- Field: parent farm, field name/identifier, crop, crop stage, area if known, soil profile/readings, current concerns.
- Crop season: crop type, planting date/stage where known, season, yield and produce-quality records when available.
- Task: title/type, farm/field, crop, assigned farmer, due date/window, priority, status, resource needs, rationale, completion evidence, history.
- Resource: type, quantity/unit, availability, assigned farm/task, status, optional cost.
- Report/incident: source, description/transcript, crop/field, severity, timestamp, confidence/confirmation, status, attachments when supported.
- Sensor reading: kind, value, unit, measured time, source (live/manual/simulated), farm/field.
- Weather point/forecast: timestamp, area/farm, variables, provider/source, whether live or seeded.
- Rupee Score record: farmer, crop, season, value, input breakdown, source records, timestamp and change reason.
- Scouting recommendation/pin (future-ready): target farm/field, reason, risk, assigned scout, status, check-in and observation.

Use synthetic demo data only for the hackathon. Do not depend on real farmer records, real farms, paid APIs, physical sensors, or live credentials to demonstrate core workflows. Include a deterministic seed script/utility and a reset function. Use different crops, farm conditions, resource constraints, and tasks. Use timestamps and IDs consistently so all dashboards show the same shared state.

### 5.3 Soil monitoring

Display:

- Soil moisture percentage or the unit supplied by the sensor.
- Soil pH where available.
- Soil nutrient indicators such as N/P/K only where supported by sample data/instrument output.
- Salinity/soil-health indicators where available.
- Timestamp and data source for each reading.
- Clear distinction between actual, manually entered, and simulated readings.
- Farm-specific and field-specific view.

Use sensor readings as input to recommendations, not as a guarantee. Real nutrient/soil measurements may require dedicated testing instruments. For the 12-hour MVP, simulated readings are acceptable if labelled.

### 5.4 Local weather and forecast API

Display a farm-specific forecast and current/local readings where available:

- Temperature.
- Rainfall likelihood and expected precipitation where the source supports it.
- Humidity.
- Wind speed/direction where available.
- Source, timestamp, and forecast horizon.
- Local sensor readings for a specific farm or defined range, clearly separated from regional forecasts.

Use a weather-provider adapter and seeded fallback data. A failed request must not break the main dashboard. Do not display mocked weather as live. The app should surface a simple stale-data indicator if readings are old.

### 5.5 Weather-aware recommendations and dynamic replanning

The planning system should consider:

- Forecast changes and local weather readings.
- Soil moisture and available soil data.
- Crop type and crop stage.
- Task deadline/urgency and the likely cost of delay.
- Farmer and labour availability.
- Shared machine availability and capacity.
- Inventory and water availability.
- Crop-health incidents and disease-risk context.

It can recommend actions such as rescheduling irrigation, postponing spraying when configured rain/wind constraints are triggered, moving appropriate harvesting tasks, or creating a crop scouting task. Avoid presenting generic model output as guaranteed agronomic advice.

Use deterministic constraints/logic for final scheduling. An LLM may extract a report or explain a recommendation, but it must not silently invent final resource assignments. Show:

- Original task schedule.
- Proposed new schedule.
- Which tasks changed and which stayed the same.
- Reason for each change.
- Resources affected and any conflicts.
- Estimated impact where data supports it.
- Whether approval is required.

Ask for confirmation before consequential or safety-sensitive changes. Allow a user to approve, reject, or request a revision.

### 5.6 Shared inventory and resource coordination

Track the availability and allocation of:

- Machinery (e.g., sprayer, tractor, harvester).
- Labour/farmers and their schedules.
- Seeds, fertilisers, pesticides, and other supplies.
- Irrigation water or relevant water capacity.
- Other resource types configured by the Owner.

Rules:

- A machine cannot be scheduled in two fields at the same time.
- Assignments must respect known resource capacity and time windows.
- Do not assign a task requiring unavailable stock or unavailable labour without flagging the issue.
- Resource shortages should be visible with clear suggested next steps.
- When a resource becomes unavailable, re-plan affected tasks and retain an audit trail.

The first MVP may use a constrained priority/greedy scheduler. If an optimiser is implemented, show the reason for the allocation rather than only presenting the result.

### 5.7 Crop health, disease risk, and scouting

A farmer may report symptoms through voice, text, or (when implemented) an image. A report can include crop, field, symptom, severity, time, and notes.

For a new crop-health report, the risk module should consider:

- Distance between farms/fields.
- Crop type and susceptibility if that data is configured.
- Similar reports/symptoms.
- Relevant environmental factors such as humidity/rain where data is available.
- Time since the initial report and report confidence.

Expected UI behaviour:

- Mark the original report as unverified until appropriately reviewed.
- List nearby farms with a reason and a risk category/score.
- Recommend a scouting/inspection task for high-risk locations.
- Show which farms were alerted, why, and whether follow-up happened.
- Do not claim definitive diagnosis or confirmed disease spread based solely on a heuristic score.
- Use a simple explainable rules-based scoring method for MVP; add image-based disease detection as future scope unless a reliable model is already available.

### 5.8 Dynamic crop-specific Rupee Score

Rupee Score is a **crop-specific farmer credibility/performance index**, maintained for personal records, analysis, and crop-wise leaderboards. Do not make it a mysterious number or a literal amount of money.

Implement it as a transparent numeric index (e.g., 0–100) in the MVP, with separate financial indicators in Indian rupees (`₹`) where real or demo data supports them. Explain in the UI that the index is a demo methodology until formally validated.

Potential score inputs:

- Verified task completion and timeliness.
- Crop yield versus recorded expectations, where available.
- Harvest quality records.
- Crop-health consistency and verified outcomes.
- Resource efficiency.
- Historical performance for the same crop and season.
- Accuracy/completeness of reporting only where it is fair and verifiable.

Required views:

- Personal crop-wise score and history.
- Crop-specific leaderboard, comparing like crops and preferably similar seasons/conditions.
- A visible breakdown of every component and the data behind it.
- Change history: what data changed and why the score moved.
- Clear “not enough data” state rather than fabricated precision.

Fairness and safety:

- Do not use the score as the sole basis for wages, worker discipline, employment, access to equipment, lending, or high-impact decisions.
- Allow owners/admins to correct records and annotate disputed outcomes.
- Account for context where possible (e.g., weather or resource constraints outside a farmer’s control).
- Never rank one crop against a different crop in the same leaderboard.
- Label all synthetic values as demo data.

### 5.9 Farmer tasks, reports, and notifications

- Farmers can see today’s and upcoming tasks using clear, short cards.
- A farmer can mark a task started/completed or report a blocker, with an optional short note/voice report.
- Completion updates the shared task timeline and relevant Owner Portal.
- Overdue tasks and missed steps should trigger a visible alert, not silently vanish.
- Weather-driven or resource-driven schedule changes should show what changed and why.
- Provide audio/visual notification patterns where possible; do not require external push infrastructure for the MVP.
- Every task should have a status, due date, assignment, and history.

### 5.10 Scouting pins and scout sharing — future scope, visible in roadmap

Plan this feature but do not let it block the MVP:

- Place a pin on a farm/field map to indicate an inspection/scouting task.
- Attach reason, risk level, crops, due time, and recommended checks.
- The Owner can assign a scout, share a scout between nearby farms, and track status/check-ins.
- Scout can submit an observation and mark the inspection complete.
- Disease-risk events can create suggested scouting pins automatically.
- Owner can see which farms are awaiting scouting and what the scout found.

If not implemented, show it as a disabled/coming-soon module with honest labeling, not as a fake working feature.

---

## 6. Core agent/module architecture

Use named, independently testable modules. A multi-agent framework is optional; real separation of responsibilities and reliable outcomes matter more than calling everything an agent.

| Agent/module | Responsibility |
|---|---|
| Voice & intent module | Transcribe/accept text, identify intent/entities, show transcript, request confirmation |
| Sensing/data-ingestion module | Gather weather forecasts, local weather readings, soil data, task/resource status, and crop reports |
| Crop-risk module | Estimate disease/scouting risk based on explicit inputs and explain the score |
| Planning module | Build schedules using deadlines, configured constraints, and priority/value-at-risk estimates where data exists |
| Resource coordinator | Resolve conflicts across farms, farmers, machines, labour, supplies, and water |
| Replanner | Respond to forecast flips, new crop reports, task failures, and resource breakdowns; change affected tasks only where practical |
| Explanation/approval module | Explain recommendations in simple language and collect approvals for consequential changes |
| Rupee Score module | Compute crop-specific score breakdowns and maintain traceable history |
| Feedback/outcome module | Compare planned tasks with actual outcomes and improve simple priorities/forecast trust over time |
| Notification module | Surface important tasks, alerts, and schedule changes to the correct role |

For MVP, deterministic rules plus a structured extraction/LLM provider are acceptable. Do not introduce a complicated agent framework unless it saves implementation time. All core operations should remain explainable and testable.

---

## 7. Required key user journeys

Implement at least the first four journeys end-to-end, using synthetic data where needed.

### Journey A — farmer reports a crop problem by voice

1. Farmer opens the Farmer interface.
2. Taps “Report a problem” and speaks or uses the transcript fallback.
3. Urvara shows the transcript and extracted crop/field/symptom.
4. Farmer corrects/confirms the report.
5. Report appears in the correct field’s timeline.
6. Risk module identifies potentially affected nearby farms and suggests scouting.
7. Owner sees the report and suggested follow-up; Owner Portal updates the crop-risk overview.

### Journey B — weather changes and schedule is replanned

1. Dashboard shows the current schedule and forecast.
2. A seeded forecast changes to show rain during a scheduled task window.
3. Urvara identifies affected tasks and checks crop rules, resource constraints, and alternative time windows.
4. UI displays before/after schedule and clear reasons.
5. Authorised user approves/rejects the proposed plan.
6. Updated tasks appear across the relevant dashboards with an audit/history entry.

### Journey C — shared machine becomes unavailable

1. A shared sprayer/tractor/harvester is assigned to tasks on multiple farms.
2. The Owner marks the machine unavailable/broken.
3. Scheduler detects conflicting/affected tasks.
4. Urvara reallocates or reschedules tasks subject to availability and deadlines.
5. Dashboard highlights any task that cannot be safely rescheduled and requires human attention.

### Journey D — Rupee Score and owner analysis

1. Owner opens Performance & Rupee Score.
2. Selects a crop and season.
3. Sees score, history, leaderboard, and underlying factors.
4. Opens a score change to view its source records/reason.
5. A correction to a verified record updates the score with a new audit entry.

### Journey E — Owner creates and assigns a farmer

1. Owner adds a farmer and creates a unique login ID/invitation or demo temporary credential.
2. Owner assigns the farmer to one or more farms, fields, and crops.
3. Owner assigns the farmer a task.
4. Farmer logs into the separate Farmer Portal and sees only assigned fields/tasks.
5. Farmer reports completion; the owner views update.

### Journey F — sensor and weather context

1. User opens a farm/field view.
2. Sees soil moisture, available pH/nutrients/salinity, and local weather readings.
3. Each value clearly shows units, timestamp, and whether it is live, manual, or simulated.
4. A threshold crossing triggers a contextual recommendation.

---

## 8. Demo data and initial experience

The app must not open to an empty generic dashboard. Seed a coherent scenario so a judge can understand the system in under 30 seconds.

Suggested scenario:

- 6 farms with different crops and conditions.
- 8–12 fields across those farms.
- 6–10 farmers with different assignments.
- 3–4 shared machines (e.g., sprayer, tractor, harvester).
- A small inventory of supplies and irrigation resources.
- Crop tasks for irrigation, spraying, scouting, fertilisation, and harvesting.
- Soil moisture and other soil readings, clearly marked **SIMULATED**.
- Local weather readings and a multi-day forecast, marked live or demo based on source.
- One farm with a possible crop disease report and nearby fields that may need scouting.
- One forecast-change event that causes an explainable reschedule.
- One machine-breakdown event that creates a resource conflict and triggers re-planning.
- Rupee Score records for selected crops with a visible synthetic-data label.

Provide an easy “Run demo incident” or “Simulate weather change” control in an appropriate demo/operations area. It must trigger real local application state changes and update the relevant views; it must not simply display a prewritten success toast.

Every seeded number must be internally consistent enough for the workflows (e.g., one machine cannot be in two places at once). Add a reset-demo-state action so the story can be repeated during judging.

---

## 9. Step-by-step repository build plan — follow this sequence strictly

**Critical instruction:** Implement only one step at a time. At the end of each step, test it, explain what changed, give exact commands to run it, list known issues, and STOP. Do not automatically start the next step. The user will prompt you to continue. Keep a short `BUILD_PROGRESS.md` checklist so progress survives between sessions. Every step must leave the repository in a runnable state.

### Step 1 — Project foundation and UX shell

- Scaffold Next.js App Router + TypeScript + Tailwind from the empty repository; do not use Vite.
- Set up linting, project scripts, shared layout, typography, responsive navigation, reusable design tokens, and all six brand colours.
- Create a polished login screen and clearly separated workspace shells for the Owner Portal and Farmer Portal. Authentication may be a clearly labelled temporary demo role selector in this step only.
- Add README, `BUILD_PROGRESS.md`, `docs/decisions.md`, and a valid `docs/architecture.png`; create the expected `src/`, `tests/`, `scripts/`, and docs structure as files are needed.
- Use synthetic static fixtures only; do not build all business features yet.
- Validate the app starts and is responsive. Then STOP and wait.

### Step 2 — Synthetic data model and Firebase foundation

- Add Firebase client initialisation, Firestore/Auth adapters, typed domain models, security rules, and `.env.example`.
- Create deterministic synthetic seed data for farms, fields, farmers, crops, tasks, resources, reports, sensor readings, weather, and Rupee Scores.
- If Firebase credentials are missing, app must remain runnable in an explicitly labelled local demo-data mode.
- Add data-source labels and a reset-demo-data control. Test that seeded entities are internally consistent. Then STOP and wait.

### Step 3 — Owner Portal

- Build the owner overview, multi-farm portfolio, business/performance analytics, crop comparisons, crop-specific Rupee Score history/leaderboard, and crop/weather risk summaries.
- All values must come from shared synthetic fixtures/repositories, not hardcoded decorative KPI cards.
- Add useful empty/loading/error states and responsive layouts. Then STOP and wait.

### Step 4 — Owner Portal operations and administration

- Add farmer and farm/field management, assignments, tasks, shared resources/inventory, status updates, and operational alerts inside the Owner Portal.
- Build the add-farmer flow with synthetic/demo credentials initially; use Firebase Auth properly when configured. Never store plaintext passwords in Firestore.
- Ensure changes update the shared repository and appear in the owner/farmer views. Then STOP and wait.

### Step 5 — Farmer Portal

- Build the separate Farmer Portal: today’s tasks, task completion/blocker reporting, crop issue reporting, transcript editing/confirmation, and a usable typed fallback.
- Use large touch targets, plain language, clear audio/recording states, and mobile-first layouts. Real speech providers are not required for this step; do not pretend typed input was speech. Then STOP and wait.

### Step 6 — Weather/soil context and autonomous replanning

- Add synthetic soil readings and local weather/forecast snapshots, with explicit source/time labels.
- Implement a deterministic weather-change event that changes real task state, produces before/after schedule views, explains why tasks moved, and requires approval for consequential changes.
- Add machine-breakdown/resource-conflict simulation and a repeatable reset. Then STOP and wait.

### Step 7 — Disease risk, scouting suggestions, and Rupee Score detail

- Add explainable rules-based cross-farm disease-risk scoring and suggested scouting tasks; mark reports unverified and never claim a definitive diagnosis.
- Complete score breakdowns, history, correction/audit events, and same-crop leaderboard behaviour. Then STOP and wait.

### Step 8 — Optional integrations and final hardening

- Only after Steps 1–7 work: add a weather API adapter, browser speech support, and optional future-provider stubs for Sarvam AI and physical sensors.
- Add accessibility/responsive QA, security-rule review, demo rehearsal, and build/lint/test fixes. Keep scout sharing and image-based disease detection as future scope unless there is extra time.

**Do not skip ahead.** If the user asks for “Step 1”, implement only Step 1. If the user asks to continue, implement the next incomplete step only. If the user explicitly asks for multiple steps, follow that scope.

---

## 10. MVP delivery priorities

### P0 — must work before polishing optional features

1. Strong brand shell and role-based navigation for two roles.
2. Separate **Owner Portal** and **Farmer Portal**; the Owner Portal must include both analytics and operations.
3. Farmer mobile-first home with voice/report action, transcript correction/fallback, and assigned tasks.
4. Seeded farms, fields, crops, farmers, tasks, inventory, and sensor/weather data.
5. Farm/field detail with sensor values, source/time labels, and crop-health reports.
6. Weather-driven recommendation and working replanning event.
7. Shared-resource conflict and breakdown event that causes a real schedule update.
8. Disease-risk/scouting recommendations using explainable rules.
9. Rupee Score with crop-specific history, components, and leaderboard.
10. Working forms, buttons, filters, status changes, and visible success/error states.

### P1 — complete if time allows

- Working weather forecast API plus fallback.
- Browser/provider speech-to-text integration, with transcript editor and fallback.
- Add farmer account flow and farm/field assignment forms.
- Inventory management and task completion reporting.
- Detailed farm comparison charts and export.
- Voice output for farmer instructions if the provider is available.

### P2 — future scope; keep architecture ready and show status honestly

- Sarvam AI multilingual speech-to-text, text-to-speech, translation, and voice conversations.
- Physical soil moisture/quality sensors and local weather stations for specific farm ranges.
- Image-based crop disease detection using a validated model.
- More advanced disease spread prediction using verified observations and crop-specific agronomic models.
- Full scouting pins, scout sharing/assignment, check-ins, and scout tracking by the Owner.
- Advanced optimiser, real operational history, learned priorities, multi-season insights, and production deployment.

Do not build P2 features at the expense of P0 end-to-end workflows.

---

## 11. Recommended screen inventory

Build a well-designed set of connected screens. Reuse layout and components, but keep role content distinct.

### Public/auth
- Login with role-aware demo accounts and concise product introduction.

### Owner Portal
The following are sections within **one Owner Portal**, not separate portals or roles:
- **Overview:** concise farm portfolio summary, active risks, tasks requiring attention, and resource conflicts.
- **Farms & Fields:** farm portfolio/map and farm/field details.
- **Crop Health:** disease-risk overview, reports, recommended scouting, and follow-up status.
- **Weather & Sensors:** forecast, soil readings, local sensor context, timestamps, and source labels.
- **Performance & Rupee Score:** business/performance analytics, crop comparisons, score details/history, and crop-specific leaderboards.
- **Operations & Tasks:** task list/board/calendar, task details, task creation/assignment, schedule approvals, and status changes.
- **Farmers:** farmer accounts, assignments, permitted records, and activity history.
- **Resources:** inventory, shared machinery, labour, water, and availability/conflict management.
- **Scouting:** clearly labelled future-scope placeholder unless implemented.
- **Reports & Settings:** include where time permits.

### Farmer Portal
- Simple home/today’s tasks.
- Voice assistant/report issue.
- Report review and confirmation.
- Farm/field status and crop-health notices.
- Task detail and completion/blocker reporting.
- Personal crop records/Rupee Score where enabled.
- Settings for preferred language and voice options where supported.

Do not implement every screen as a static mock. Prioritise connected navigation and functional paths for P0 journeys.

---

## 12. Data integrity, privacy, and safety

- Use synthetic information in the hackathon demo.
- Clearly label all simulated sensor values, forecast fallbacks, estimated financial impact, and sample Rupee Scores.
- Do not claim an agricultural disease is confirmed based on a simple risk heuristic.
- Do not present automated crop recommendations as guaranteed or universally applicable. Show the assumptions and encourage expert review for high-risk interventions.
- Do not silently execute high-impact schedule changes. Keep a confirmation and audit trail.
- Limit farmer access to assigned farms/fields and relevant records.
- Store no plain-text passwords. Never put API keys in client-side source. Use environment variables and document setup.
- Keep data provenance: each forecast, reading, report, recommendation, and score component should have a source/time or be labelled synthetic.
- Rupee Score should be explainable, challengeable, crop-specific, and not a sole determinant of wages, discipline, hiring, or access to resources.
- Make errors recoverable, and avoid losing a farmer’s voice report when an API call fails.

---

## 13. Acceptance criteria

Before concluding, verify these outcomes manually or through tests:

- [ ] App starts using documented commands.
- [ ] Login and navigation provide distinct Owner Portal and Farmer Portal.
- [ ] Owner Portal includes business/performance analytics, crop comparisons, risks, approvals, farmer/account management, task coordination, and Rupee Score.
- [ ] Owner Portal can manage/assign farmers, fields, tasks, and resources (or has a clearly explained partial implementation if a P0 item is blocked).
- [ ] Farmer interface is usable on a narrow mobile viewport and includes a prominent voice/report path plus typed/transcript fallback.
- [ ] Seeded demo data appears immediately after login.
- [ ] Simulated sensor data is visibly labelled and timestamped.
- [ ] A crop-health report can create a visible scouting recommendation for nearby farms with an explanation.
- [ ] A weather change causes a genuine local schedule update and an explanation of the changes.
- [ ] A machine-breakdown event detects resource conflict and updates affected tasks or flags unresolved constraints.
- [ ] Rupee Score is crop-specific, has a visible breakdown/history, and does not conflate its index with a monetary amount.
- [ ] Core buttons, forms, filters, tabs, selectors, and navigation actually work.
- [ ] Loading, empty, error, and confirmation states exist where relevant.
- [ ] Layout is responsive, brand colours are correct, and keyboard/focus/contrast basics are respected.
- [ ] The build/lint/tests available in the repo pass, or any remaining failure is clearly reported.
- [ ] README explains setup, demo accounts, environment variables, data labels, working integrations, and known limitations.

---

## 14. Final instructions to Claude Code

1. This is an empty-repository, step-by-step build. Start with **Step 1 only** unless the user explicitly requests a different step.
2. Use Next.js App Router + TypeScript + Tailwind + Firebase. **Do not install or use Vite.**
3. Do not build the entire platform in one response. Implement only the current step in the build plan, test it, update `BUILD_PROGRESS.md`, summarise changed files and commands, and STOP for user approval before the next step.
4. Keep visual quality high from the beginning: coherent typography, layout, spacing, responsive behaviour, and meaningful empty/loading/error states. UX is a core requirement, not a final polish pass.
5. Use consistent synthetic data and avoid lorem ipsum or generic KPI filler. The dashboard must tell a coherent operational story.
6. Ensure the app changes state when the user acts. Do not create buttons that only look clickable or pages that are disconnected static mockups.
7. Build repeatable demo incidents for weather replanning and machinery unavailability in the relevant later steps. Show before/after state and rationale.
8. Do not let external API or model credentials block local demonstration. Implement graceful fallbacks honestly and label synthetic data.
9. Run the relevant app/build/lint/tests for the current step. Fix issues before stopping. Summarise what is complete, how to run it, and what remains.

**Success means a judge can understand the product quickly, use it without explanation, trigger a real incident, observe Urvara coordinate a response across farms, and see why the system made each decision.**
