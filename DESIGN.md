---
name: Flight Dynamics
description: An illustrated parts catalogue for a technical subject — achromatic plate, semantic colour reserved for physics.
colors:
  paper: "#f4f4f1"
  paper-sunk: "#eceae5"
  ink: "#14171c"
  ink-2: "#454b55"
  ink-3: "#6b7079"
  rule: "#c9c7c0"
  rule-soft: "#dedcd5"
  accent: "#d6006e"
  accent-ink: "#ffffff"
  f-lift: "#1971c2"
  f-weight: "#14171c"
  f-thrust: "#2f9e44"
  f-drag: "#e03131"
  f-other: "#7048e8"
  m-moment: "#f76707"
  v-flow: "#0c8599"
  a-angle: "#c77800"
  p-low: "#1971c2"
  p-high: "#e03131"
  ref: "#8a8f98"
typography:
  display:
    fontFamily: "Archivo Narrow, Archivo Variable, system-ui, sans-serif"
    fontSize: "clamp(40px, 6.4vw, 78px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "0.01em"
  title:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
    fontVariation: "tabular-nums"
  label:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: 1.62
    letterSpacing: "0.13em"
  setApart:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.55
  secondary:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.62
  caption:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.62
  numeral:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.62
  control:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.62
  tick:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.1em"
  formula:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "25px"
    fontWeight: 400
    letterSpacing: "-0.01em"
# Sub/superscript is a RELATIONSHIP, not a step: 0.72em of whatever it sits in,
# at line-height 0 so a subscript never opens the line box. Left to the UA it
# takes `smaller`, an inherited size belonging to no ramp.
#
# Figure-internal type is NOT on this ramp: `.figure` text is set in SVG user
# units inside a 700-800 wide viewBox, so it scales with the plate rather than
# with the page. Its own scale is chip 13 / chip-small 11.5 / note 12 / caption 15.
rounded:
  none: "0"
  chip: "4px"
spacing:
  unit: "8px"
  rail: "34px"
  gutter: "40px"
  box: "17px 19px"
components:
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  bench:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  step-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    size: "26px"
  step-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "26px"
  launch:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "9px 12px"
  launch-hover:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink}"
  bar-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  check-option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "11px 14px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "13px 16px"
---

# Design System: Flight Dynamics

## Overview

**Creative North Star: "The Illustrated Parts Catalogue"**

The artifact is an aircraft maintenance manual that happens to be interactive. Every page is a numbered plate on index stock: a ruled zone-grid margin runs down all four sides carrying letter and number ticks, a rule-bottomed title bar names the plate and its chapter, and the content sits inside hairline boxes with square corners and no shadow anywhere. Chrome is drawn, not styled — borders, rules and line weights do all the structural work that a conventional interface would give to fills, radii and elevation.

The system's single organising decision is that colour is a scarce, meaningful substance. The interface itself spends none of it: everything the reader clicks, reads or navigates by is paper, ink and grey. That budget is handed entirely to the physics — lift is blue, thrust is green, drag is red, weight is ink — so that a coloured mark anywhere on the page can only ever be a statement about forces. One accent exists, a chart magenta borrowed from the airspace rings on a sectional, and it is deliberately absent from the semantic set so the interface can never be mistaken for data. It appears in slivers: a focus ring, a caret, a slider thumb, a hover state, a formula's term key, one trailing arrow.

Dark mode is not an inversion filter but a negative plate — the same drawing seen on a light table, white line on black. It is written out as a duplicated token block rather than routed through a second indirection layer, because two readable blocks beat one clever one. The raster plate on the index flips with it (`multiply` on the positive plate, inverted and screened on the negative), so the illustration is the same document either way.

**The positive plate is the default, not the system setting.** This is a drawing on index stock; the negative is the alternate reading of it, and a reader whose OS happens to be dark should still meet the document as drawn. The control offers light / dark / auto in those words — `positive` and `negative` are the right names for the system and the wrong ones for a button, since nobody can tell which way round they go without pressing it.

**Key Characteristics:**
- Square corners everywhere (0 radius); the only exception is the label chip inside figures (4px)
- Exactly three line weights: hairline (0.5px), rule (1px), line (1.5px)
- Zero elevation — no `box-shadow` exists anywhere in the build
- Achromatic chrome and a semantic force palette that never mix
- One rationed accent, absent from the semantic set
- All numerals, labels and instrument readings in mono, tabular
- One authored motion moment (leader lines drawing in); everything else is a state change

## Colors

Two palettes that share a page and never share a role: an achromatic chrome of paper, ink and grey with one accent, and a semantic set in which every hue is a fact about physics.

### Primary
- **Chart Magenta** (`accent`): the entire chrome colour budget, borrowed from sectional airspace rings. It appears on focus rings (2px outline, 2px offset), text selection, the caret, the range-slider thumb, link hover in the index table, the footer nav's hover border, the term keys in a formula's notation list, and the single trailing arrow on the launch control. It is used nowhere else and appears nowhere in the semantic set.

### Secondary
The semantic force palette. These are not brand colours; each is a claim about the drawing it appears in, defined in `content/visual-grammar.md` §1 and applied only through a `kind` name (never a colour) in `src/data/svg.js`.
- **Lift Blue** (`f-lift`) / **Thrust Green** (`f-thrust`) / **Drag Red** (`f-drag`) / **Weight Ink** (`f-weight`): the four forces, in figures, in the sandbox arrows, and in the instrument readout values.
- **Other Violet** (`f-other`), **Moment Orange** (`m-moment`), **Flow Teal** (`v-flow`), **Angle Amber** (`a-angle`): the remaining figure vocabulary — resultant/other forces, curved moments, flow fields, angular quantities.
- **Pressure Low / High** (`p-low`, `p-high`): pressure gradients, sharing hues with lift and drag by intent.
- **Reference Grey** (`ref`): construction lines, axes and datum marks, drawn at 0.6 opacity so they sit under the real content.

### Neutral
- **Index Stock** (`paper`): the page ground and the fill inside every plate, balloon ring and figure chip.
- **Sunk Stock** (`paper-sunk`): recessed wells only — the formula's equation block, table row hover, the launch hover state, scrollbar track.
- **Linework Ink** (`ink`): all body type, every airframe outline, and the heavy structural rules (title bar underline, bench border, misconception top rule).
- **Secondary Ink** (`ink-2`): ledes, subtitles, aside and explanatory text, unpressed control labels.
- **Tertiary Ink** (`ink-3`): the small mono labels, zone-grid ticks, plate captions, table item numbers. It is the floor at 4.5:1 on paper and may not go lighter.
- **Hairline Rule** (`rule`) and **Grid Rule** (`rule-soft`): the two border greys — `rule` for a box someone can act on, `rule-soft` for the zone grid, table interiors and figure reference rules.

### Named Rules
**The Two Palettes Rule.** Chrome is achromatic; semantic colour carries meaning and nothing else. A colour on this page is a claim about physics, so chrome never wears one. A drag-red border on a callout reads as a drag annotation — the misconception box is therefore achromatic with a drawn revision triangle, and the active sheet tab is ink, not accent.

**The One Accent Rule.** There is exactly one accent, and it is absent from the semantic set. It is rationed to marks measured in pixels: a focus ring, a caret, a thumb, a hover, one arrow. A filled accent slab anywhere in a first viewport spends the whole colour budget on chrome and is a defect, not a variant.

**The Negative Plate Rule.** Dark mode is the same drawing on a light table, not a generic inversion. Both the `prefers-color-scheme` path and the explicit `data-plate="negative"` attribute carry the full duplicated token block, and any treatment that depends on plate polarity (the raster's blend mode) must handle both paths or the auto-dark reader gets black on black.

## Typography

**Display Font:** Archivo Narrow (with Archivo Variable, system-ui)
**Body Font:** Archivo Variable (with Archivo, system-ui)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace)

All three are self-hosted variable/static webfonts bundled with the build; nothing is loaded from a third party and no system display face is used.

**Character:** An ultra-condensed heavy grotesque for plate lettering over a plain, workmanlike text grotesque, with a technical mono for every measurement. Archivo at normal width is a different character and wraps the headline — the condensed cut is the face, not a nicety.

### Hierarchy
- **Display** (Archivo Narrow 700, `clamp(40px, 6.4vw, 78px)`, 1.04, -0.028em, uppercase, balanced wrap): the plate title. One per page, on the index and at the head of each lesson.
- **Headline** (Archivo 700, 21px, 1.04, uppercase): in-column section heads (`Watch` and its siblings), with 2.2em of air above and 0.7em below.
- **Title** (Archivo 400, 19px, 1.62): the lesson's one-line summary under the display title, held to 40ch in secondary ink.
- **Body** (Archivo 400, 16.5px, 1.62, tabular numerals; 16px below 620px): the reading column, held to a 68ch measure. Set-apart body runs slightly larger — 18px in the concrete anchor, a misconception claim and a check question.
- **Label** (JetBrains Mono 600, 10.5px, 0.13em, uppercase, tertiary or secondary ink): figure references, sheet counters, instrument labels, table headers, the header bar's meta and buttons, the launch control. Sizes step down to 10px for plate caps, table headers, zone ticks and scale end-marks.

### Named Rules
**The One Ramp Rule.** Five roles, and that is the whole system: display, headline, title, body, label. A new surface picks a role; it does not invent a size.

**The Mono Numeral Rule.** Every numeral the reader might compare — instrument readouts, force values, table item numbers, sheet counters, figure numbers, balloon numbers — is JetBrains Mono with tabular figures, so digits stay in column as they change. Prose numerals inherit `font-variant-numeric: tabular-nums` from body for the same reason.

## Layout

The page sits inside a fixed zone-grid frame: a 34px rail on all four sides (20px below 1020px, where the left and right rails are dropped entirely) carrying generated letter and number ticks in 10px mono, each rail closed with a hairline against `rule-soft`. The top and bottom rails carry a paper ground of their own so scrolling content does not slide visibly through the margin.

**The frame's padding is rail + gap, never rail alone.** `--rail-gap` (18px, 8px on a phone) is the air between the index rail and the drawing it indexes; set to the rail width exactly, the type butts against the rail's hairline and the margin has no margin in it. The foot is rail + 52px, because the bottom rail is *fixed and opaque* — a frame that does not reserve its height leaves the last 34px of every document permanently underneath it, which is precisely what made the twelfth lesson unreachable on the index.

Rhythm is an 8px base; the gutter is 40px (28px below 1020px). Vertical spacing is set in ems against the local type size — 2.4em between set-apart blocks, 2em around a figure reference, 2.2em above a section head — so a block's air scales with its own text.

The lesson is a two-column grid split 46/54: reading left, bench right. It is three children over two rows — title block, reading column, bench — so that the phone layout can put the bench *between* the title and the reading rather than above everything, which would leave the first viewport with no lesson name on it. The bench is sticky at `margin-rail + 58px` and capped at `100vh - 2×margin-rail - 66px` with its own scroll; a bench that outgrows the viewport stops being pinned and becomes a very tall column. Body content is capped at a 68ch measure; the index lede's paragraph at 46ch, the lesson subtitle at 40ch.

Two breakpoints. At **1020px** the lesson collapses to one column (title, bench, reading), the side rails disappear, the figure-reference hint is dropped, and the index plate keeps a 900px minimum width and scrolls sideways rather than shrinking into illegibility — it is the only navigation, so it may not become unreadable. At **620px** the index table stops being a table: each row becomes its own two-column grid (38px item number, then title / remarks / status stacked), the header row is dropped, the sandbox readout goes from four columns to two, and the drafting scale's end labels are hidden.

Browser chrome is themed as part of the layout: scrollbars take paper-sunk tracks with `rule` thumbs, selection and caret take the accent, and `:focus-visible` is a 2px accent outline at 2px offset everywhere.

## Elevation & Depth

There is no elevation. The build contains no `box-shadow` at any point, no blur, no translucency layer, and no scale-on-hover. Depth is carried entirely by line weight and tone: a hairline (0.5px) box is quiet furniture, a 1px `rule` box is an object, and a 1px `ink` border is the heaviest thing on the page and is reserved for the bench, the check block and the title bar's underline. Recession is a tonal step to `paper-sunk`, used for the formula's equation well, table row hover and the launch hover — never a shadow.

Motion is nearly as scarce. The one authored moment is the index plate assembling itself: twelve leader lines draw in along their own length (620ms) with rings and names fading behind them (380ms), staggered 46ms apart. Everything else is a state change on the fast duration (160ms) or a 300ms opacity crossfade between figure sheets. `prefers-reduced-motion` flattens all of it to 0.001ms.

### Named Rules
**The Flat Plate Rule.** Nothing floats. A surface is distinguished from its neighbour by border weight or by one tonal step, never by a shadow, and never by lifting on hover.

**The One Animation Rule.** The plate draws itself in once, on load. Every other movement in the build is a state change, not an animation.

## Shapes

Corner radius is zero on every chrome element — plates, buttons, sheet tabs, inputs, the range thumb, the check options, the footer links. The sole exception in the shipped build is the label chip drawn inside figures, which carries a 4px radius so a text chip reads as an applied label rather than a cut-out of the drawing.

Three line weights and only three: **hairline** (0.5px) for grid, interior rules and quiet boxes; **rule** (1px) for a real border, a leader line and an axis; **line** (1.5px) for a drawn object's outline. Figures add exactly one non-token weight, the 2.5px force arrow, which is the grammar's own emphasis mark for a force and is heavier than any structural line on purpose.

Recurring silhouettes: the ruled rectangle (every container), the balloon (a 21px paper-filled ring on a leader line, filling to solid ink when complete), the quartered CG mark, the drawn revision triangle, and the drafting scale — a 2px track with repeating 1px tick marks and mono end labels, so a reading can be taken off it the way one would off a real instrument.

## Components

### Header Bar
Sticky beneath the top rail, paper ground, closed with a 1px ink rule. Plate title left in 12.5px Archivo 700 uppercase at 0.14em; mono meta and controls right in secondary ink. Bar buttons are hairline-bordered, square, and resolve to an ink border and ink text on hover.

### Plates / Containers
- **Corner Style:** square (0).
- **Border:** 1px `rule`. A plate that is an instrument (the bench, the check) upgrades to 1px `ink`.
- **Background:** paper. Recessed interiors step to paper-sunk.
- **Caption strip (`plate__cap`):** a hairline-topped 7px/12px band of 10px mono in tertiary ink.
- **Shadow Strategy:** none, per Elevation & Depth.
- **Internal Padding:** 17px/19px for a text box, 8-14px for an instrument row.

### Index Table (the parts table)
Collapsed borders, mono 10px uppercase headers over a 1px ink rule, rows divided by hairline `rule-soft`, row hover filling to paper-sunk. Item numbers are zero-padded mono in tertiary ink at a fixed 62px column; the remarks column is secondary ink at 14px; the status column is right-aligned mono and reads `complete` in thrust green — the one place a semantic colour is used for state, and it is a completion fact, not decoration. Lesson links are body weight 600, undecorated, going accent on hover. Below 620px the table becomes stacked per-row grids.

### Balloon Callout (signature)
A numbered ring over the exploded plate: 21px circle, paper fill, 1px ink stroke, mono 11px number centred, and a short uppercase plate name set outboard of the ring on the side away from its own leader (clamped by the frame edge when "away" would point off-canvas). The leader starts at the ring's edge, not its centre. Hover and focus turn the leader accent at 1.5px, the ring and number accent, and the name to full ink; a completed lesson fills the ring solid ink with a paper numeral. Keyboard-operable (`tabindex`, Enter/Space) with the index table as the accessible path.

### The Bench (signature)
The pinned right column: a 1px ink plate holding one figure at a time, a hairline-topped sheet strip, and — when a sandbox exists — an instrument panel and HUD stacked under it. The figure swaps as the reading passes each figure reference (IntersectionObserver at the upper third), so the reader works at a bench rather than scrolling a page.

- **Step strip:** the label names the **plate**, then the step — `Fig. 2–2 · Step 3 of 3`. Seven of the twelve lessons give every figure the same step count, so a strip reading only `Step 3 of 3` looked frozen while scrolling swapped the drawing beneath it. The plate number is also what ties the bench back to the `Fig. 2–2` reference in the reading.

  **"Step", never "sheet".** In a real parts catalogue *Sheet 2 of 4* is a different page carrying different content. These are one drawing at successive stages of its own assembly, each keeping everything before it and adding one thing. Called sheets, readers concluded they were missing three other figures.

- **Below 1020px there is no bench.** A single plate above the reading has scrolled 278px out of sight by the time you reach the paragraph that refers to it, so the whole progressive build happened where nobody could see it. Each figure reference instead opens a `fig-section` running to the next figure, carrying its own plate, which sticks under the header for exactly as long as its own prose is being read. The screen gives up space only while a figure is relevant. The section wrapper is load-bearing: `position: sticky` is bounded by its parent, and a plate whose parent is only as tall as itself reads as sticky and behaves as static.

- **A figure opens COMPLETE, and stepping is the reader's, by tapping.** The strip carries the words `step through the build` because a control nobody knows is a control does not exist. Driving the build off scroll was tried twice and abandoned: it rewound the drawing mid-chapter, and — fatally — a chapter is about 330 words, so a figure's section passes in two flicks and four steps blur past unread. Reading speed is not a timeline. Opening complete also keeps the drawing honest against the prose immediately after a reference, which describes the finished figure.
- **Step tabs:** 26×26 square, hairline `rule`, mono 11px in secondary ink. They read as a build, not as pagination: passed steps take a `paper-sunk` ground with an `ink-3` border, the current step fills solid **ink** with paper text, and steps ahead stay hollow (never accent — a filled magenta block in the lesson's first viewport is the chrome-spends-the-budget mistake).
- **Sheet order:** a figure opens on its COMPLETE sheet, labelled `Sheet n of n`. The tabs step *backwards* through the build. A manual shows the assembled drawing; disassembly is what the tabs are for.

### Figure Reference
Not a figure — the manual's way of pointing at one. A mono `Fig. n–m` label, a hairline rule filling the remaining width, and a `shown on the bench` hint in tertiary mono closed by the drawn arrow mark, dropped entirely below 1020px. Bottom hairline; no box.

### Arrow Mark (`.mk`)

The interface arrow is **drawn, never typed**. An 18×10 SVG carrying a 1.1px shaft and a solid triangular head in `currentColor` — the same flat tail and solid head as the force arrows inside figures, so an arrow is one object in this world rather than two at two different weights. It is used in the launch control (in accent), the figure-reference hint, the footer navigation and the sandbox exit, mirrored for the leftward case. A literal `→` or `←` glyph anywhere in this build is a defect: it is a font's arrow, not the plate's.

### Set-Apart Text
- **Concrete anchor (`.concrete`):** a hairline ruled box, 17px/19px, 18px/1.55 text. This is the world's device for set-apart text.
- **Aside:** secondary ink at 15px behind an 18px hairline left rule — a hairline in `rule`, never a thick coloured bar.
- **Misconception (`.myth`):** a hairline box with a 1px **ink** top rule (which is what distinguishes it from the check block). The claim line is 18px/600 in quotes, flagged by a 14×12 drawn revision triangle filled in ink; the correction follows in secondary ink. Achromatic, and with no kicker label of any kind.

### Formula
A plate: a paper-sunk equation well at 26px/18px, centred, 25px mono; then a two-column definition list of terms, keys right-aligned in mono accent, values in secondary ink at 14px. The accent on the term keys is one of the accent's few standing uses.

### Check (the Checkride)
A 1px ink plate built as an **answer key**, not as a stack of buttons. It is headed by a plate caption strip — `Checkride` left, `Ch 04 · 3 options` right — which is *not* a kicker: a kicker labels a block with what it obviously is, whereas this carries an identifier and a reference number, the way a manual heads an inspection block. That distinction is the whole licence; "Common misconception" over a misconception is still banned. The question is the heading (18px/600) with no label above it, set on a `paper-sunk` ground and closed with a full 1px ink rule — so the ask is a band, not a paragraph floating over three empty rectangles. Each option is a contiguous ruled row divided by hairlines, with a 46px keyed cell down the left carrying a mono `A` / `B` / `C` in tertiary ink — the same device as the index table's item column. Hover fills the row to `paper-sunk` and brings the key to full ink.

Once answered, every option disables and the answered key cells **fill solid** with their semantic colour, the tick or cross drawn on top in `paper`. The correct option's text goes to 600; the chosen wrong one goes tertiary and struck through; the `Why:` reveals beneath a full ink rule. Filling and drawing the mark in paper rather than stroking the mark in the force colour is not a style choice: stroked on paper the light-mode tick measured **2.87**, under the 3:1 a graphic needs, and inverted it clears at 3.62. This is the one place chrome borrows semantic colour, and it borrows it because right/wrong is being scored on the same axis the figures score forces on.

### Instrument Panel (signature)
A 1px ink-topped panel. Each control is a three-column grid (88px mono uppercase label / drafting scale / 62px right-aligned mono output, narrowing to 72/52 below 620px). The scale wraps a native range input with mono end labels and a repeating tick track; the thumb is a 12×20 square accent block with no radius. The readout is a four-cell hairline grid (two cells below 620px), each cell a 10px mono uppercase caption over a 15px mono value coloured by its force. The HUD beneath is a hairline-topped mono strip in tertiary ink with ink values.

### Launch Control
The primary action of a sandbox lesson lives in the plate's own caption strip as a hairline-topped, full-width, transparent mono control — not a filled slab. Label and trailing arrow travel together at the left so they read as one control. Hover fills paper-sunk; disabled drops to tertiary ink.

### Footer Navigation
Two hairline-bordered mono links, previous left and next right, 13px/16px padding, resolving to an accent border and accent text on hover.

### Figures (the drawing grammar)
Every figure is authored SVG built from `src/data/svg.js` primitives, with `<title>` and `<desc>`. A primitive is given a semantic `kind` (lift, weight, thrust, drag, other, moment, flow, angle, ref, ink, low, high) and never a colour; the class it emits resolves through the token layer, which is what makes the Two Palettes Rule hold by construction rather than by discipline. Force arrows are 2.5px with a flat tail and a filled head, trimmed at the origin so they never cover the CG mark. A resolved component is thin and dashed so it is never counted as an extra force. Moments are always curved. Labels live in a chip on the figure, never in a legend. Progressive states share one viewBox and one set of positions; later states only add.

### The Receding Airframe

**The forces are the subject; the aeroplane is what they act on, and it is drawn as the quieter mark.** Every airframe — the `airframe` group in figures, the built geometry in the sandbox — sits at `ink-2` for its outline and `ink-3` for its detail layer, so the four force arrows are the brightest thing on the plate. The CG mark stays at full ink: it is a datum, not part of the body.

This is a correctness rule, not a preference. On the negative plate `--f-weight` resolves to `--ink`, so an airframe drawn at full ink and the weight arrow are the *same colour exactly* (contrast 1.00) and the one force the reader is looking for disappears into the fuselage. Restoring the airframe to full ink re-breaks it.

### After the Chapter
`.after` is a plain block below the two-column grid holding the apply surface and then the footer nav, in that order: read the chapter, fly it, then leave. Both take the full width honestly, because out here nothing sticky can reach them. The footer used to sit inside the reading column *above* the sandbox, which put "next chapter" before the thing the chapter was building toward.

### The 3D Sandbox
The same world in three dimensions. Geometry is built, not downloaded, so it keeps the line-drawing character: solid meshes at `paper-sunk` with `ink-2` edge lines. Every colour is read from the same custom properties via `getComputedStyle`, so the scene, its fog, its ground and its four arrows are the same palette the figures use. Arrows are scaled against weight so "longer than weight" is literally what the reader sees; sprite labels are mono. The HUD's exit control returns the bench to its plate.

**One scene, configured per chapter.** `src/sim/tasks.js` is pure data — no Three, no DOM — declaring for each chapter its brief, which controls to fit, which of the four arrows to draw, its four instrument rows, an optional `track` that watches for the thing being taught, and a latching goal. It also declares **`ac`** — which aeroplane the chapter is flown in, defaulting to the Cessna — and optionally **`bandit`**, a second aeroplane integrated by the same `step()` under a stated control law, for the chapters whose subject is the geometry between two of them. Fourteen of the twenty chapters have an entry. Drawing four arrows on a plate about drag would be three distractions, so lesson 4 draws two; a rudder pedal on that plate would be a thing to fiddle with rather than learn from, so it gets throttle and elevator only.

**A chapter appears there only if the model can demonstrate its idea honestly.** `MISSING` names the chapters that do not get one and says why, because the rule it encodes is the one this world may never break: miming a Dutch roll the model is not computing would be worse than having no sandbox at all.

It has one entry, and it is worth reading as the worked example. Chapter 17 is about specific excess power, and the model computes it correctly — the chapter's contour plate is drawn from it. What the model cannot host is the *exercise*. "Come out of a turn faster than you went in" passes at any bank at all, because this aeroplane has thrust to spare almost everywhere; pinning the height to force the trade only sends it past Mach 1.8, and there is no compressibility here, so everything above about Mach 0.9 is a number rather than a fact. The honest version, holding the sustained turn, fails differently: Ps = 0 is an *unstable* equilibrium going up — 262 kt at 4.6 g, but +34 m/s at 292 kt — so any excess accelerates you away from the condition you are trying to hold. Both were built and flown before being rejected, which is how those numbers are known.

The **brief** sits above the controls as the manual's task line, and the **goal** latches — it records a thing you did, so stalling and recovering still counts as having found the stall.

Three things in the scene are load-bearing and were each wrong once:
- **The body never takes the sky colour.** Filled with `--paper` it measured 1.00 against the background — the aircraft read as a hole punched in the picture rather than a solid that occludes the ground behind it. It fills to `paper-sunk`.
- **The earth is `ink` at 0.16 and is exempt from fog.** At 0.05 under a fog that consumed it before its far edge, ground-to-sky contrast was 1.11: there was no ground and no horizon, only haze. Fog still applies to the runway stripes, where fading with distance is the point.
- **The horizon is drawn in `ink-3`, not `rule`.** `rule` is the obvious pick and the wrong one — against a ground of ink at 0.16 it lands within 1.06 and vanishes.

### The Card Catalogue
Reachable from the foot of the index, not from inside a chapter — spaced repetition you have to go hunting for does not get used. Cards are **derived** in `src/data/deck.js` from the misconceptions, formulas and stage-check questions the lessons already carry; there is no card text in the codebase. A hand-written deck drifts, and a drifted card teaches the old thing long after the lesson was corrected. Study grades itself into Leitner boxes (1/2/4/8/16 sessions); examination scores the same material with no self-grading. A card is a plate, with the same caption strip and rules as every other plate.

### The Checkride
The end of the course, flown rather than answered. Seven items, each asking the learner to **produce** a claim the course made; the flight model judges it. Rings and checkpoints were rejected on purpose: they measure how well somebody drags a slider, so a learner who understood everything could fail on the interface and one who understood nothing could stumble through. Item 2 — *stall it above 60 knots* — cannot be reached at all by anyone who still believes a stall is caused by flying too slowly.

Each item resets the aircraft to its own start, because failing item six must not cost items one to five. `scripts/check-checkride.mjs` flies every item on each `npm run check`; an unreachable item fails the build.

## Do's and Don'ts

### Do:
- **Do** keep chrome achromatic. Paper, ink, grey and one rationed accent is the whole interface palette.
- **Do** reserve the semantic palette for statements about physics, and address it by `kind`, never by colour value.
- **Do** draw structure with the three line weights — hairline 0.5px, rule 1px, line 1.5px — and upgrade to a 1px ink border when a container is an instrument.
- **Do** use a thin ruled box for set-apart text (the concrete anchor and misconception boxes are both hairline boxes).
- **Do** let a progressive figure assemble on the approach to its reference, and let the tabs step back through the build afterwards.
- **Do** set every numeral, label and instrument reading in JetBrains Mono with tabular figures.
- **Do** size a force arrow by its magnitude. In the sandbox, arrow length *is* the measurement; only the label may be clamped to stay in frame.
- **Do** carry both dark-mode paths (`prefers-color-scheme` and `data-plate="negative"`) when a treatment depends on plate polarity.
- **Do** hold body text to the 68ch measure and keep the index plate at 900px minimum on small screens, scrolling sideways rather than shrinking.

### Don't:
- **Don't** put a semantic colour on chrome. A drag-red callout border reads as a drag annotation; a misconception box is achromatic.
- **Don't** fill the active sheet tab — or any first-viewport block — with the accent. That control is solid ink.
- **Don't** add a kicker or eyebrow label above a block. "Common misconception", "Check yourself" and their kind do not exist here; the drawn revision triangle and the question itself carry the flag.
- **Don't** build a coloured left-bar callout. Set-apart text gets a hairline ruled box; an aside gets a hairline left rule in `rule` grey.
- **Don't** introduce a corner radius. Every chrome element is square.
- **Don't** add a shadow, a blur, a translucency layer or a lift-on-hover. There is no elevation in this system.
- **Don't** add a second accent, or reuse the accent inside the semantic set — its absence there is what keeps interface from reading as data.
- **Don't** add a fourth line weight or a sixth type role.
- **Don't** put two figure references back to back — a section with no prose in it is a figure with nothing said about it.
- **Don't** put anything in a third grid row under the sticky bench. A sticky element overhangs the row after it rather than stopping at it — 87px on a 2000×700 viewport — which drew the launch control straight across the figure's caption and read as a line struck through the text. Raising its `z-index` only made the collision opaque. Everything after the chapter belongs **below the grid**, in `.after`, where the grid has ended and there is nothing to collide with.
- **Don't** put the launch control or the sandbox on the bench. `mountFigure` replaces the bench's contents, so a figure swap destroys anything else living there; and below 1020px the bench is `display: none`, which made the button and the whole sandbox invisible on every phone. The apply surface spans both columns at the foot of the chapter, where flying the thing belongs.
- **Don't** draw an airframe at full ink, in a figure or in the sandbox. It out-shouts the forces, and on the negative plate it is the same value as the weight arrow.
- **Don't** fill a 3D body with the scene background colour, and don't let fog eat the ground. Both were shipped once and both erased the horizon.
- **Don't** link a video off-site. Clips play in the in-app plate; the end of one offers the lesson and the next clip, never YouTube's grid.
- **Don't** leave a reader inside a chapter with no way out. The wordmark links home but reads as a title, so the bar carries an explicit `Index` control and the footer's middle slot carries `All N chapters` — counted from `LESSONS`, never typed, because it was `All 12 chapters` right up until a thirteenth shipped.
- **Don't** give a chapter a sandbox the model cannot honestly compute. Add the physics, or leave the chapter without one and record why in `tasks.js`.
- **Don't** author flashcard text. Cards derive from the lessons; anything hand-written beside them drifts out of step and then teaches the old answer.
- **Don't** turn the checkride into a skills course. Every item must be a claim from a chapter, judged by the model, and passable by understanding rather than by dexterity.
- **Don't** animate anything new. The plate's leader lines draw in once; everything else is a state change.
- **Don't** put figure labels in a legend, or pass a colour into a figure primitive.
