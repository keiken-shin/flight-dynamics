# Asset Ledger

Every asset that ships, with provenance. Generated rows are written by `scripts/gen.mjs`.

Append-only: a regenerated asset adds a row rather than replacing one, so superseded
attempts stay on the record. **For any given file, the last row is the shipping version.**

| file | concept | kind | source | date | prompt tail / origin |
|---|---|---|---|---|---|
| diagrams/four-forces.svg | four-forces | authored diagram | hand-authored SVG, project-owned | 2026-08-06 | Free-body diagram, 4-state build, level flight |
| diagrams/four-forces-climb.svg | four-forces | authored diagram | hand-authored SVG, project-owned | 2026-08-06 | Climb variant, 4-state build, derives L = W cos γ |
| four-forces-hero.png | four-forces | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `dominant. Amber used only for a single thin stripe along the fuselage. Mood: calm, suspended, contemplative — a machine held in equilibrium.` |
| lift-hero.png | how-lift-works | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `e for the airfoil, bone for the deflected air. One small amber mark at the leading edge stagnation point. Mood: quiet, weightless, forensic.` |
| stall-hero.png | airfoil-and-stall | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `e for the turbulent shapes, amber on only two or three of the tumbling forms at the break. Mood: tense, poised, something about to give way.` |
| drag-hero.png | drag | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `e coil, deep blue for the wingtip wedge, a single amber fragment where the vortex begins to break up. Mood: elegant, unhurried, dissipating.` |
| axes-hero.png | axes-and-controls | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `lue for the airframe, bone for the moving surfaces and the shadow, amber on nothing at all. Mood: precise, specimen-like, diagrammatic calm.` |
| stability-hero.png | static-stability | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `e, one small amber dot marking the exact lowest point of the curve. Mood: settled, patient, restful — the visual sound of something at rest.` |
| modes-hero.png | longitudinal-modes | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `or the slow wave, deep blue for the fast one, a single amber dot at one crest where the two align. Mood: rhythmic, patient, gently decaying.` |
| lateral-hero.png | lateral-modes | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `eep blue for the tightening spiral, mid blue for the opening one, amber only at the two centres. Mood: hypnotic, mirrored, quietly unstable.` |
| turn-hero.png | turning-flight | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `dominant, deep and mid blue for the airframe, a single amber navigation light at the low wingtip. Mood: committed, weighty, leaning into it.` |
| envelope-hero.png | flight-envelope | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | ` thin amber line exactly along the horizon where the light catches. Mood: thin, cold, exposed — the edge of somewhere you should not linger.` |
| eom-hero.png | equations-of-motion | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `attice, deep blue on the three origin edges, one small amber node exactly at the origin corner. Mood: abstract, ordered, cool, mathematical.` |
| control-hero.png | control-and-autopilot | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `ne amber segment at the closure, a hard-edged bone shadow just below and right of the loop. Mood: minimal, self-contained, quietly complete.` |
| axes-hero.png | axes-and-controls | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `, bone for the shadow, and one small amber accent at the very tip of the vertical tail fin. Mood: precise, specimen-like, diagrammatic calm.` |
| modes-hero.png | longitudinal-modes | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `or the slow wave, deep blue for the fast one, a single amber dot at one crest where the two align. Mood: rhythmic, patient, gently decaying.` |
| axes-hero.png | axes-and-controls | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-06 | `, bone for the shadow, and one small amber accent at the very tip of the vertical tail fin. Mood: precise, specimen-like, diagrammatic calm.` |
| three-numbers-hero.png | three-numbers | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `ber pixel of navigation light on the aircraft and nowhere else. Mood: distant, patient, watchful — something noticed long before it matters.` |
| pursuit-hero.png | pursuit-curves | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `s widest part. One amber mark at the exact point of tightest curvature. Mood: decisive, unhurried, committed — a single choice already made.` |
| rate-radius-hero.png | rate-and-radius | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `r the wedge, one thin amber stripe along the wedge's leading edge. Mood: strained, momentary, physical — air giving up its water under load.` |
| merge-hero.png | one-or-two-circle | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `gment at the crossing point itself and nowhere else. Mood: aftermath, quiet, already over — evidence of a decision rather than the decision.` |
| energy-hero.png | energy-rate | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `e for the trail and cloud, a single amber mark at the aircraft's tail. Mood: effortful, ascending, spending something — height being bought.` |
| overshoot-hero.png | overshoots | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `e amber segment exactly where the ribbon passes over itself. Mood: a mistake caught mid-correction — awkward, recoverable, not yet resolved.` |
| bvr-hero.png | bvr-geometry | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `ant cloud, amber for the single point and nowhere else. Mood: cold, vast, unnerving — something is there, it matters, and you cannot see it.` |
| timeline-hero.png | intercept-timeline | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `e small amber mark exactly at the blunt unfinished end. Mood: suspended, deliberate, mid-decision — a sentence stopped before its last word.` |
| plate-combat.png | part-ii | home plate | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `Exploded-view assembly drawing of a single-seat jet fighter, pen-and-ink line only, dashed assembly axes, no annotation. Part II index plate; matches plate-aircraft.png.` |
| merge-hero.png | one-or-two-circle | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `rom the tightest part of the bend, and nowhere else. Mood: aftermath, quiet, already over — evidence of a decision rather than the decision.` |
| timeline-hero.png | intercept-timeline | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `ver a cap, dot or terminator sitting on the end itself. Mood: suspended, deliberate, mid-decision — a sentence stopped before its last word.` |
| overshoot-hero.png | overshoots | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `Every edge in the frame is hard. Nothing is blurred or soft. Mood: a mistake caught mid-correction — awkward, recoverable, not yet resolved.` |
| rate-radius-hero.png | rate-and-radius | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `r the wedge, one thin amber stripe along the wedge's leading edge. Mood: strained, momentary, physical — air giving up its water under load.` |
| plate-combat.png | part-ii | home plate | post-processed from the row above | 2026-08-17 | `Converted RGB to 8-bit greyscale and re-optimised: 2609 kB to 808 kB, drawing unchanged. Matches plate-aircraft.png, which is also mode L — the plates are ink on paper and carry no colour.` |
| overshoot-hero.png | overshoots | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `Every edge in the frame is hard. Nothing is blurred or soft. Mood: a mistake caught mid-correction — awkward, recoverable, not yet resolved.` |
| rate-radius-hero.png | rate-and-radius | hero | gpt-image-2 (via gpt-image-bridge) | 2026-08-17 | `r the wedge, one thin amber stripe along the wedge's leading edge. Mood: strained, momentary, physical — air giving up its water under load.` |
