---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/main.js"]
---

## Scope and mode

The whole learning app: home index plus twelve lesson pages plus one Three.js sandbox.
Visitor mode: **Read** — success is understanding — but the brief's whole point is the
second half of that definition, making the reading experience worth staying in.

## Audience, job, constraints

Four audiences in one artifact (see PRODUCT.md): the author upskilling, friends sent a
link, company new joiners, and portfolio viewers. Audience 2 sets the engagement bar
(nothing compels them to stay); audience 4 sets the craft bar (the artifact is the work
sample). Nothing about the surface may compromise either.

Hard constraints carried from the incumbent build: the semantic colour system (colour
carries meaning), the authored-versus-generated boundary for figures, no backend, and the
accessibility floor already shipped (reduced-motion, figure title/desc, real SVG text).

## Chosen direction

**Illustrated Parts Catalogue** — seed key `367d4bdc`, assigned index 4, chosen by the
user over three challengers and the canon.

The move that makes it not-a-book: **the interface spends no colour.** Paper, ink, and one
chart-magenta accent borrowed from sectional-chart airspace rings — a hue absent from the
semantic palette. All other colour on the page is meaning: lift blue, thrust green, drag
red. Because the chrome is achromatic, the physics is the only thing that glows.

## Approved comps

- `.impeccable/mocks/comp-c-work-bench.png` — **lesson page**, the primary surface.
  Split: text column left, pinned instrument bench right carrying the figure, live
  throttle/elevator controls and a four-force readout.
- `.impeccable/mocks/comp-a-plate-index.png` — **home**, an exploded isometric plate whose
  twelve numbered balloons are the twelve lessons. The drawing is the navigation.

Both sidecars carry `approved: true` and a `doNotLiteralize` list. The single most
important entry: the comp's force numbers are physically wrong and ship live from
`src/sim/flight-model.js` instead.

## Memorable moment

The bench is pinned while the prose scrolls past it, so the same aircraft stays on screen
for the whole lesson and the figure *changes as you read*. In lesson 1 the reader ends by
pushing the throttle and watching the four arrows they just read about resize in real time
until lift beats weight and the aircraft leaves the ground.

## Implementation fidelity — read from the approved comps

**Component grammar.** Everything is a *plate*: a hairline-bordered rectangle with an
optional caption strip along its foot. No cards, no rounded panels, no shadows, no
elevation of any kind. Depth does not exist in this world; hierarchy is line weight,
scale and position only.

**Corner language.** Square. Radius 0 on plates, panels, sliders and tabs. The only curves
are the balloon callouts (perfect circles) and the drawn aircraft itself.

**Line weights.** Three, and only three: hairline 0.5px for zone grid, tick marks and
table rules; 1px for plate borders and leader lines; 1.5px for airframe outline. Force
arrows keep the incumbent 2.5px from the visual grammar.

**Type ramp.** A grotesque with real weight contrast, set in caps for all chrome. Lesson
title ~64px/700 caps; section heading ~22px/700 caps; body ~16px/400 sentence case; chrome
labels ~11px/600 caps with ~0.12em tracking; numeric readouts in a monospace at ~15px with
tabular figures. Body is the only sentence-case text on the page.

**Elevation.** None. Where the comp appears to layer, it is a border and a background
tint, never a shadow.

## Ingredient inventory — medium per region

| Region | Medium | Note |
|---|---|---|
| Zone grid, tick marks, margin rules | CSS/HTML | Generated from a loop, not hand-placed |
| Plate borders, caption strips | CSS | Hairline borders only, radius 0 |
| Home exploded isometric aircraft | **generated raster** | Perspective, shading and dense mechanical detail — illustration, not diagram. No build session can author this as vectors. Regenerate at asset resolution from the comp-A prompt. |
| Home balloon callouts + leader lines | authored SVG overlay | Countable elements, must be interactive and responsive — vector territory. Positioned over the raster. |
| 30 lesson figures | authored SVG | Already built on `app/svg.js`; carry forward unchanged in geometry, restyled to the new token layer |
| Force arrows in the bench | authored SVG | Must animate from live model output |
| Sliders, tabs, buttons | CSS/HTML | Rebuilt in the form's vocabulary — square, hairline, no stock kit |
| Numeric readout | CSS/HTML | Monospace, tabular figures, live from the model |
| 3D sandbox | Three.js (WebGL) | Interactive; raster would flatten what must move and respond |
| Aircraft model for the sandbox | authored geometry | Simple built geometry, not a downloaded GLB — keeps the line-drawing character and the bundle small |
| 12 existing hero images | existing project asset | Kept, but demoted: they no longer lead the page. See risk below. |

**Density commitments.** The home plate carries twelve balloons and a twelve-row index
table. The lesson bench shows four force arrows, two sliders and a four-cell readout at
all times. A build that ships the plate with three balloons or the bench without the
readout is a different design.

## Unresolved

- The twelve existing hero images are in a screen-print palette that does not match this
  world. Kept for now as lesson-card art at small scale; if they fight the world at
  finish, they are regenerated rather than the world being softened.
- Sandbox ships on `four-forces` only this pass, by the user's decision.
