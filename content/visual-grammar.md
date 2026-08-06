# Visual Grammar — Flight Dynamics

The contract every figure obeys. Written before figure #1 so consistency is structural, not a per-diagram judgment call. Anything drawn, generated, or coded for this project follows this document.

---

## 1. The semantic palette

Colour carries meaning here. It is never decorative. A reader who learns these five associations on lesson 1 can read any figure in the project without a legend.

| Meaning | Colour | Token | Rendering |
|---|---|---|---|
| **Thrust** | green | `--f-thrust: #2F9E44` | solid arrow, forward |
| **Drag** | red | `--f-drag: #E03131` | solid arrow, aft |
| **Lift** | blue | `--f-lift: #1971C2` | solid arrow, perpendicular to relative wind |
| **Weight** | near-black / near-white | `--f-weight: #212529` | solid arrow, always to earth-down |
| **Any other force** | violet | `--f-other: #7048E8` | solid arrow (normal force, side force, tension) |
| **Moment / torque** | orange | `--m-moment: #F76707` | *curved* arrow, always |
| **Velocity / relative wind** | cyan | `--v-flow: #0C8599` | dashed streamline, arrowhead mid-line not at tip |
| **Angles** | amber | `--a-angle: #F59F00` | thin arc, 1px, symbol inside the arc |
| **Reference frames / axes** | grey | `--ref: #868E96` | 1px dashed, 40% opacity, always letter-labelled |
| **Pressure field** | diverging blue → red | `--p-low` → `--p-high` | fill only, never outline |

Green-go / red-stop for thrust and drag is intentional: it is guessable before it is taught.

**The axes collision, resolved.** 3D convention is X-red / Y-green / Z-blue, which fights the force palette. Rule: **axes are always background** — 1px, dashed, 40% opacity, letter-labelled at the tip. Forces are always foreground — 2–3px, solid, full opacity, with a label chip. The two can never be confused because they differ in weight and opacity, not just hue. In 3D scenes the RGB=XYZ convention is kept (it's near-universal); in 2D diagrams axes are plain grey.

**Colourblind check:** run every finished figure through a deuteranopia simulator. Green/red is the risky pair — thrust and drag are always on opposite ends of the same horizontal line, so position disambiguates them even when hue does not. Never rely on hue alone to distinguish two things that sit in the same place.

> **Note:** this is the palette for **authored figures**. Generated imagery uses a separate, narrower palette (§6) because it is atmosphere, not information — it must never look like it is carrying semantic colour.

---

## 2. Geometry

| Element | Spec |
|---|---|
| Force arrow | 2.5px stroke, 9px arrowhead, flat tail. Length ∝ magnitude, consistently scaled *within a figure* |
| Moment arrow | curved, 2.5px, single arrowhead, arc ≥ 60° so it reads as rotational at a glance |
| Streamline | 1.5px dashed (6,4), arrowhead at 60% along the line, never at the end |
| Angle arc | 1px, radius = 28px at 1× |
| Axis | 1px dashed (3,3), 40% opacity |
| Aircraft silhouette | 1.5px outline, no fill in technical figures; filled only in hero art |
| Corner radius | 4px on chips, 8px on panels |
| Grid | 8px base unit; all spacing is a multiple |

---

## 3. Labels

- Labels sit in a **rounded chip** — 4px radius, page-background fill, 4px padding. Never bare text over geometry.
- The chip has a 1px leader line to what it labels when the connection isn't touching.
- Symbol first, name second, units third: `L — lift (N)`.
- Labels are **on the figure**, never in a separate legend. Split attention is the single most common way a technical diagram fails to teach (Cognitive Load Theory, split-attention effect).
- Every label is real text in the SVG, never outlined paths — so it's selectable, searchable, translatable, and screen-readable.

---

## 4. Rules that override taste

1. **One idea per figure.** If a figure needs two sentences to explain what it shows, it is two figures.
2. **Progressive build.** A complex figure appears as 3–5 states the reader steps through, not one finished diagram. Same viewBox, same element positions across states — only opacity and additions change. This is free with SVG and is the difference between a figure that teaches and a figure that intimidates.
3. **No hard-coded colour.** Every stroke and fill is `var(--token)` or `currentColor`. Dark mode is then free and cannot drift.
4. **Concreteness fading.** Each concept gets three registers: concrete (hero art) → representational (annotated diagram) → abstract (equation). Never skip a rung.
5. **The misconception is named.** Every concept's figure set includes one figure that shows the *wrong* mental model and why it fails. Naming the misconception explicitly beats quietly presenting the correct one.
6. **Nothing decorative near a hard idea.** Ornament competes for working memory exactly when there is none spare.

---

## 5. What generates vs what is authored

This is the hard line. Violating it puts confidently-wrong figures in front of learners, which is worse than having no figure.

| Category | Method | Why |
|---|---|---|
| Technical diagrams — forces, axes, angles, control surfaces, flow fields, anything labelled | **Authored by hand** in SVG/Figma | An image model will invent components and mislabel axes. Non-negotiable. |
| Charts and plots | **Computed** from real data | Same reason. Data comes from XFOIL/AVL/JSBSim (see `TOOLING-RESEARCH.md` §12). |
| 3D scenes | **Modelled** (Blender / OpenVSP), rendered in Three.js | |
| Hero images, chapter openers, atmosphere | **gpt-image-2** via `gpt-image-bridge` | No factual load. |
| Textures, skies, backgrounds | **gpt-image-2** | |
| Thumbnails and card art | **gpt-image-2** | |
| Reference imagery for modelling | **gpt-image-2** | Feeds a human/Blender step, never ships as fact. |

`concepts.json` enforces this structurally: each concept has an `images` array (generated, with prompts) and an `authored` array (human-drawn, deliberately with *no* prompt field). A technical diagram cannot be generated by accident because there is nothing to generate it from.

---

## 6. The locked style prefix

Every generation call prepends `content/style-prefix.txt` verbatim, then a `---` separator, then that image's own subject block. **That file is canonical** — `gen.mjs` reads it; edit it there.

**Why the prefix is long.** `gpt-image-bridge` sends text only — there is no reference-image channel, so nothing carries style between calls except the words. Every call is a cold start. The prefix therefore has to fully re-specify medium, palette (with hex values), lighting angle, camera behaviour, composition rules, and the forbidden list, every single time. This is the opposite of the usual "keep prompts short" advice, and it is correct here: with no reference images, an underspecified prompt is an invitation for image #7 to diverge from image #6.

**The generated-image palette is deliberately narrow and separate from §1.** Six colours — warm paper, slate, deep blue, mid blue, one amber accent, bone. It shares no hue with the semantic force palette. That separation is intentional: a reader must never mistake a decorative blue in a hero image for the blue that means *lift*.

**The forbidden list is the load-bearing clause.** `text, letters, numerals, labels, arrows, callout lines, leader lines, measurement ticks, scale bars, grids, logos, watermarks` — this is what stops generated art drifting into pseudo-diagram territory where it can be *wrong*. If a generated image comes back with an arrow in it, it is rejected, not patched.

---

## 7. Per-image prompt template

Five blocks after the prefix. Dense, art-directed, concrete:

```
Subject:      the thing itself, described in physical detail — form, colour assignment,
              orientation, how it is constructed from flat planes
Setting:      what surrounds it, or explicitly that nothing does
Composition:  placement in frame, percentage of frame width occupied, where the empty
              space sits, what must not touch the frame edge
Colour:       which of the six carry the image, and exactly where the single amber goes
Mood:         two or three words
```

The amber instruction matters more than it looks. One accent colour, explicitly placed, is the strongest single lever for making twelve independently-generated images feel like one set — it gives every frame the same visual "signature" in the same proportion.

---

## 8. The generation loop

1. `node scripts/gen.mjs --dry` — read the assembled prompts. Costs nothing.
2. Generate **one** image. Look at it properly.
3. If it misses, fix `style-prefix.txt` (a systemic miss) or that image's `prompt` (a local miss). Systemic misses are far more common early.
4. Repeat until one image is right. That image defines the target.
5. Only then `--all`.

Each call takes 4–6 minutes and spends ChatGPT message quota rather than API credit, so a bad batch of twelve is expensive in time and quota both. Steps 2–4 are not optional.

---

## 9. Provenance

Every generated asset is logged in `content/assets.md` at generation time by the script — file, concept, kind, model, date, and prompt tail — following the ledger pattern from Cell Architecture Studio's `docs/ASSETS.md`. Untracked assets become unfixable later.
