---
name: Urvara AI
description: Every Farm. Every Resource. In Sync. Voice-first multi-farm coordination with explainable replanning.
colors:
  deep-forest: "#234735"
  deep-forest-hover: "#1b3a2b"
  deep-forest-tint: "#e2eae3"
  sage: "#8faf8a"
  sage-ink: "#44633e"
  sage-tint: "#e5ece0"
  harvest-gold: "#d5a84b"
  harvest-gold-ink: "#74560f"
  harvest-gold-tint: "#f4e8c9"
  terracotta: "#b96f4e"
  terracotta-ink: "#8c472b"
  terracotta-tint: "#f4e1d7"
  warm-ivory: "#f6f3e9"
  soil-brown: "#66513e"
  surface: "#fdfbf5"
  sunken: "#eee9da"
  line: "#ddd4c1"
  line-strong: "#c9bda5"
  ink-strong: "#3a2e22"
  ink-muted: "#7a6754"
typography:
  display:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  body-farmer:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  caption:
    fontFamily: "Mukta, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  chip: "4px"
  control: "6px"
  panel: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.warm-ivory}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.deep-forest-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-ghost:
    textColor: "{colors.deep-forest}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.terracotta-ink}"
    textColor: "{colors.warm-ivory}"
    rounded: "{rounded.control}"
    height: "40px"
  button-gold:
    backgroundColor: "{colors.harvest-gold}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    height: "40px"
  button-farmer:
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  chip-forest:
    backgroundColor: "{colors.deep-forest-tint}"
    textColor: "{colors.deep-forest}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  chip-sage:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.sage-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  chip-gold:
    backgroundColor: "{colors.harvest-gold-tint}"
    textColor: "{colors.harvest-gold-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  chip-terracotta:
    backgroundColor: "{colors.terracotta-tint}"
    textColor: "{colors.terracotta-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  chip-neutral:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.soil-brown}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  owner-sidebar:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.warm-ivory}"
    width: "256px"
  owner-nav-item-active:
    backgroundColor: "{colors.warm-ivory}"
    textColor: "{colors.deep-forest}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  farmer-mic-button:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.warm-ivory}"
    rounded: "{rounded.full}"
    size: "56px"
  board-slot-proposed:
    backgroundColor: "{colors.harvest-gold-tint}"
    textColor: "{colors.ink-strong}"
    rounded: "5px"
    padding: "0 6px"
---

# Design System: Urvara AI

## Overview

**Creative North Star: "The Field Ledger"**

Urvara is a working ledger for land that is shared between farms: a warm ivory page, soil-brown ink, and a deep forest frame that holds the navigation. Its job is to make coordination legible: what changed, why, and what needs the owner's yes. Colour is spent on state, not decoration; a screen at rest is mostly ivory, brown ink and thin tan lines, and the brand hues appear when something is scheduled, in progress, proposed or at risk.

Two portals share one control vocabulary. The Owner Portal is a dense desktop tool with a forest sidebar and a 1360px working column. The Farmer Portal is a single 30rem phone column with larger type (17px body), 44px+ targets, a bottom nav and a raised forest microphone at its centre, because voice is the primary input. Mukta sets Latin and Devanagari on one design, so Hindi is never a fallback face.

Brand expression is concentrated in a few owned places: the sprout-and-furrow mark cut from the team's logo, the forest brand panel on sign-in with its faint ivory furrow lines, and the shared-machine schedule board, where rain bands sit above machine lanes and proposals draw ghost and gold slots.

**Key Characteristics:**
- Six fixed brand hues, each with an -ink shade for small text and a -tint for fills.
- Flat, ivory-on-ivory surfaces separated by 1px tan lines and a barely-there panel shadow.
- One sans family (Mukta, 400 to 700) carrying both scripts; weight 600 does the hierarchy work.
- Status is always text plus icon plus tone, never colour alone.
- Sources are always labelled: a persistent Demo/Live data badge and per-reading provenance chips.

## Colors

An earthy, brief-fixed palette on a warm ivory ground, where brand hues signal state and the -ink/-tint pairs keep every hue legible.

### Primary
- **Deep Forest** (#234735): the structural brand colour. Owner sidebar ground, the sign-in brand panel, primary buttons, the farmer mic, focus outline, caret, active nav text on ivory. Hover darkens to Forest Hover (#1b3a2b); Forest Tint (#e2eae3) fills "scheduled" chips and board slots.

### Secondary
- **Sage** (#8faf8a): the living-crop accent. Used at full strength only on dark grounds (sidebar icons, group labels, the "AI" in the wordmark). On light grounds text shifts to Sage Ink (#44633e) and fills to Sage Tint (#e5ece0): "done", "live", low-risk.

### Tertiary
- **Harvest Gold** (#d5a84b): attention without alarm. In-progress work, demo data, high priority, count badges, the board's "now" line and every proposed slot. Text uses Gold Ink (#74560f); fills use Gold Tint (#f4e8c9), which is also the text-selection colour.
- **Terracotta** (#b96f4e): risk and fault. Text, borders and the danger button use Terracotta Ink (#8c472b); fills use Terracotta Tint (#f4e1d7). The raw hue appears only in translucent forms (record pulse, out-of-service hatching).

### Neutral
- **Warm Ivory** (#f6f3e9): the page canvas and text on forest.
- **Surface** (#fdfbf5): panels, inputs, secondary buttons, the farmer bottom bar; a half-step lighter than the canvas.
- **Sunken** (#eee9da): segmented-control wells, disabled fields, neutral chips, skeletons, icon-button hover.
- **Line** (#ddd4c1) and **Line Strong** (#c9bda5): panel borders and dividers; control borders and dashed empty-state outlines.
- **Soil Brown** (#66513e): default body ink. **Ink Strong** (#3a2e22) for headings and values; **Ink Muted** (#7a6754) for metadata and timestamps.

### Named Rules
**The Ink-and-Tint Rule.** Small text in a brand hue always uses that hue's -ink shade, and coloured fills always use its -tint. Raw Sage and Gold text appear only on Deep Forest. If a new state needs colour, it takes a tint fill plus ink text from one of the four families.

**The State-Spends-Colour Rule.** Brand hues mark state (scheduled, in progress, done, proposed, at risk, demo). A screen with nothing happening is ivory, brown and line.

**The Gold Means Proposed Rule.** Gold is the colour of "pending your decision": proposed board slots, approval counts, in-progress work, demo data. It is never used as a decorative highlight.

## Typography

**Display Font:** Mukta (with ui-sans-serif, system-ui)
**Body Font:** Mukta (same family)

**Character:** One humanist sans with matched Devanagari, so English and Hindi sit on the same baseline and weight; Punjabi uses Mukta Mahee, the same design drawn for Gurmukhi. Hierarchy comes from size steps and weight 600; there is no second face.

### Hierarchy
- **Display** (600, 2.5rem; 1.75rem below 640px, 1.1, -0.02em): the tagline on the sign-in brand panel only.
- **Headline** (600, 1.625rem, 1.2, -0.01em): owner page titles. Farmer screens use 1.5rem for their single greeting heading.
- **Title** (600, 1rem, 1.2): panel headers; machine names on the board.
- **Body** (400, 0.9375rem / 15px, 1.5): Owner Portal base. Page descriptions cap at max-w-3xl.
- **Body Farmer** (400, 1.0625rem / 17px, 1.625): Farmer Portal base, set on the shell so every child inherits it.
- **Label** (600, 0.875rem): form labels, segmented options, sidebar group names, secondary descriptions at 400.
- **Caption** (600, 0.75rem): chips, provenance, board slots, rain cells, legends.

### Named Rules
**The Tabular Numbers Rule.** Every number that can change (clock, counts, KPIs, rain %, farm codes) uses tabular figures.

**The One Family Rule.** Mukta carries both scripts at weights 400/500/600/700. Never add a display face that lacks Devanagari.

## Layout

**Owner:** a fixed 256px forest sidebar from `lg` (1024px) up; below that, a 56px sticky top bar with a menu button opens the sidebar as a 288px drawer (max 85vw) over a 45% Ink Strong scrim. Content sits in a centred column, max 1360px, 16px gutters (24px from `md`), 24px top padding. The top bar is canvas at 95% with a light backdrop blur and carries the demo clock, data-source badge and alert bell.

**Farmer:** a single centred column, max 30rem (480px), 16px gutters, 64px sticky header, 128px bottom padding to clear a fixed four-slot bottom nav that respects the safe-area inset. No multi-column layouts.

**Rhythm:** a 4px base with 8, 12, 16 and 24px doing most of the work: 8px gaps in toolbars and chip rows, 16px panel padding, 24px between farmer sections, 20px below page headers.

**Sign-in:** a 5:6 split from `lg`, forest brand panel left, account chooser right; stacks on mobile with the brand panel shortened.

## Elevation & Depth

Flat by default with a hybrid finish: depth comes mainly from tonal steps (sunken < canvas < surface) and 1px lines, with one ambient shadow so panels lift a hair off the canvas. A second, larger shadow is reserved for things that genuinely float.

### Shadow Vocabulary
- **Panel** (`0 1px 2px rgba(58,46,34,0.06), 0 2px 8px rgba(58,46,34,0.04)`): every panel, account cards, and the selected segment in a segmented control.
- **Raised** (`0 6px 24px rgba(35,71,53,0.14), 0 2px 6px rgba(58,46,34,0.08)`): the mobile nav drawer, the farmer mic button and speak card, and board slots on hover.

### Named Rules
**The Two Shadows Rule.** Only Panel and Raised exist. Shadows are soft, warm-brown or forest-tinted, and never offset hard.

## Shapes

Gently squared. Controls (buttons, inputs, nav items) round to 6px, panels and cards to 10px, chips and badges to 4px, segmented options to 4px inside a 6px well, board slots to 5px. Full circles are reserved for the microphone and the alert count. Borders are 1px tan; dashed borders mean "not real yet": empty states, the current slot in a proposal, an unresolved booking. Out-of-service machine lanes carry a fine 135° terracotta hatch. The brand mark (a sprout over curved furrows) and the sign-in furrow strokes are the only curved, organic geometry.

## Components

### Buttons
Solid, compact and plain-spoken; colour indicates consequence.
- **Shape:** 6px corners; label weight 600; optional 16px leading icon (24px at `xl`).
- **Sizes:** sm 32px, md 40px (default, owner), lg 48px (farmer task actions, full width), xl 56px+ (farmer primary moments).
- **Primary:** Deep Forest on ivory text, hover Forest Hover. **Secondary:** surface fill, Line Strong border, Ink Strong text; hover shifts border toward forest and fills with a light forest tint. **Ghost:** forest text, forest-tint hover. **Danger:** Terracotta Ink fill. **Gold:** Harvest Gold fill with Ink Strong text, used for approving proposals.
- **States:** 150ms colour transition; disabled drops to 45% fill and a not-allowed cursor; loading swaps the icon for a spinner and sets aria-busy. Focus is the global 2px forest outline at 2px offset.

### Chips
- **Style:** tint fill, ink text, 12px weight 600, 4px corners, 2px by 6px padding, 14px icon. Five tones: forest, sage, gold, terracotta, neutral.
- **State mapping:** scheduled forest, in progress gold, done sage, blocked or overdue terracotta, suggested and cancelled neutral; risk high/medium/low map to terracotta/gold/sage. Every chip carries a word.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Surface on the ivory canvas.
- **Shadow Strategy:** Panel shadow (see Elevation).
- **Border:** 1px Line.
- **Internal Padding:** 16px; optional header row (title 16px/600, muted description, right-aligned actions) separated by a Line divider at 12px by 16px.
- **Empty state:** dashed Line Strong border, canvas fill, centred sage-ink icon, title and one sentence, optional action.

### Inputs / Fields
- **Style:** 40px high, surface fill, 1px Line Strong border, 6px corners, 12px side padding, muted placeholder.
- **Focus:** border turns Deep Forest plus the forest outline; hover nudges the border toward forest.
- **Error / Disabled:** invalid fields take a Terracotta Ink border with a terracotta-ink message below; disabled fields go Sunken with muted text.
- **Segmented control:** Sunken well with Line Strong border; the selected option becomes a surface pill with forest text and the panel shadow. The farmer language toggle (EN / हिं) is the same control at 40px by 44px.

### Navigation
- **Owner sidebar:** Deep Forest ground, mark plus ivory wordmark, two named groups ("Understand", "Coordinate") with small sage group labels. Items are 15px ivory at 85% with sage icons; hover is a faint white wash; the active item inverts to an ivory pill with forest text and icon. Counts are gold badges with Ink Strong numbers (gold-tint when the row is active). User and sign-out sit under a hairline footer.
- **Farmer bottom nav:** surface bar at 97% with blur, four equal slots of at least 64px, 24px icons over 14px labels; active is forest and semibold. The centre Report slot is a 56px forest circle with a 28px mic, Raised shadow and a 4px canvas ring, lifted 20px above the bar.

### Data Source Badge
A persistent 12px bold badge with 0.04em tracking reading "DEMO DATA" (gold tint, gold ink, flask icon) or "LIVE DATA" (sage tint, sage ink, database icon); solid gold or sage on dark grounds; icon-only with screen-reader text in the farmer header. Readings pair a provenance chip (Live, Manual entry, Simulated, Demo forecast) with a relative timestamp and a terracotta "Stale" chip when old.

### Schedule Board (signature)
The shared-machine board is the product's thesis drawn as one view: five days across, a 152px label column, minimum 1040px wide with horizontal scroll.
- **Rain bands:** one row per weather zone above the machines, split into morning and afternoon cells. Cells tint by rain chance: 60%+ terracotta tint with terracotta ink, 40%+ gold tint, 15%+ sage tint at 70%, otherwise sage tint at 30% with muted text.
- **Machine lanes:** 56px rows divided by day lines; a 2px gold vertical marks "now" on the demo clock; out-of-service lanes get the terracotta hatch and a wrench label.
- **Slots:** 5px-cornered blocks with an icon plus a whole short verb (Water, Spray, Feed, Harvest, Scout, Sow, Prune) and a farm code; tone follows task state; flagged slots switch to a warning icon in terracotta. Hover lifts a slot with the Raised shadow.
- **Proposal mode:** the current slot becomes a dashed, transparent ghost in muted ink; the proposed slot is gold tint with a Gold Ink border and a 2px gold ring; a booking with nowhere to go is dashed terracotta. A legend under the board names every state.

## Do's and Don'ts

### Do:
- **Do** take state colour from the four tint/ink pairs (forest, sage, gold, terracotta) and pair it with a word and an icon.
- **Do** keep the Owner body at 15px and the Farmer body at 17px with targets of at least 44px.
- **Do** use Mukta for every string, Hindi included, with weight 600 for emphasis.
- **Do** show the data source and reading age wherever data appears; demo data is always labelled.
- **Do** draw a change as before (dashed ghost) and after (gold) side by side, as the schedule board does.
- **Do** use tokens instead of raw hex in charts and SVG, so the palette has one source of truth.

### Don't:
- **Don't** set small text in raw Sage (#8faf8a) or Harvest Gold (#d5a84b) on ivory; use the -ink shade.
- **Don't** add new brand hues or recolour the six source colours; they are fixed by the brief.
- **Don't** add shadows beyond Panel and Raised, or use hard offset shadows.
- **Don't** use colour as the only signal for status, risk or proposals.
- **Don't** truncate task words on the board; use the short verb list.
- **Don't** introduce a second typeface or a display face without Devanagari.
