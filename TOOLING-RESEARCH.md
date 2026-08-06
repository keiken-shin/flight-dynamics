# Tooling Research — Building a Visual Learning Platform

**Goal:** a Cell-Architecture-Studio-class platform for one deep topic (e.g. Flight Dynamics) — images, video, consistent diagrams, formulas, 3D, broken down so a beginner (or a 5-year-old) gets it.

**Status:** research only. Nothing built.

---

## 0. Reality check: what the inspiration actually is

I pulled the repo and the live site. The measured facts:

**Code stack (from `package.json`):**
```
react 19 · react-dom 19 · typescript 5.9 · vite 7.2
three 0.181 · @react-three/fiber 9 · @react-three/drei 10 · meshoptimizer 1.1
lucide-react (icons) · plain CSS (src/styles.css)
dev: vitest 4 · playwright-core 1.59 · pngjs · jsdom
```
That's **7 runtime dependencies.** No CMS, no backend, no state library, no CSS framework, no math renderer, no chart library, no animation library.

**Asset pipeline (from `docs/ASSETS.md`):** three GLB models from the NIH 3D Print Exchange (public domain), two user-supplied GLBs, procedural Three.js geometry as fallback for the rest, plus AI-generated reference renders used as thumbnails and transparent PNGs. Provenance tracked in a single markdown file.

**Feature surface (from the live site):** Gallery · Library · Notebooks · Settings · Demo, i18n (EN/中), a 3D workbench with cross-section / rotate / isolate / hide-others / reset / screenshot / GLB-export, an AI tutor panel, quiz + flashcard + notebook study modes, local XP and achievements, three responsive layouts. Verification is a Playwright script (`scripts/verify.mjs`) that screenshots three viewports and checks canvas pixel metrics to catch blank renders.

**The conclusion that should drive everything below:** the code is *ordinary*. Any competent React dev ships that stack in a week. What makes it feel premium is **content density and visual consistency** — seven specimens, each with organelle-level annotations, matched thumbnails, a coherent palette, and a single unbroken visual language. That is 80–90% of the work, and almost none of it is programming.

So the tool list is weighted accordingly: light on frameworks, heavy on content production, curation, and consistency enforcement.

---

## 1. Three decisions that cascade

Everything else follows from these. Decide before picking tools.

**1. Is the 3D essential, or is it 2D + motion?**
Cells are inherently volumetric, so 3D earns its place there. Flight dynamics is mostly **vectors, axes, coordinate frames, and time-series** — 60–70% of it is better served by annotated 2D diagrams and interactive plots. You still want 3D for aircraft attitude (roll/pitch/yaw is genuinely 3D and genuinely hard to grasp from a static picture), but 3D-everything would be a costly mistake here. Budget: one good 3D aircraft + a handful of 3D scenes, everything else 2D.

**2. Content-as-code, or content-in-a-CMS?**
Content-as-code (MDX + typed data files in git) — you are the only author, you want diffs, and the interactives are components. A CMS is overhead until there are non-technical authors. CAS chose code (`src/data/cells.ts`).

**3. Accounts, or local-only?**
Local-only (localStorage/IndexedDB) removes auth, a database, privacy policy, GDPR, and a backend entirely. CAS is local-only. Add accounts only when cross-device sync is a real complaint.

---

## 2. App shell & content authoring

| Need | Pick | Alternatives | Notes |
|---|---|---|---|
| Framework | **Astro** (+ React islands) | Next.js; Vite+React SPA (what CAS used) | Astro's content collections + Zod schema validation is purpose-built for a content-heavy learning site; ships zero JS for prose pages and hydrates only the interactive islands. Big perf and SEO win over a pure SPA. Use Next.js instead only if you'll want server rendering/auth later. |
| Content format | **MDX** | Markdoc, plain MD + component registry | MDX lets you drop `<LiftVectorDemo />` mid-paragraph. Markdoc is stricter/safer if you ever open authoring up. |
| Content schema | **Zod** (via Astro content collections) | TypeBox, Valibot | Non-negotiable. Define a `Lesson` schema requiring every concept to have: hook, analogy, diagram, formula + plain-language gloss, interactive, check-for-understanding, "why it matters", further reading. The schema is what enforces consistency across 200 lessons. |
| Styling | **Tailwind v4** or plain CSS + custom properties | CSS Modules (CAS), vanilla-extract | Either is fine. What matters is the token layer (§3). |
| Icons | **Lucide** | Phosphor, Radix Icons | CAS used Lucide. Consistent stroke weight matters more than the specific set. |
| UI primitives | **Radix UI** (unstyled) or shadcn/ui | Headless UI, Ark UI | For tabs, dialogs, sliders, tooltips, accordions with accessibility already handled. Sliders and tooltips are load-bearing in explorables. |
| State | React `useState` + URL params + Zustand if needed | Jotai, Valtio | Don't reach for a state library on day one. Encode explorable parameters in the URL so a specific configuration is shareable — that's a genuinely valuable feature. |
| Search | **Pagefind** | Fuse.js, Orama, Algolia | Pagefind indexes at build time, ships a tiny WASM index, needs no server. Ideal for static content sites. |

---

## 3. The visual system (the actual differentiator)

This is the part that makes it look like one product instead of 200 assorted pages. Treat it as engineering, not decoration.

| Need | Pick | Notes |
|---|---|---|
| Design tokens | CSS custom properties in one file | Colour, spacing, type scale, stroke widths, corner radii, shadow steps. Every diagram, chart, and 3D scene reads from these. |
| Type | 2 families max — a display serif + a text sans, or one variable font | Self-host via Fontsource. Mono for formulas/code. |
| Colour | 1 accent + 1 neutral ramp + **a fixed semantic palette** | The semantic palette is the important one — see the visual-grammar note below. |
| Dark mode | `prefers-color-scheme` + a manual toggle | Every diagram must be authored to work in both. Cheapest route: draw in SVG using `currentColor` and CSS variables, never hard-coded hex. |
| Design tool | **Figma** (you have the Figma MCP wired) | Build a component library: arrowheads, axis crosses, label chips, callout boxes, aircraft silhouettes. Author diagrams by composing those components. |
| Free alternative | **Penpot** | Self-hostable, open source, near-Figma. |

**The visual grammar document** — write this before drawing anything. A one-page contract like:

> Forces are solid red arrows. Velocity is a solid blue arrow. Moments are curved green arrows. Body axes are always X-forward-red / Y-right-green / Z-down-blue and never re-coloured. Angles are thin amber arcs with the symbol inside. Airflow is dashed light-blue streamlines. Ground/reference frames are 40% grey. Labels sit in a rounded chip, never bare on top of geometry. Arrow stroke = 2px at 1× scale, arrowhead = 8px.

Once that exists, every subsequent diagram is consistent by construction, and — this is the real payoff — an AI or a collaborator can produce on-brand diagrams by following the document. Without it you get 200 diagrams that each look fine alone and incoherent together.

---

## 4. Diagrams

The single most important asset class for this project, and the one where the naive approach (ask an image model for "a diagram of the four forces on an aircraft") fails hardest.

| Approach | Tool | Use for |
|---|---|---|
| **Hand-authored vector** | **Figma** → export SVG; or **Illustrator**/**Inkscape** | The canonical technical diagrams. Precise, editable, themeable, accessible. This is your default. |
| **Hand-drawn feel** | **Excalidraw** (also `@excalidraw/excalidraw` embeddable) | Intuition-building sketches, the "explain it to a 5-year-old" register. Deliberately loose. |
| **In-code hand-drawn** | **Rough.js** | Generate sketchy SVG from data, so hand-drawn style stays parameterised. |
| **Text-defined, auto-laid-out** | **Mermaid** | Flowcharts, control-loop block diagrams, decision trees, state machines. Versionable in git, renders natively in many contexts. Weak for spatial/physical diagrams. |
| **Data-driven** | **D3** (or raw SVG + React) | Diagrams whose geometry comes from a computation — force polygons that update with angle of attack, V-n envelopes, root-locus plots. |
| **Declarative math diagrams** | **Penrose** | Niche but remarkable: describe a mathematical relationship, get a diagram. Worth 30 minutes of evaluation. |
| **Embeddable canvas** | **tldraw** | If you want users to draw/annotate on top of your diagrams. |
| **Handwriting/annotation** | **Perfect Freehand** | Pressure-sensitive strokes if you add an annotation layer. |
| **Raster → vector cleanup** | **Inkscape trace / potrace / Vectorizer.ai** | Converting a scanned or generated raster into an editable, themeable SVG. |
| **SVG optimisation** | **SVGO** | Ship-time. Strips editor cruft, often 60–80% smaller. |

**SVG is the right primary format**: infinitely scalable, styleable from CSS (so free dark mode), animatable, diffable in git, and accessible (`<title>`, `<desc>`, ARIA).

---

## 5. Math & formulas

| Need | Pick | Alternatives | Notes |
|---|---|---|---|
| Render LaTeX | **KaTeX** | MathJax | KaTeX is faster and synchronous; MathJax has fuller LaTeX coverage and better MathML/screen-reader output. Start KaTeX, switch only if you hit a macro it can't do. |
| Markdown integration | `remark-math` + `rehype-katex` | — | Write `$$ L = \tfrac12 \rho V^2 S C_L $$` inline in MDX. |
| Live/manipulable math | **Desmos API**, **GeoGebra**, **Observable Plot** | Wolfram Cloud embeds | For "drag the slider and watch the curve move". |
| Symbolic math | **SymPy** (build time) / **math.js**, **nerdamer** (runtime) | — | Deriving intermediate steps, or letting users see a derivation expand. |
| Units | **js-quantities**, **mathjs units** | — | Genuinely valuable in aerospace: knots vs m/s vs ft/min kills more understanding than the physics does. |

**A formula-presentation pattern worth adopting:** every formula gets four layers, progressively disclosed — (1) a plain-English sentence, (2) the symbolic form, (3) each symbol as a hoverable/tappable term with units and a one-line meaning, (4) a live numeric playground with sensible defaults. Build one `<Formula>` component that takes all four; then every formula on the site is presented identically. That's a component, not a design decision repeated 80 times.

---

## 6. Charts & plots

| Pick | Use for |
|---|---|
| **Observable Plot** | Default. Grammar-of-graphics, concise, great defaults, ideal for static explanatory charts. |
| **D3** | When you need full control or a chart type nobody has (V-n diagrams, phugoid phase portraits, root loci). |
| **uPlot** | Real-time streaming time-series at 60fps with thousands of points — a live simulation readout. |
| **Plotly.js** | 3D surface plots (e.g. C_L over α and Mach) with pan/rotate essentially free. Heavy bundle; lazy-load it. |
| **ECharts / Recharts** | If you want batteries-included dashboards. Recharts is the easiest React fit. |

Whatever you pick, drive all chart colours from the §3 token file, and check both themes.

---

## 7. Interactive 2D simulations (explorables)

The "explorable explanation" is the format you're actually building. Prior art worth studying: Bret Victor's *Explorable Explanations*, Nicky Case's work, `explorabl.es`, and Distill's *Communicating with Interactive Articles*.

| Need | Pick | Notes |
|---|---|---|
| Canvas sketches | **p5.js** | Fastest path from idea to a running simulation. Heavier than raw canvas. |
| Raw 2D | Canvas 2D API + `requestAnimationFrame` | For anything performance-sensitive; not much harder than p5 once you have a loop helper. |
| 2D physics | **Matter.js** or **Rapier2D** (WASM) | Only if you need contacts/collisions. Flight dynamics generally does **not** — you want your own integrator (§12). |
| ODE integration | Your own RK4, or `odex-js` | 6-DOF flight equations are a solved textbook problem; ~150 lines of JS. Write it, don't import a physics engine. |
| Scroll-driven narrative | **Scrollama** (+ IntersectionObserver) | The "as you scroll, the diagram morphs" pattern. Pair with `position: sticky`. |
| Smooth scroll | **Lenis** | Optional polish; respect `prefers-reduced-motion`. |
| UI motion | **Motion** (formerly Framer Motion) | Layout transitions, enter/exit, shared-element morphs. |
| Timeline animation | **GSAP** (free including all plugins since 2025) | ScrollTrigger, SVG morphing, precisely choreographed sequences. The most capable option for complex timelines. |
| Scrubbable 3D/2D timelines | **Theatre.js** | Visual timeline editor that emits values you bind to any scene. Excellent for "drag through the maneuver". |
| Vector-animation assets | **Rive** (interactive, state machines) / **Lottie** (After Effects export) | Rive is the better fit for interactive educational micro-animations; Lottie if you already have AE workflows. |

---

## 8. 3D

### Authoring

| Need | Pick | Notes |
|---|---|---|
| General 3D | **Blender** (free) | Modelling, UVs, materials, baking, glTF export. Non-negotiable in the pipeline even if you don't model from scratch — you'll need it to clean, retopologise, and re-material downloaded assets. |
| Aircraft geometry | **OpenVSP** (NASA, free) | Parametric aircraft geometry — wings, fuselages, tails from real engineering parameters. Exports meshes *and* feeds aero solvers. Uniquely right for this topic: the same model teaches geometry and produces the aero data. |
| CAD (if needed) | **Onshape** (free tier), **Fusion 360**, **Plasticity** | Only if you need hard-surface mechanical detail (landing gear, control linkages). |
| Web-native 3D authoring | **Spline** | Low-code 3D scenes with interaction, exports to web. Fast for simple hero scenes; less control than Blender. |
| Sculpting | **Blender** sculpt / **ZBrush** | Unlikely to be needed here. |

### Ready-made models

- **NASA 3D Resources** — public domain aircraft, spacecraft, engines. First stop.
- **Smithsonian Open Access** — CC0 3D scans, including aircraft.
- **NIH 3D** — what CAS used (biology-specific; irrelevant here, but the precedent is: find the domain's public-domain 3D repository).
- **Sketchfab** — filter by CC licence; check attribution requirements carefully.
- **Poly Haven** — CC0 HDRIs and textures for lighting.

### Web runtime

| Need | Pick | Notes |
|---|---|---|
| Renderer | **Three.js** + **React Three Fiber** + **drei** | Exactly what CAS used, and correct. R3F makes 3D scenes composable React; drei supplies orbit controls, gizmos, HTML labels, environment maps, loaders. |
| Simple single-model viewer | **`<model-viewer>`** (Google) | One web component, AR support, poster images. If a page just needs "spin this model", this beats a full R3F scene. |
| Alternative engines | **Babylon.js**, **PlayCanvas** | Babylon has stronger built-in tooling; Three has a far larger ecosystem. Stay with Three. |
| Physics in 3D | **Rapier** (via `@react-three/rapier`) | Only if you need contacts. See §12 — for flight you want your own integrator driving the transform. |
| Post-processing | `@react-three/postprocessing` | Bloom, outline (for highlighting a selected part), depth of field. The outline pass is genuinely useful for "which component am I looking at". |

### Asset pipeline (this is where 3D projects die)

| Step | Tool |
|---|---|
| Format | **glTF/GLB** — the only sane choice for web |
| Compression | **gltf-transform** CLI (Draco for geometry, Meshopt for speed) — CAS shipped `meshoptimizer` |
| Texture compression | **KTX2/Basis** via `toktx` — GPU-native, huge VRAM savings |
| Simplification / LOD | gltf-transform `simplify`, or Blender decimate |
| Inspection | **glTF Report** (gltf.report), Three.js editor |
| Budget | Hold a hard per-model budget (e.g. ≤3 MB compressed, ≤150k tris). Write it down; enforce it in CI. |

---

## 9. AI image generation

**Read this before the tool list:** AI image models are the wrong tool for labelled technical diagrams. They produce plausible-looking nonsense — mislabelled axes, invented components, arrows pointing at the wrong thing — and in a *teaching* product, a confidently wrong diagram is worse than no diagram. Use them for **atmosphere, hero art, textures, thumbnails, background illustration, reference imagery, and 3D-model reference** — never for the load-bearing technical figure. Those you author in §4.

CAS follows exactly this split: AI-generated *reference renders* for thumbnails and previews; real NIH models and hand-configured Three.js for the substance.

### Hosted models (as of Aug 2026)

| Model | Strength |
|---|---|
| **Nano Banana 2** (Gemini 3.1 Flash Image) | Best all-round; strong image-to-image + inpainting; fast |
| **GPT Image 2** | Currently top-ranked on blind-preference leaderboards |
| **FLUX.2** | Up to 10 reference images for style/character consistency |
| **Seedream 4** (ByteDance) | 4K output; up to 6 reference images |
| **Ideogram 3.0** | Best-in-class text rendering — the one to use if an image must contain legible words |

### Local / self-hosted

**ComfyUI** — you already have it wired via MCP with a large skill library (`comfy:*`). Relevant models: FLUX, Qwen-Image, Z-Image, SDXL. This is the right choice for volume and for style consistency, because it gives you the two levers hosted APIs mostly don't:

- **LoRA training** on 20–40 of your own images → a reusable "house style" adapter. `comfy:ai-toolkit-trainer` covers this.
- **IP-Adapter / reference conditioning** → every new image inherits the palette and rendering style of a locked reference set.
- **ControlNet** → generate an illustration constrained to a depth map or line drawing you authored, so the *geometry* is yours and only the *rendering* is generated. This is the one genuinely safe way to use generative imagery for technical subjects.

### Supporting raster tools

| Need | Tool |
|---|---|
| Background removal | **rembg**, **BiRefNet** — for the transparent-PNG thumbnails CAS uses |
| Upscaling | **Real-ESRGAN** (free), **Topaz** (paid) |
| Editing | **Photopea** (free, in-browser, PSD-compatible), **Affinity Photo**, **GIMP** |
| Compression | **Squoosh**, **sharp** (build-time), **`@astrojs/image`** |
| Ship format | **AVIF** with WebP fallback |

---

## 10. Animation & produced video

| Need | Pick | Notes |
|---|---|---|
| Mathematical explainer animation | **Manim (Community Edition)** | The 3Blue1Brown engine. Python, unmatched for animated derivations and geometric proofs. Slow to author; produces video, not interactive. |
| Programmatic motion graphics | **Motion Canvas** | TypeScript, canvas-based, has a live preview editor. Best fit for carefully choreographed educational sequences; MIT-licensed. |
| Data-driven video | **Remotion** | React → video. Best when the video's content comes from your data. Requires a paid company licence above a small-team threshold — check before committing. |
| Screen recording | **OBS Studio** (free), **ScreenFlow**, **Camtasia** | Recording X-Plane/FlightGear sessions or your own simulator. |
| Editing | **DaVinci Resolve** (free tier is genuinely professional), **Kdenlive**, **Premiere** | |
| Delivery | **HLS** via **Mux** / **Cloudflare Stream**, or plain MP4 + `<video>` for short clips | Self-hosted MP4 is fine under ~30s; anything longer wants adaptive streaming. |

**Recommendation:** prefer *interactive* over *video* wherever possible — an interactive costs about the same to build, doesn't go stale, and is the thing your inspiration does well. Reserve produced video for the few concepts where a fixed narrative genuinely beats exploration (a full flight-envelope walkthrough, a historical accident case study).

---

## 11. Video curation (embedding other people's work)

| Need | Tool |
|---|---|
| Discovery + metadata | **YouTube Data API v3** — search, fetch title/channel/duration/thumbnail, verify a video still exists |
| Transcripts | `youtube-transcript-api` (Python) / `youtube-transcript` (JS); **yt-dlp** for subtitle files |
| Search *inside* video | Whisper (if no captions) → embed transcript chunks → deep-link to `?t=` timestamps |
| Fast embed | **lite-youtube-embed** — a full YouTube iframe costs ~500KB+; this defers it behind a click |
| Link rot | A scheduled job that re-checks every embedded video ID monthly and flags dead ones |

**Sources worth curating for flight dynamics:** NASA (public domain), MIT OpenCourseWare (CC-BY-NC-SA), university aero channels, FAA/EASA training material, manufacturer technical videos, air-accident investigation reconstructions.

**Licensing rule:** *embed, never rehost.* Embedding via the official player is licensed; downloading and re-uploading is not. Curation = a link, a timestamp, a one-line "watch this for X", and your own framing around it. That framing is the value you add.

---

## 12. Domain compute — Flight Dynamics specifically

The topic-specific layer. Substitute the equivalents if the topic changes; the *shape* transfers.

| Tool | What it gives you | Licence |
|---|---|---|
| **JSBSim** | Full 6-DOF flight dynamics model. Aircraft defined in XML (geometry, mass, inertia, aero coefficient tables). ~1000+ academic citations; powers FlightGear. C++ with Python bindings. | LGPL |
| **OpenVSP** | Parametric aircraft geometry + **VSPAERO** (vortex-lattice/panel aero). NASA-developed. Exports both meshes for your 3D scenes and aero data for your simulations. | NASA Open Source |
| **AVL** | Athena Vortex Lattice — fast stability derivatives from a simple geometry description. The classic teaching tool. | Free (MIT-authored) |
| **XFOIL / XFLR5** | 2D airfoil polars (C_L, C_D, C_M vs α). XFLR5 wraps XFOIL with a GUI and adds 3D wing analysis. | GPL |
| **NeuralFoil** | Neural-network surrogate for XFOIL — near-instant airfoil polars. Makes *live in-browser* airfoil exploration feasible if ported. | MIT |
| **AeroSandbox** | Python, differentiable aircraft design/optimisation framework (Peter Sharpe, MIT). Excellent for generating clean datasets to ship. | MIT |
| **Digital DATCOM** | USAF empirical stability-derivative estimation. Public domain; still the reference for quick estimates. | Public domain |
| **FlightGear** | Open-source simulator (uses JSBSim). Good source for recorded footage and for validating your own model. | GPL |
| **X-Plane** | Commercial; blade-element aero. Good for high-quality video capture. | Paid |
| **SU2 / OpenFOAM** | Full CFD. Almost certainly overkill — but one beautiful pre-computed CFD flow-field visualisation makes a memorable page. | Open source |
| **Python `control`** + **SciPy** | Stability analysis, root loci, eigenmodes (phugoid, short-period, Dutch roll), `solve_ivp` for trajectories. | BSD |

### Getting this into the browser — three tiers, in order of preference

1. **Precompute offline, ship as data.** Run JSBSim / AVL / XFOIL / AeroSandbox in a build step; export coefficient tables, trajectories, and eigenmodes as JSON. The browser interpolates and animates. Covers ~80% of what a learner needs, costs nothing at runtime, and can't break in production. **Start here.**
2. **Write the equations in TypeScript.** The 6-DOF rigid-body equations are ~150 lines: quaternion attitude state, forces and moments from your shipped coefficient tables, RK4 integration. Runs at 60fps, is fully interactive, and — importantly for a teaching product — *you can show the learner the actual code*. This is the sweet spot for the flagship interactive.
3. **WASM.** JSBSim can in principle be built with Emscripten (community builds exist; expect real work). Only justified if you need the exact validated model in-browser. Rust + `wasm-bindgen` is the cleaner path if you're writing the solver yourself and hit a performance wall.

### Reference data sources

**NASA NTRS** (technical reports server) · **NACA reports** (public domain — the foundational airfoil data) · **NASA 3D Resources** · **UIUC Airfoil Database** · **Airfoil Tools** · standard texts (Anderson, Etkin & Reid, Nelson, Stengel) for structure and notation conventions.

---

## 13. Learning mechanics

| Need | Pick | Notes |
|---|---|---|
| Progress / XP / achievements | localStorage → **Dexie.js** (IndexedDB) when it outgrows it | CAS is local-only. Ship local first. |
| Spaced repetition | **FSRS** via **ts-fsrs** | The current state of the art (what modern Anki uses). ~5 lines to schedule a card. Turns a browsing site into a retention tool — the single highest-leverage learning feature you can add. |
| Quiz engine | Roll your own from a Zod-typed question schema | MCQ, numeric-with-tolerance, drag-to-label-the-diagram, "predict then reveal". The diagram-labelling type is the strongest for this domain. |
| Flashcards | Same store as SRS | |
| Notebooks / notes | localStorage + Markdown, or **TipTap** for rich text | CAS has this. |
| Sync (later) | **Supabase**, **Turso**, **PocketBase**, **InstantDB** | Only when local storage becomes a real complaint. |
| Export | Anki `.apkg` export, Markdown export | Cheap to add, disproportionately appreciated. |

---

## 14. AI tutor layer

CAS ships a tutor panel; its README documents no backend, so it's likely client-side scaffolding. Doing it properly:

| Need | Pick | Notes |
|---|---|---|
| Model | **Claude Opus 5** (`claude-opus-5`) — $5 / $25 per MTok, 1M context | For explanation quality on hard technical questions. **Claude Sonnet 5** (`claude-sonnet-5`, $3/$15) for high-volume routine Q&A; **Haiku 4.5** ($1/$5) for classification/routing only. |
| Grounding | RAG over *your own* lesson content | The tutor must answer from your material, not from general knowledge. This is what keeps it consistent with the lessons and prevents contradictions. |
| Embeddings | **Voyage** (`voyage-3`) or OpenAI `text-embedding-3` | |
| Vector store | **LanceDB**, **pgvector** (Supabase), **Turso** | Or, for a small corpus, an in-memory cosine search over a shipped JSON index — genuinely viable under ~2000 chunks. |
| Fully client-side option | **transformers.js** + a small embedding model | Zero backend, zero per-query cost, works offline. Worth considering given the local-first architecture. |
| Citations | Anthropic's `citations: {enabled: true}` on document blocks | The API returns responses split into cited text blocks with source locations — so the tutor can say "per Lesson 4, §2" with a real link. Exactly right for an educational product. |
| Cost control | **Prompt caching** | Cache the lesson corpus prefix: cache reads cost ~0.1× base input. Minimum cacheable prefix is 512 tokens on Opus 5. This is the difference between an affordable tutor and an expensive one. |
| Bulk generation | **Batch API** (50% discount) | For pre-generating quiz questions, alt text, summaries, and translations at build time rather than runtime. |
| Streaming UI | **Vercel AI SDK** | Handles streaming, tool calls, and React state. |

**Design note:** the highest-value tutor behaviour here isn't Q&A — it's *Socratic*. "You said lift comes from Bernoulli. Let's test that: what does it predict for an inverted aircraft?" That's a system-prompt and interaction-design decision, not a model decision.

---

## 15. Knowledge work, research & curation

The non-code half. Underrated, and where the quality actually comes from.

| Need | Tool |
|---|---|
| Source management + citations | **Zotero** (free, with browser connector; exports BibTeX) |
| Note graph / synthesis | **Obsidian** (local markdown — same files can feed your MDX) |
| Source-grounded Q&A over PDFs | **NotebookLM** — genuinely good for interrogating a stack of NASA technical reports |
| Read-later + highlights | **Readwise / Reader** |
| Project planning | **Notion** (you have the MCP wired), Linear, or plain markdown |
| Diagramming during research | **Excalidraw**, **FigJam** |
| Paper sources | arXiv, NASA NTRS, Google Scholar, Semantic Scholar |
| PDF extraction | **marker**, **nougat**, **pdfplumber** — for pulling tables and figures out of technical reports |
| Video → text | **Whisper** — transcribe lectures you're learning from, then search them |

**The curation workflow that matters:** for each concept — collect 5–10 authoritative sources → extract the specific claims/data → identify the standard *misconceptions* (search forums, Stack Exchange, student questions) → design the explanation to attack the misconception directly → cite. The misconception step is what separates a good explanation from a Wikipedia paraphrase. For flight: "Bernoulli/equal transit time" and "centrifugal force in a turn" are the canonical ones.

---

## 16. Pedagogy (tools of thought, not software)

You said "explain to a 5-year-old". That's a design methodology, and it has a literature. Adopt these deliberately:

- **Cognitive Load Theory** (Sweller) — intrinsic vs extraneous load. Directly implies: no decorative animation near a hard concept; split-attention is the enemy (labels *on* the diagram, never in a legend); worked examples before problems.
- **Dual Coding** (Paivio) — words + image together beat either alone, but *redundant* text next to an image hurts. Argues for annotated diagrams with minimal prose, not prose with a picture beside it.
- **Concreteness Fading** — start fully concrete (a paper plane), fade to representational (an arrow diagram), then to abstract (the equation). This should be the literal structure of every lesson, and it's schema-enforceable (§2).
- **Retrieval Practice + Spaced Repetition** — testing beats re-reading, by a wide margin. §13 is not a nice-to-have.
- **The Worked-Example Effect** — for novices, studying a worked solution beats solving. Flip to practice only once they have schemas.
- **Bloom's Taxonomy** — tag every lesson objective (remember / understand / apply / analyse / evaluate / create) so you can see what your coverage actually is.
- **Predict-Observe-Explain** — before revealing an interactive's result, make the learner commit to a prediction. Cheap to implement, dramatically improves retention.
- **The Feynman Technique** — as a *test* of your own drafts: if you can't write the paragraph without jargon, you don't understand it yet.

Reference works: Mayer's *Multimedia Learning*, Willingham's *Why Don't Students Like School?*, Brown/Roediger's *Make It Stick*.

---

## 17. Accessibility & internationalisation

| Need | Tool |
|---|---|
| Standard | **WCAG 2.2 AA** |
| Automated audit | **axe-core** (via `@axe-core/playwright`), Lighthouse |
| Contrast | Include a contrast check in CI over your token palette |
| Motion | Respect `prefers-reduced-motion` everywhere — mandatory on an animation-heavy site, and easy to forget |
| Diagram accessibility | Every SVG gets `<title>` + `<desc>`; every complex figure gets a genuine text alternative (not "diagram of forces") |
| 3D accessibility | Hard. Provide a 2D static fallback and a text description; make part-selection reachable from a keyboard-navigable list rather than only by clicking the mesh |
| Video | Captions (Whisper-generated, human-corrected) |
| i18n | **Paraglide (inlang)** or **i18next**; **Astro i18n** routing | CAS ships EN/中 |
| Translation | Claude Batch API at build time, human review for technical terms | Aerospace terminology does not survive machine translation unreviewed |

---

## 18. Performance

3D + video + images is the heaviest possible content mix. Budget explicitly.

| Concern | Tool / technique |
|---|---|
| Bundle | `rollup-plugin-visualizer`; lazy-load Three.js, Plotly, and each 3D scene |
| Budgets | Lighthouse CI with hard thresholds in CI |
| Images | AVIF + responsive `srcset`; `sharp` at build time |
| 3D | Draco + Meshopt + KTX2; LODs; `<Suspense>` with a poster image; never mount more than one canvas at a time |
| Fonts | Self-hosted, subset, `font-display: swap` |
| Metrics | Core Web Vitals — INP matters most for interactive pages |
| Monitoring | `web-vitals` → your analytics |

---

## 19. Testing & verification

Copy CAS's approach here — it's the smart part of that repo.

| Need | Tool |
|---|---|
| Unit | **Vitest** |
| Component | **Testing Library** |
| E2E + visual | **Playwright** — multi-viewport screenshots; CAS's `verify.mjs` checks canvas pixel metrics to catch blank 3D renders, which is exactly the failure mode WebGL has and normal tests miss |
| Visual regression | Playwright snapshots, or **Chromatic** if you adopt Storybook |
| Content validation | Zod schemas + a CI script asserting every lesson has every required part, every formula has a plain-language gloss, every image has alt text, every external link resolves |
| Link checking | **lychee** |
| Component workbench | **Storybook** — worth it once you have 20+ diagram/interactive components |

---

## 20. Hosting, CI, analytics

| Need | Pick |
|---|---|
| Host | **Vercel** (you have the MCP wired) or **Cloudflare Pages** |
| Large assets | **Cloudflare R2** or Backblaze B2 + CDN — keep 3D models and video out of the git repo and off the app bundle |
| Repo/CI | GitHub + GitHub Actions |
| Large files in git | **git-lfs** if models must live in the repo |
| Analytics | **Plausible** or **Umami** (privacy-first) · **PostHog** if you want funnels — "where do learners drop out of this lesson" is the metric that improves the content |
| Errors | **Sentry** |
| Feedback | An inline "was this clear?" widget per section. The single most valuable data source you can build. |

---

## 21. Licensing & provenance (do not skip)

CAS tracks every asset in `docs/ASSETS.md`. Copy that practice verbatim — it takes minutes per asset and saves you from an unfixable mess later.

| Source type | Rule |
|---|---|
| NASA / NACA / US Government | Public domain. Free to use. (Don't imply NASA endorsement or use their logo.) |
| Wikimedia Commons | Per-file licence — check each one |
| Smithsonian Open Access | CC0 |
| Sketchfab | Per-model; filter for CC and honour attribution |
| YouTube | Embed only. Never download and rehost. |
| Textbook figures | Copyrighted. **Redraw them**, don't copy them. Redrawing is also how you get §3 consistency. |
| AI-generated | Check each provider's terms for commercial use; keep the prompt and model version alongside the file |
| Your own | State a licence for the project |

Keep one `ASSETS.md` with: file · source · URL · licence · attribution required · date acquired · any modifications.

---

## 22. What you already have wired

Worth knowing before you buy anything:

| Available now | Useful for |
|---|---|
| **ComfyUI MCP** + ~30 `comfy:*` skills | All local image generation, LoRA training for house style, ControlNet-constrained illustration |
| **Figma MCP** + `figma:*` skills | Design system, diagram component library, design→code |
| **Notion MCP** | Content planning, source tracking, lesson backlog |
| **Vercel MCP** | Deployment, build logs, runtime errors |
| **Hugging Face MCP** | Model/dataset discovery |
| **Chrome DevTools MCP** + `dataviz`, `artifact-design`, `artifact-diagramming` skills | Performance profiling, chart design, diagramming |
| **Playwright** (via Chrome MCP / Bash) | The visual-verification harness |

The gaps you'd need to add: Blender, OpenVSP, JSBSim/AVL/XFOIL, Zotero, and a video editor. All free.

---

## 23. Rough cost

| Item | Cost |
|---|---|
| Framework, 3D, diagrams, math, charts, animation, testing | **$0** — all open source |
| Hosting (Vercel/Cloudflare hobby → pro) | $0–20/mo |
| Asset CDN (R2) | ~$0–5/mo at this scale |
| Domain | ~$15/yr |
| Analytics (Plausible) | $0 self-hosted / ~$9/mo |
| Figma | $0–15/mo |
| Claude API (tutor + build-time generation) | Highly usage-dependent. With prompt caching + Batch API, a small-audience tutor is plausibly $10–50/mo; without caching it can be 10× that |
| Hosted image gen (if not using local ComfyUI) | $10–50/mo |
| GPU for local ComfyUI | Sunk cost if you already have it |

**Realistic floor: under $50/month.** The expensive input is your time on content.

---

## 24. Minimum viable toolkit

If you strip everything optional, this is what you cannot do without:

```
Astro + MDX + Zod          content, structure, validation
Tailwind (or CSS vars)     the token layer
KaTeX                      formulas
Figma + SVG                diagrams — with a written visual grammar
Observable Plot            charts
Three.js + R3F + drei      3D (only where 3D earns it)
Blender + gltf-transform   3D asset pipeline
Canvas 2D + your own RK4   the interactive simulations
ts-fsrs + localStorage     retention
Playwright                 visual verification
Vercel/Cloudflare Pages    hosting
Zotero + Obsidian          research and curation
```

Everything else in this document is an upgrade you add when a specific need appears. Add ComfyUI when you need volume illustration; add the AI tutor when the content is good enough to ground it; add Manim/Motion Canvas when you hit a concept that genuinely needs video.

---

## 25. The five things most likely to sink this

1. **Visual inconsistency.** 200 individually-decent diagrams that don't agree with each other. → Mitigation: write the visual grammar doc (§3) and build the Figma component library *before* diagram #1.
2. **Scope.** "Flight dynamics" is a four-year degree. → Pick 8–12 concepts, do them to CAS's depth, ship. Depth on a narrow slice reads as quality; breadth reads as a wiki.
3. **Asset weight.** 3D + video + images = a 40MB page. → Hard budgets, enforced in CI, from day one.
4. **AI-generated technical diagrams.** Confidently wrong figures in a teaching product are actively harmful. → Generated imagery for atmosphere only; author every load-bearing figure.
5. **Building the engine instead of the content.** The code is a week; the content is months. → Ship one complete lesson end-to-end before building a second component.
