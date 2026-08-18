/* Every checkride item must be reachable. An item nobody can pass is worse than
 * no item, so each one is flown here by a crude autopilot standing in for a
 * learner who understands the chapter — not an expert stick, just someone doing
 * the obvious thing the brief asks for. Run with `npm run check:exam`.
 *
 * Both rides, and the aeroplane comes off the ITEM. This script used to call
 * step(s, c, DT) and stallSpeed() bare, which is the Cessna, because when it was
 * written the Cessna was the only aircraft there was. Left that way it would
 * have flown Part II's fighter items in a 172 — nine g items in an aeroplane
 * with no G limiter, a corner item in one with no corner — and reported PASS,
 * which is worse than reporting FAIL. `ac` is threaded through every call below
 * for that reason, and the same goes for the bandit: a task with an opponent is
 * integrated here exactly as sandbox.js integrates it, same step(), same law,
 * same relative() feeding ctx.geo, or the goal is being judged against a
 * geometry that never happened.
 */

import { CHECKRIDE, CHECKRIDE_II, relative } from "../src/sim/tasks.js";
import { step, stallSpeed, initialState, AIRCRAFT, G, RHO } from "../src/sim/flight-model.js";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const DT = 1 / 120;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* Hold height at a commanded bank, in whatever aeroplane it is handed — the
   same solve holdTurn() does for the bandit, and the backbone of every Part II
   pilot below. A fighter needs the feed-forward: feedback alone leaves a
   standing flight path error, which at nine g means flying into the ground. */
function level(s, ac, wantPhi, throttle) {
  const CLneed = (ac.m * G) / (Math.cos(clamp(wantPhi, -1.45, 1.45)) * 0.5 * RHO * s.V * s.V * ac.S);
  const a = (Math.min(CLneed, ac.CLmax) - ac.CL0) / ac.CLa;
  const ff = (ac.Cm0 + ac.Cma * a) / (ac.Cmde * ac.dEmax);
  return {
    throttle,
    elevator: clamp(ff - s.gamma * 9 - s.q * 1.6, -1, 1),
    aileron: clamp((wantPhi - s.phi) * 3 - s.p * 2.5, -1, 1),
    rudder: 0,
  };
}

/* Fly at a point d metres behind the bandit rather than at the bandit: a lag
   curve, arrived at by aiming somewhere he is going to be rather than where he
   is, with the speed set by how far there is left to go. */
function toSix(s, ctx, ac, d) {
  const b = ctx.bandit;
  if (!b) return level(s, ac, 0, 1);
  const tx = b.x - d * Math.cos(b.psi), ty = b.y - d * Math.sin(b.psi);
  const err = wrap(Math.atan2(ty - s.y, tx - s.x) - s.psi);
  const dist = Math.hypot(tx - s.x, ty - s.y);
  const thr = clamp(0.12 + (clamp(b.V + dist * 0.16, 120, 300) - s.V) * 0.05, 0, 1);
  return level(s, ac, clamp(err * 3, -1.4, 1.4), thr);
}

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

  /* ── Part II ── */

  /* Close on the throttle, then take it out again: the overtake is set with
     the engine, and the last of it has to come off before the range will sit
     still. Nothing here touches the geometry — he is straight and level. */
  "Stop the range": (s, t, ctx, ac) => {
    const g = ctx.geo;
    if (!g) return level(s, ac, 0, 1);
    const wantV = g.range > 2000 ? 250 : g.range > 1300 ? 205 : 180;
    return level(s, ac, clamp(g.ata * 2, -1, 1), clamp(0.11 + (wantV - s.V) * 0.05, 0, 1));
  },

  "Take his rear quarter and keep it": (s, t, ctx, ac) => toSix(s, ctx, ac, 650),

  /* Chapter 15, done the only way it can be: throw the speed away first. Full
     back stick throughout — the limiter is what decides the g, not the stick —
     and the throttle stays shut until the corner is in reach. */
  "Twenty-five degrees a second": (s) => ({
    throttle: s.V > 205 ? 0 : 1,
    elevator: 1,
    aileron: clamp((1.5 - s.phi) * 3 - s.p * 2.5, -1, 1),
    rudder: 0,
  }),

  /* Bank to the limiter and hold the height while it bleeds: the level turn is
     the whole point, because energy spent going downhill is not spent. */
  "Present the bill": (s, t, ctx, ac) => level(s, ac, 1.45, 1),

  /* Turn until he sits 50° off the nose and then STOP turning, which is the
     half of a crank that is easy to describe and easy to fly straight past. */
  "Crank": (s, t, ctx, ac) => {
    if (!ctx.bandit) return level(s, ac, 0, 1);
    const off = wrap(Math.atan2(ctx.bandit.y - s.y, ctx.bandit.x - s.x) - s.psi);
    return level(s, ac, clamp((off + 0.873) * 3, -1.2, 1.2), 0.75);
  },
};

/* Fly one item for 90 seconds and report when — if ever — it passed. The order
   inside the loop is sandbox.js's order exactly: step both aeroplanes, derive
   the geometry, run track(), then ask the goal. Anything else measures a frame
   the reader never saw. */
function fly(item, pilot, secs = 90) {
  const ac = item.ac ?? AIRCRAFT;
  const bac = item.bandit ? (item.bandit.ac ?? ac) : null;
  let s = item.start ? item.start() : initialState();
  let bs = item.bandit ? item.bandit.start() : null;
  const ctx = { vs: stallSpeed(ac), target: item.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
  let passedAt = null, peakN = 0;

  for (let t = 0; t < secs && passedAt === null; t += DT) {
    const c = { throttle: 0, elevator: 0, aileron: 0, rudder: 0, ...pilot(s, t, ctx, ac) };
    ctx.elevator = c.elevator; ctx.aileron = c.aileron; ctx.rudder = c.rudder;
    const r = step(s, c, DT, ac);
    s = r.state;
    if (bs) {
      bs = step(bs, item.bandit.law(bs, bac, DT), DT, bac).state;
      ctx.bandit = bs;
      ctx.geo = relative(s, bs);
    }
    peakN = Math.max(peakN, r.forces.n);
    // The autopilot item counts its own hold time, as the sandbox does.
    if (ctx.wantAP) ctx.apHeld = Math.abs(ctx.target - s.h) < 6 ? ctx.apHeld + DT : 0;
    item.track?.(s, r.forces, ctx, DT);
    if (item.goal.test(s, r.forces, ctx)) passedAt = t;
  }
  return { passedAt, peakN };
}

let failures = 0;

for (const [title, ride] of [["checkride", CHECKRIDE], ["checkride II — the fighter", CHECKRIDE_II]]) {
  console.log(`${title} — ${ride.length} items\n`);
  for (const [i, item] of ride.entries()) {
    const pilot = PILOTS[item.name];
    if (!pilot) { console.log(`  FAIL  ${item.name} — no test pilot written`); failures++; continue; }

    const { passedAt, peakN } = fly(item, pilot);
    if (passedAt === null) failures++;
    console.log(
      `  ${passedAt === null ? "FAIL " : "pass "} ${String(i + 1).padStart(2)}. ${item.name.padEnd(34)}` +
      (passedAt === null ? "unreachable in 90s" : `at ${passedAt.toFixed(1)}s`) +
      `   (peak ${peakN.toFixed(2)} g)`);
  }
  console.log();
}

/* And the other half of reachable, which is the half that bites: an item whose
 * opening state already satisfies it, or which latches on a drift nobody
 * commanded. Two sandbox tasks in this project were built, flown and thrown
 * away for exactly that, so every Part II item is flown once more by a pilot
 * who touches nothing at all, and must NOT pass.
 *
 * Part I is exempt rather than excused: "Prove it is stable" asks the aircraft
 * to right itself with the stick centred, so a pilot doing nothing passing it
 * is the item working. That is a property of that item, not a licence, which is
 * why the guard runs over the ride where nothing is supposed to be free.
 */
for (const item of CHECKRIDE_II) {
  const { passedAt } = fly(item, () => ({}));
  if (passedAt !== null) {
    console.log(`  FAIL  ${item.name} — passes with hands off the controls, at ${passedAt.toFixed(1)}s`);
    failures++;
  }
}
if (!failures) console.log("hands off the controls, nothing in part II latches\n");

if (failures) {
  console.error(`${failures} checkride item(s) cannot be passed. Fix before shipping.`);
  process.exit(1);
}
console.log("all checkride items reachable");
