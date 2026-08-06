<div align="center">

<img src="assets/logo.svg" width="64" height="64" alt="">

# Flight Dynamics

**Learn why an aeroplane flies — then go and prove it, in a simulator that is telling you the truth.**

Twelve chapters. Thirty hand-drawn plates that build as you read. Twelve 3D sandboxes on one
six-axis flight model carrying real Cessna 172 stability derivatives — so the Dutch roll you
watch is computed, not animated.

[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF)](https://vite.dev)
[![Three.js 0.181](https://img.shields.io/badge/Three.js-0.181-000000)](https://threejs.org)
[![No framework](https://img.shields.io/badge/framework-none-555555)](#tech-stack)
[![6-axis model](https://img.shields.io/badge/flight%20model-6%20axis-1971c2)](#the-flight-model)
[![Physics asserted](https://img.shields.io/badge/physics-asserted%20in%20check-2f9e44)](#verification)
[![37 kB gzip](https://img.shields.io/badge/core-37%20kB%20gzip-2f9e44)](#tech-stack)
[![MIT](https://img.shields.io/badge/license-MIT-8a8f98)](LICENSE)

</div>

---

## Why this exists

Most explanations of flight are either a children's diagram that is quietly wrong, or a
textbook that assumes you already know. This sits in between: it names the thing you probably
believe, shows you why it is false, and then hands you the controls so you can check.

Twelve misconceptions get taken apart. Two of them have killed people:

> **"A stall is caused by flying too slowly."** A wing stalls at an *angle*. You can stall at
> cruise speed in a hard pull-up — and the final checkride asks you to do exactly that.

> **"The autopilot flies the plane."** It holds one number. It has no idea whether that number
> is still the right one, and it will hold it faithfully into terrain.

## Highlights

- **Twelve chapters** — four forces → lift → stall → drag → axes → stability → longitudinal
  modes → lateral modes → turning → envelope → equations of motion → control
- **30 authored SVG plates**, 2–4 progressive sheets each, that *assemble as you scroll* the
  paragraphs explaining them
- **12 flight sandboxes** — one scene, a different task, controls and instrument panel per chapter
- **A final checkride** — seven items flown, not answered. Each asks you to produce a claim the
  course made, and the flight model judges it
- **32-card revision deck** with Leitner spacing, *derived from the lessons* so it cannot drift
- **34 curated videos** from 24 channels, playing **inside** the app — nothing is requested from
  Google until you press play, and the end of a clip is intercepted so YouTube's suggestion grid
  never renders
- **No framework, no backend, no accounts.** Progress is `localStorage`

## The flight model

`src/sim/flight-model.js` is a rigid-body model with linear aerodynamics, in about 300 readable
lines. Geometry, inertias and stability derivatives are converted to SI from the
[JSBSim](https://github.com/JSBSim-Team/jsbsim) `c172x` definition of a 1982 Cessna 172P.

Nothing is scripted. Every mode falls out of those coefficients, and every run asserts it:

| | measured | theory |
|---|---|---|
| Short period | 0.98 s | 1.04 s |
| Phugoid | 26.7 s | 22.7 s (π√2·V/g) |
| Dutch roll | 2.24 s, damped | 2.44 s |
| Roll subsidence τ | 0.07 s | 0.09 s |
| Spiral | convergent | — |
| Load factor at 60° bank | 1.99 g | 1.99 g (1/cos φ) |

The turn is the one to look at: nothing imposes `n = 1/cos φ`. The aileron holds the bank, the
elevator holds the height, and the load factor is whatever falls out. It matches to within
**0.001 g from 0° to 60°**.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 7 | One dependency, one-second builds |
| UI | Vanilla ES modules | Twelve pages of static prose did not need a framework |
| 3D | Three.js 0.181 | Code-split; a chapter you only read never downloads it |
| Figures | Hand-authored SVG | Generated imagery never carries facts — see [NOTICE](NOTICE) |
| Type | Archivo / Archivo Narrow / JetBrains Mono | Self-hosted, no font CDN |
| Physics | Written from scratch | The learner is shown this exact file |

Core bundle is **37 kB gzip**; Three.js is a separate 128 kB chunk fetched on demand.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL. No key is needed to read the course or fly the sandboxes.

| Script | Does |
|---|---|
| `npm run dev` | Dev server with HMR. `PORT` pins the port |
| `npm run check` | Asserts the physics and flies every checkride item |
| `npm run build` | Production build |
| `npm run verify:videos` | Re-checks every clip for link rot and embedding permission |
| `npm run gen` | Regenerates imagery (needs `codex` logged in) |
| `npm run curate` | Refreshes video candidates (needs a free YouTube Data API v3 key) |

Only the last two need credentials. Copy `.env.example` to `.env` if you want them.

## Project structure

```
src/
  data/     lessons, 30 figures, SVG primitives, the derived revision deck
  sim/      flight-model.js · sandbox.js · tasks.js (what each chapter asks)
  ui/       home · lesson · cards · checkride · credits · player · logo
  styles/   tokens.css (semantic colour) · app.css
content/    curriculum spine, visual grammar, video candidates, asset ledger
scripts/    generation, curation, and the two check suites
DESIGN.md   the design system, derived from the shipped build
```

## Verification

`npm run check` runs two suites and fails on either.

**The model check** asserts stall speed, takeoff roll, climb load factor, minimum-drag speed,
both longitudinal modes, all three lateral modes, and that a level turn pulls exactly `1/cos φ`
at `g·tanφ/V`.

**The checkride check** *flies* all seven exam items with a crude autopilot standing in for a
learner who understood the chapter, and fails if any item is unreachable — an exam question
nobody can pass is worse than no question. It has already caught a real bug: elevator travel set
to 20° instead of the real aircraft's 23° meant full back stick could only command 17.4° of angle
of attack against a 16° stall, so **the aeroplane could not be stalled at speed at all** — the
exact thing chapter 3 exists to disprove.

## Design

The whole thing is an aircraft maintenance manual that happens to be interactive. Square
corners, three line weights, no shadows anywhere, a ruled zone grid down all four margins.

The organising rule is that **colour is scarce and means something**. The interface spends none
of it — every control is paper, ink and grey — so the entire budget goes to the physics: lift is
blue, thrust green, drag red, weight ink. A coloured mark on any page can only ever be a
statement about forces. See [DESIGN.md](DESIGN.md).

## Roadmap

- [ ] Animate the index plate
- [ ] A second subject on the same engine, to prove the format travels
- [ ] Deploy a public demo
- [ ] Accessibility pass on the sandbox instrument panel

## Contributing

Issues and pull requests welcome. Two house rules, both load-bearing:

1. **No sandbox for a chapter whose physics the model cannot honestly compute.** Miming a Dutch
   roll it is not calculating would be the worst thing this project could ship. `MISSING` in
   `src/sim/tasks.js` is where the reason goes.
2. **Generated imagery never carries facts.** Technical figures are authored by hand.

If a chapter is wrong, that is the most valuable issue you can open.

## Credits

Built on other people's measurements. **JSBSim** and Tony Peden for the C172 data,
**NASA/NACA** for the public-domain literature, **Three.js**, **Omnibus-Type** and **JetBrains**
for the faces, and **24 YouTube channels** whose teaching is better in five minutes than a page
of prose could be. Full attribution in [NOTICE](NOTICE) and on the in-app Sources page.

## License

[MIT](LICENSE). See [NOTICE](NOTICE) for third-party material.
