# Design direction record

**Mode:** Operate for both portals. The login page carries the brand.

**How the direction was chosen:**
- Brief §3 says "Visual design system: follow exactly". It fixes the six-colour palette, the layout patterns (owner sidebar, mobile-first farmer portal) and the logo asset. So the brief pinned the visual world, and no concept-seed direction round ("concept roll") was run.
- The build was code-led because no image generation was available, so no comp exists.

**Direction contract:**
- **THESIS:** make multi-farm coordination visible: what changed, why, and what needs approval. Refuse the generic KPI-card SaaS dashboard.
- **OWN-WORLD:**
  - Deep Forest navigation and primary actions on a Warm Ivory canvas, with Soil Brown text.
  - Harvest Gold only for data emphasis and proposed changes; Terracotta for risk, always with an icon and text.
  - Mukta for Latin and Devanagari.
  - The sprout-and-furrow mark cut out of the supplied logo, with its furrow lines repeated on the login panel.
- **STORY:**
  - The owner understands performance and risk, approves or rejects drafted replans, and coordinates people, machines and stock.
  - The farmer reports by voice in Hindi or English on a basic phone and sees today's work.
- **FIRST VIEWPORT (Owner Overview):** a KPI strip, then *Needs your attention*, the weather outlook and demo incidents, then the shared-machine board.
  - The board shows machine lanes across 5 days with rain bands per zone above them.
  - In proposal mode it draws ghost current slots and gold proposed slots.
- **FIRST VIEWPORT (Farmer):** the *Tap and speak* card, then alerts, then today's task cards.
- **FORM:** brief-pinned. No roll was run, so there is no seed key.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

**Rasters:**
- `public/brand/urvara-mark-light.png` and `urvara-mark-forest.png` are cut out of the user's `Urvara.jpeg`. They were made with an ffmpeg colorkey on #384823, cropped and scaled 2×; the forest variant is a recolour.
- `src/app/icon.jpg` is `Urvara.jpeg` unchanged.
- `docs/architecture.png` is rendered from `scripts/architecture.svg`.
