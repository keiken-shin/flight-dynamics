/* Every checkride item must be reachable. An item nobody can pass is worse than
 * no item, so each one is flown here by a crude autopilot standing in for a
 * learner who understands the chapter — not an expert stick, just someone doing
 * the obvious thing the brief asks for. Run with `npm run check:exam`.
 */

import { CHECKRIDE } from "../src/sim/tasks.js";
import { step, forces, stallSpeed, AIRCRAFT, trim } from "../src/sim/flight-model.js";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const DT = 1 / 120;

/* One crude pilot per item: what a reader who took the point would try. */
const PILOTS = {
  "Get it flying": () => ({ throttle: 1, elevator: 0.55 }),

  "Stall it above 60 knots": (s) => ({ throttle: 1, elevator: 1 }),

  "Find minimum drag": (s) => {
    const target = Math.sqrt((2 * AIRCRAFT.m * 9.80665) /
      (1.225 * AIRCRAFT.S * Math.sqrt(AIRCRAFT.CD0 / AIRCRAFT.k)));
    return {
      throttle: clamp(0.45 + (target - s.V) * 0.05, 0, 1),
      elevator: clamp(0.25 - s.gamma * 9 - s.q * 1.6, -1, 1),
    };
  },

  "Prove it is stable": (s, t) => {
    // Pull for a moment, then hands entirely off, on a 12-second cycle.
    const phase = t % 12;
    return { throttle: 0.7, elevator: phase < 1.0 ? 0.55 : 0 };
  },

  "Damp a Dutch roll": (s, t) => ({
    throttle: 0.7, elevator: 0, aileron: 0, rudder: t < 0.6 ? 0.9 : 0,
  }),

  "Turn at 45° and hold your height": (s) => ({
    throttle: 1,
    aileron: clamp((0.80 - s.phi) * 3 - s.p * 2.5, -1, 1),
    elevator: clamp(0.30 - s.gamma * 9 - s.q * 1.6, -1, 1),
  }),

  "Close the loop": (s, t, ctx) => {
    // Climb to the target, then hand it over — which is what the brief says.
    if (s.h < 55) return { throttle: 1, elevator: clamp(0.35 - s.q * 1.5, -1, 1) };
    ctx.wantAP = true;
    const err = ctx.target - s.h;
    const wantTheta = clamp(err * 0.02, -0.16, 0.16);
    return { throttle: 0.8, elevator: clamp((wantTheta - s.theta) * 4 - s.q * 2.2, -1, 1) };
  },
};

let failures = 0;
console.log(`checkride — ${CHECKRIDE.length} items\n`);

for (const [i, item] of CHECKRIDE.entries()) {
  const pilot = PILOTS[item.name];
  if (!pilot) { console.log(`  FAIL  ${item.name} — no test pilot written`); failures++; continue; }

  let s = item.start();
  const ctx = { vs: stallSpeed(), target: item.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
  let passedAt = null, peakN = 0;

  for (let t = 0; t < 90 && passedAt === null; t += DT) {
    const c = { throttle: 0, elevator: 0, aileron: 0, rudder: 0, ...pilot(s, t, ctx) };
    ctx.elevator = c.elevator; ctx.aileron = c.aileron; ctx.rudder = c.rudder;
    const r = step(s, c, DT);
    s = r.state;
    peakN = Math.max(peakN, r.forces.n);
    // The autopilot item counts its own hold time, as the sandbox does.
    if (ctx.wantAP) ctx.apHeld = Math.abs(ctx.target - s.h) < 6 ? ctx.apHeld + DT : 0;
    item.track?.(s, r.forces, ctx, DT);
    if (item.goal.test(s, r.forces, ctx)) passedAt = t;
  }

  const tag = passedAt === null ? "FAIL " : "pass ";
  if (passedAt === null) failures++;
  console.log(
    `  ${tag} ${String(i + 1).padStart(2)}. ${item.name.padEnd(34)}` +
    (passedAt === null ? "unreachable in 90s" : `at ${passedAt.toFixed(1)}s`) +
    `   (peak ${peakN.toFixed(2)} g)`);
}

console.log();
if (failures) {
  console.error(`${failures} checkride item(s) cannot be passed. Fix before shipping.`);
  process.exit(1);
}
console.log("all checkride items reachable");
