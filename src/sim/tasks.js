/* What each lesson's sandbox asks you to do.
 *
 * Pure data and formatting — no Three.js, no DOM. lesson.js imports it to know
 * which chapters carry a sandbox without dragging the 3D engine into every
 * page, and sandbox.js imports it to configure the one scene it builds.
 *
 * A chapter only appears here if the shipped flight model can demonstrate its
 * idea HONESTLY. That rule has not moved; what it rules out has. The model is
 * no longer a longitudinal point mass — it carries bank, heading, sideslip, roll
 * rate and yaw rate as well as a full pitch moment balance, which is why all
 * twelve Part I chapters have an entry below and MISSING is empty. The rule
 * still decides the next one: a sandbox that mimes physics it is not computing
 * would be the worst thing this project could ship, so a chapter whose idea the
 * model cannot produce gets no sandbox and the reason goes in MISSING.
 *
 * An entry is: `brief`, `arrows`, `readout` of `{k, label, get}`, and optionally
 * `controls` (default throttle + elevator), `start` (default on the runway),
 * `track`, `autopilot`, `goal` of `{test, done}` — `ac`, the aircraft from
 * flight-model.js this chapter is flown in — and `bandit`, a second aeroplane to
 * fly against. Omitting `ac` means AIRCRAFT, the Cessna, which is every entry in
 * this file: the sandbox reads the airframe, its arrow scale, its stall speed
 * and its control throws off that one field.
 * CHECKRIDE items below take the same shape, plus `ch` and `name`.
 */

import { AIRCRAFT, FIGHTER, G, RHO, initialState, trim, stallSpeed } from "./flight-model.js";

const AC_M = AIRCRAFT.m;
/* Corner velocity — the slowest speed at which the airframe's own G limit is
   reachable, so the speed at which turn rate peaks. Derived, not typed: it is
   exactly the 1-g stall speed scaled by the square root of the limit, and it
   moves on its own if the aircraft's constants are ever edited. */
const V_CORNER = stallSpeed(FIGHTER, FIGHTER.nMax);
const kt = (v) => `${Math.round(v * 1.944)} kt`;
const ft = (v) => `${Math.round(v * 3.281)} ft`;
const N = (v) => `${Math.round(v).toLocaleString()} N`;
const deg = (r) => `${(r * 57.2958).toFixed(1)}°`;
const num = (v, d = 2) => v.toFixed(d);
/* Feet inside a mile and miles beyond it, which is how a range is actually
   called. One number, two units, because 30 000 ft is not a range anybody says. */
const rng = (m) => (m < 1852 ? ft(m) : `${(m / 1852).toFixed(1)} nm`);
/* Specific energy: height plus speed expressed as the height that speed could
   buy. One number for the two currencies chapter 17 is about. */
const es = (s) => s.h + (s.V * s.V) / (2 * G);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ── the bandit ────────────────────────────────────────────────────────────
 *
 * Three of Part II's chapters — pursuit, one-circle against two-circle, and the
 * overshoot — are about the geometry BETWEEN two aeroplanes, and geometry needs
 * two of them. A chapter that wants an opponent declares
 *
 *     bandit: { start, law, ac }        // ac optional, defaults to the task's
 *
 * and the sandbox integrates that state with the SAME step() the player goes
 * through: same aircraft data, same drag, same attitude clamps, same G limiter.
 * It is not a scripted path, not an animated dummy and not a position replayed
 * from a table — if the bandit turns, it turns because a moment turned it, and
 * if it asks for more lift than the airframe allows it gets the airframe's
 * answer: nine g in the fighter, and in the Cessna a bank clamp and no limiter
 * at all, because that is what each of those aeroplanes actually has. That is
 * the rule at the top of this file applied to the second aeroplane rather than
 * only to the first.
 *
 * A task with no `bandit` field builds none of this, which is every Part I
 * chapter and every checkride item.
 *
 * The law is handed the aeroplane it is flying — `law(state, ac, dt)` — so it
 * cannot quietly read another aircraft's constants. That is the AC_M mistake
 * above, made structurally impossible rather than warned about twice.
 */

/* Hold a bank, hold height, hold speed: the whole of the bandit's mind, and
 * deliberately so. Bank 0 is "fly straight and level"; −78° is "hold a 5 g level
 * turn to the left", because a level turn pulls 1/cos φ. A predictable opponent
 * is what makes a lesson — the reader has to be able to say what the bandit will
 * do next and then watch the geometry answer. Unpredictable is for a game.
 *
 * The speed hold is an attempt, not a promise. Past the limiter an aeroplane
 * bleeds energy faster than full throttle can replace it, so a hard-banked
 * bandit slows down and descends however wide the throttle is. That is chapter
 * 17's subject and it is allowed to happen here rather than be papered over.
 */
export const holdTurn = (bankDeg, V) => {
  const want = (bankDeg * Math.PI) / 180;
  return (s, ac) => {
    /* Feed-forward: the elevator that trims THIS aeroplane at the angle of
       attack this bank asks for, at the speed it is doing now — the same solve
       trim() does at 1 g, at 1/cos φ instead. Feedback alone would leave a
       standing flight path error, which for a fighter means descending all
       lesson. Saturating at CLmax is the honest answer to a bank it cannot
       hold height at: it pulls everything it has and still comes down. */
    const CLneed = (ac.m * G) / (Math.cos(want) * 0.5 * RHO * s.V * s.V * ac.S);
    const a = (Math.min(CLneed, ac.CLmax) - ac.CL0) / ac.CLa;
    const ff = (ac.Cm0 + ac.Cma * a) / (ac.Cmde * ac.dEmax);
    return {
      throttle: clamp(0.5 + (V - s.V) * 0.05, 0, 1),
      elevator: clamp(ff - s.gamma * 9 - s.q * 1.6, -1, 1),
      aileron: clamp((want - s.phi) * 3 - s.p * 2.5, -1, 1),
      rudder: 0,
    };
  };
};

/* Where the two aeroplanes stand to each other. Chapter 13's three numbers, plus
 * the one the pursuit chapter turns on, all falling out of the two integrated
 * states and nothing else:
 *
 *   range    metres between them, in three dimensions.
 *   aspect   the angle at the BANDIT, from his tail round to us: 0° is his dead
 *            six, 180° is head-on. It says nothing about where our nose points,
 *            which is exactly why it is a separate number from ata.
 *   closure  how fast the range is shrinking, m/s, positive when closing. Taken
 *            from the two velocity vectors rather than differenced frame to
 *            frame, so it is exact and does not jitter with the frame rate.
 *   ata      angle off OUR nose to him, signed: positive he is to our right.
 *            Pure pursuit is ata 0, lead is pulling past it, lag is short of it.
 *
 * Two directions, not one, and the difference between them is the whole of the
 * pursuit chapter: an aeroplane points where θ says and travels where γ says,
 * and the angle between the two is the angle of attack. So the angles that are
 * about POINTING — aspect and ata — are measured off the nose, and closure,
 * which is about GOING, is measured off the flight path. Reading both off the
 * flight path would have quietly reported lag pursuit as pure whenever the pull
 * was hard, which is precisely the case the chapter is about.
 *
 * Both directions neglect sideslip: β yaws the body away from the flight path
 * and neither expression carries it. In coordinated flight that is a degree or
 * two, and the model's own position integration ignores it as well.
 */
const along = (pitch, s) => [
  Math.cos(pitch) * Math.cos(s.psi),
  Math.cos(pitch) * Math.sin(s.psi),
  Math.sin(pitch),
];
const nose = (s) => along(s.theta, s);          // where it points
const path = (s) => along(s.gamma, s);          // where it goes
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const acos = (v) => Math.acos(clamp(v, -1, 1));

export function relative(us, them) {
  const d = [them.x - us.x, them.y - us.y, them.h - us.h];
  const range = Math.hypot(d[0], d[1], d[2]);
  const u = range > 1e-6 ? d.map((v) => v / range) : [1, 0, 0];
  const nu = nose(us), nt = nose(them);
  return {
    range,
    aspect: acos(dot(u, nt)),
    closure: us.V * dot(path(us), u) - them.V * dot(path(them), u),
    // Which side he is on, from the horizontal cross product. Never 0, so a
    // bandit dead ahead reads +0.0° rather than flickering sign.
    ata: acos(dot(u, nu)) * (Math.sign(nu[0] * u[1] - nu[1] * u[0]) || 1),
  };
}

/* Chapter 13's three numbers as readout rows, to spread into a bandit chapter:
   `readout: [...GEOMETRY, { … }]`. They read `ctx.geo`, which the sandbox fills
   from relative() every frame, and say so when there is no bandit rather than
   printing a confident NaN. */
export const GEOMETRY = [
  { k: "", label: "Range", get: (s, f, ctx) => (ctx.geo ? rng(ctx.geo.range) : "—") },
  { k: "angle", label: "Aspect", get: (s, f, ctx) => (ctx.geo ? deg(ctx.geo.aspect) : "—") },
  { k: "", label: "Closure", get: (s, f, ctx) => (ctx.geo ? kt(ctx.geo.closure) : "—") },
];

export const TASKS = {
  "four-forces": {
    brief: "Open the throttle. Nothing leaves the ground until the lift arrow is longer than the weight arrow.",
    arrows: ["lift", "weight", "thrust", "drag"],
    readout: [
      { k: "lift", label: "Lift", get: (s, f) => N(f.L) },
      { k: "weight", label: "Weight", get: (s, f) => N(f.W) },
      { k: "thrust", label: "Thrust", get: (s, f) => N(f.T) },
      { k: "drag", label: "Drag", get: (s, f) => N(f.D) },
    ],
    goal: { test: (s) => !s.onGround && s.h > 30, done: "Airborne — lift beat weight." },
  },

  "how-lift-works": {
    brief: "Lift follows the square of speed. Get airborne, then trade speed for angle and watch CL climb to hold the same lift.",
    arrows: ["lift", "weight"],
    readout: [
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "angle", label: "Angle of attack", get: (s, f) => deg(f.alpha) },
      { k: "lift", label: "C∟", get: (s, f) => num(f.CL) },
      { k: "lift", label: "Lift", get: (s, f) => N(f.L) },
    ],
    goal: { test: (s, f) => !s.onGround && f.CL > 1.2, done: "CL past 1.2 — slow and steep, same lift." },
  },

  "airfoil-and-stall": {
    brief: "Get up, then keep pulling. The lift curve is a straight line right up to the cliff — find the edge of it.",
    arrows: ["lift", "weight"],
    readout: [
      { k: "angle", label: "Angle of attack", get: (s, f) => deg(f.alpha) },
      { k: "", label: "Critical α", get: () => "16.0°" },
      { k: "lift", label: "C∟", get: (s, f) => num(f.CL) },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
    ],
    goal: { test: (s, f) => !s.onGround && f.alpha > 0.28, done: "Stalled. The wing stopped following the air." },
  },

  drag: {
    brief: "Two kinds of drag pull opposite ways with speed. Find the airspeed where they cross — that is where total drag is least.",
    arrows: ["thrust", "drag"],
    readout: [
      { k: "drag", label: "Parasite", get: (s, f) => N(f.Dp) },
      { k: "lift", label: "Induced", get: (s, f) => N(f.Di) },
      { k: "", label: "Total drag", get: (s, f) => N(f.D) },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
    ],
    goal: {
      test: (s, f) => !s.onGround && s.V > 20 && Math.abs(f.Dp - f.Di) / Math.max(1, f.D) < 0.06,
      done: "Parasite equals induced — this is minimum drag.",
    },
  },

  "flight-envelope": {
    brief: "The low-speed edge of the envelope is the stall. Ease back until you are flying just above it — and notice how little is left.",
    arrows: ["lift", "weight"],
    readout: [
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "", label: "Stall speed", get: (s, f, ctx) => kt(ctx.vs) },
      { k: "angle", label: "Margin", get: (s, f, ctx) => kt(Math.max(0, s.V - ctx.vs)) },
      { k: "", label: "Altitude", get: (s) => ft(s.h) },
    ],
    goal: {
      test: (s, f, ctx) => !s.onGround && s.V > ctx.vs && s.V < ctx.vs * 1.12,
      done: "Inside 12% of the stall. That is the edge.",
    },
  },

  "equations-of-motion": {
    brief: "Every number on this panel is a state the model integrates. There is nothing else — this is the whole aircraft.",
    arrows: ["lift", "weight", "thrust", "drag"],
    readout: [
      { k: "", label: "V — airspeed", get: (s) => `${s.V.toFixed(1)} m/s` },
      { k: "angle", label: "γ — flight path", get: (s) => deg(s.gamma) },
      { k: "moment", label: "θ — pitch", get: (s) => deg(s.theta) },
      { k: "", label: "h — height", get: (s) => `${s.h.toFixed(0)} m` },
    ],
    goal: null,
  },

  "axes-and-controls": {
    brief: "Three controls, three axes. Move one at a time and watch which number changes — aileron rolls, elevator pitches, rudder yaws.",
    controls: ["throttle", "elevator", "aileron", "rudder"],
    arrows: ["lift", "weight"],
    readout: [
      { k: "moment", label: "Roll φ", get: (s) => deg(s.phi) },
      { k: "angle", label: "Pitch θ", get: (s) => deg(s.theta) },
      { k: "lift", label: "Yaw ψ", get: (s) => deg(s.psi) },
      { k: "drag", label: "Sideslip β", get: (s) => deg(s.beta) },
    ],
    track: (s, f, ctx) => {
      if (s.onGround) return;
      if (Math.abs(s.phi) > 0.17) ctx.rolled = true;      // 10°
      if (Math.abs(s.q) > 0.05) ctx.pitched = true;
      if (Math.abs(s.beta) > 0.05) ctx.yawed = true;
    },
    goal: {
      test: (s, f, ctx) => ctx.rolled && ctx.pitched && ctx.yawed,
      done: "All three axes flown. That is the whole control set.",
    },
  },

  "lateral-modes": {
    brief: "Kick the rudder and let go. The nose and the wings will chase each other for a few cycles — that is Dutch roll, and it damps itself out.",
    controls: ["throttle", "elevator", "aileron", "rudder"],
    arrows: ["lift", "weight"],
    readout: [
      { k: "drag", label: "Sideslip β", get: (s) => deg(s.beta) },
      { k: "moment", label: "Roll rate p", get: (s) => `${(s.p * 57.2958).toFixed(1)}°/s` },
      { k: "lift", label: "Yaw rate r", get: (s) => `${(s.r * 57.2958).toFixed(1)}°/s` },
      { k: "", label: "Swings", get: (s, f, ctx) => `${ctx.swings || 0}` },
    ],
    /* Sideslip reversing back and forth with the controls released IS the mode.
       Counting the reversals is counting the oscillation. */
    track: (s, f, ctx) => {
      if (s.onGround) return;
      const quiet = Math.abs(ctx.rudder || 0) < 0.06 && Math.abs(ctx.aileron || 0) < 0.06;
      if (!quiet) { ctx.bSign = 0; return; }
      if (Math.abs(s.beta) < 0.012) return;
      const sign = Math.sign(s.beta);
      if (ctx.bSign && ctx.bSign !== sign) ctx.swings = (ctx.swings || 0) + 1;
      ctx.bSign = sign;
    },
    goal: {
      test: (s, f, ctx) => (ctx.swings || 0) >= 3,
      done: "Three swings, hands off — the fin is damping it for you.",
    },
  },

  "turning-flight": {
    brief: "Roll into a bank and hold your height. Only the upright part of lift fights weight now, so the wing has to pull harder — watch the load factor.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    readout: [
      { k: "moment", label: "Bank", get: (s) => deg(s.phi) },
      { k: "lift", label: "Load factor", get: (s, f) => `${f.n.toFixed(2)} g` },
      { k: "", label: "1 / cos φ", get: (s) => `${(1 / Math.cos(s.phi)).toFixed(2)} g` },
      { k: "angle", label: "Turn rate", get: (s, f) =>
          `${(s.V > 5 ? (f.L * Math.sin(s.phi)) / (AC_M * s.V) * 57.2958 : 0).toFixed(1)}°/s` },
    ],
    track: (s, f, ctx) => {
      if (!s.onGround && Math.abs(s.phi) > 0.7 && f.n > 1.25 && Math.abs(s.gamma) < 0.06)
        ctx.held = (ctx.held || 0) + 1;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 120,
      done: "Forty degrees of bank, height held, and the wing pulling 1.3g for it.",
    },
  },

  /* Both of these exist because pitch became a moment balance. They cannot be
     mimed: what you watch is the aircraft's own response to being disturbed. */
  "static-stability": {
    brief: "Get flying, then push or pull and let the stick go. Nothing is holding the nose — the moment brings it back on its own.",
    arrows: ["lift", "weight"],
    readout: [
      { k: "angle", label: "Angle of attack", get: (s, f) => deg(f.alpha) },
      { k: "moment", label: "Cm", get: (s, f) => num(f.Cm, 3) },
      { k: "moment", label: "Moment", get: (s, f) => `${Math.round(f.M).toLocaleString()} N·m` },
      { k: "", label: "Returns", get: (s, f, ctx) => `${ctx.returns || 0}` },
    ],
    /* A return is the nose crossing back through level with the stick centred:
       the aircraft undoing a disturbance nobody is correcting. */
    track: (s, f, ctx, dt) => {
      const centred = Math.abs(ctx.elevator) < 0.06;
      if (!s.onGround && centred && Math.abs(s.theta) > 0.06) ctx.disturbed = true;
      if (!s.onGround && centred && ctx.disturbed && Math.abs(s.theta) < 0.02) {
        ctx.returns = (ctx.returns || 0) + 1;
        ctx.disturbed = false;
      }
    },
    goal: { test: (s, f, ctx) => (ctx.returns || 0) >= 2, done: "Twice back to level, unaided. That is Cmα < 0." },
  },

  "longitudinal-modes": {
    brief: "Two oscillations live in here at once. Rap the stick and let go for the fast one; then trim, add speed, and wait a full minute for the slow one.",
    arrows: ["lift", "weight"],
    readout: [
      { k: "moment", label: "Pitch rate q", get: (s) => `${(s.q * 57.2958).toFixed(1)}°/s` },
      { k: "angle", label: "Pitch θ", get: (s) => deg(s.theta) },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "lift", label: "Seen", get: (s, f, ctx) => `${ctx.fast ? "fast" : "—"} / ${ctx.slow ? "slow" : "—"}` },
    ],
    /* The fast mode is ONE clean pitch-rate reversal inside a second or so — the
       nose goes up and comes straight back down. Asking for two sign flips found
       nothing, because the second crossing has already damped below any sensible
       threshold. The slow mode is airspeed swinging back and forth over tens of
       seconds at nearly constant attitude, so it is counted separately and can
       never be mistaken for the fast one: a phugoid reverses q about every 13s,
       far outside the 2.5s window below. */
    track: (s, f, ctx, dt) => {
      if (s.onGround) return;
      ctx.t = (ctx.t || 0) + dt;

      if (Math.abs(s.q) > 0.02) {
        const sign = Math.sign(s.q);
        if (ctx.qSign && ctx.qSign !== sign && ctx.t - ctx.qAt < 2.5) ctx.fast = true;
        if (ctx.qSign !== sign) { ctx.qSign = sign; ctx.qAt = ctx.t; }
      }

      const dV = s.V - (ctx.lastV ?? s.V);
      if (ctx.lastDV !== undefined && Math.sign(dV) !== Math.sign(ctx.lastDV)
          && Math.abs(s.V - (ctx.vRef ?? s.V)) > 2 && ctx.t - (ctx.lastVFlip ?? -99) > 6) {
        ctx.vFlips = (ctx.vFlips || 0) + 1;
        ctx.lastVFlip = ctx.t;
        if (ctx.vFlips >= 2) ctx.slow = true;
      }
      if (Math.abs(dV) > 1e-6) ctx.lastDV = dV;
      ctx.lastV = s.V;
      ctx.vRef ??= s.V;
    },
    goal: { test: (s, f, ctx) => ctx.fast && ctx.slow, done: "Both modes seen — short period and phugoid, same aeroplane." },
  },

  "control-and-autopilot": {
    brief: "Get to 150 ft, then hand it to the autopilot. It is a loop: measure the error, move the elevator, measure again.",
    arrows: ["lift", "weight"],
    autopilot: { target: 45 },       // m — hold this height
    readout: [
      { k: "", label: "Altitude", get: (s) => ft(s.h) },
      { k: "", label: "Target", get: (s, f, ctx) => ft(ctx.target) },
      { k: "drag", label: "Error", get: (s, f, ctx) => `${(s.h - ctx.target).toFixed(1)} m` },
      { k: "thrust", label: "Elevator", get: (s, f, ctx) => deg(ctx.elevator * 0.262) },
    ],
    goal: {
      test: (s, f, ctx) => ctx.apHeld > 8,
      done: "Held for eight seconds without you touching it.",
    },
  },

  /* ── Part II ────────────────────────────────────────────────────────────
     The first entry in this file with an opponent in it. The bandit holds one
     steady turn and nothing else, which is the point: a predictable opponent is
     what lets a reader predict, be wrong, and find out why. */
  "pursuit-curves": {
    ac: FIGHTER,
    brief:
      "He is a mile and a half ahead, turning left, and he will not stop. You are faster. " +
      "Point straight at him and all that speed becomes closure you cannot spend — you " +
      "arrive with too much of it and sail out in front. Point BEHIND him instead. Get " +
      "into his rear quarter, inside half a mile, and stay there for five seconds.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    /* Deliberately outside the goal in BOTH terms at t=0: too far out, and not
       yet in his rear quarter. A task whose opening state already satisfies it
       is a cutscene, not an exercise. */
    start: () => ({ ...trim(250, FIGHTER).state, h: 4000 }),
    /* A two-g level turn: hard enough that pure pursuit genuinely fails, gentle
       enough to be holdable, so what defeats the reader is their own choice of
       pursuit curve rather than the bandit simply out-flying them. */
    bandit: {
      start: () => ({ ...trim(180, FIGHTER).state, h: 4000, x: 2600, y: 1100, psi: 1.9 }),
      law: holdTurn(-60, 180),
    },
    readout: [
      ...GEOMETRY,
      /* The number that names the pursuit curve you are actually flying, rather
         than the one you think you are: zero is pure, past it is lead, short of
         it is lag. */
      { k: "angle", label: "Off our nose", get: (s, f, ctx) => (ctx.geo ? deg(ctx.geo.ata) : "—") },
    ],
    /* The goal is STAYING, not arriving, and that is deliberate — it is where
       the two pursuit curves actually differ here. Flown against this bandit,
       pointing straight at him reaches his rear quarter slightly SOONER than
       lagging does; it just cannot hold it, because the closure that got you
       there carries you through. Measured on this task: pure pursuit gets
       closest at 667 m and holds about five seconds; lag arrives later, no
       nearer, and holds nearly nine. So the test is a long continuous stretch,
       which rewards the curve that keeps the geometry rather than the one that
       wins the race to it.

       One honest caveat, and the `done` text says it rather than hiding it:
       pointing straight at him and pulling the THROTTLE back also passes. That
       is not a loophole. The quantity being controlled is closure, and a reader
       may control it with the nose or with the engine — those are the same
       problem answered two ways, and chapter 17 is where the second one gets
       its own chapter. Claiming only lag works would be a nicer lesson and a
       false one. */
    track: (s, f, ctx) => {
      const g = ctx.geo;
      if (!g) return;
      const behind = g.aspect < 1.05;                   // his rear quarter, 60°
      const close = g.range > 200 && g.range < 1200;
      if (!s.onGround && behind && close) ctx.held = (ctx.held || 0) + 1;
      else ctx.held = 0;                                // one continuous stretch
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 360,
      done: "Six unbroken seconds in his rear quarter. What you were really controlling was closure — with the nose, with the throttle, or both. Point straight at him at full power and you arrive sooner and leave immediately.",
    },
  },

  /* Everything about this one is read off `ac`, so the only thing that makes it
     a fighter is that one field. */
  "rate-and-radius": {
    ac: FIGHTER,
    brief:
      "Get to about 330 knots and pull as hard as it will let you. That speed is the corner — " +
      "the slowest you can be and still reach the airframe's 9 g limit — and it is where the " +
      "nose comes round fastest. Go faster and the limiter still gives you 9 g, but the circle " +
      "gets wider and the rate falls.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    /* Airborne and already fast. A corner-speed task begun on the runway is
       four minutes of accelerating before the lesson starts. */
    start: () => ({ ...trim(150, FIGHTER).state, h: 3000 }),
    readout: [
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "", label: "Corner", get: () => `${Math.round(V_CORNER * 1.944)} kt` },
      { k: "lift", label: "Load factor", get: (s, f) => `${f.n.toFixed(2)} g` },
      /* FIGHTER.m, never the module-level AC_M — that constant is the Cessna's
         mass, and borrowing it here reports a turn rate about ten times too
         high while looking entirely plausible. */
      { k: "angle", label: "Turn rate", get: (s, f) =>
          `${(s.V > 5 ? (f.L * Math.sin(s.phi)) / (FIGHTER.m * s.V) * 57.2958 : 0).toFixed(1)}°/s` },
    ],
    /* Latches on reaching it, not on holding it. A 9 g turn at corner is NOT
       sustainable — drag there is roughly two and a half times the thrust
       available, so the aeroplane is decelerating out of the condition the
       whole time it is in it. That unsustainability is chapter 17's subject;
       asking a reader to hold it would be asking for something the physics
       forbids, and the goal would never latch. One second is the achievement. */
    track: (s, f, ctx) => {
      const nearCorner = Math.abs(s.V - V_CORNER) < 18;      // ±35 kt
      if (!s.onGround && nearCorner && f.n > 8) ctx.held = (ctx.held || 0) + 1;
      else ctx.held = 0;                                      // must be one continuous pull
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 60,
      done: "That is the corner — the fastest the nose will ever come round. Note how quickly you fall out of it.",
    },
  },
};

/* Chapters with no sandbox, and the physics each would need. Empty: every
   chapter above has one. It stays so the rule it encodes stays — a chapter
   without honest physics behind it gets no sandbox, and the reason goes here,
   next to the thing it explains, rather than into a commit message nobody
   will read. */
export const MISSING = {
  /* The model computes Ps perfectly well — chapter 17's contour plate is drawn
     from it and is correct. What it cannot host is an EXERCISE, and the reason
     is worth writing down because the obvious version looks fine until it is
     flown.

     "Come out of a turn faster than you went in" passes at any bank whatsoever:
     this aeroplane has thrust to spare almost everywhere, so left at full power
     it climbs or accelerates out of anything. Pinning the height to force the
     trade only moves the problem — it then runs to Mach 1.8, and there is no
     compressibility in this model, so everything past about Mach 0.9 is a
     number rather than a fact.
     "Hold the sustained turn", the honest version, fails for a different
     reason: Ps = 0 is an UNSTABLE equilibrium going up. At 4.6 g it sits at
     262 kt, and at 292 kt the same bank is already +34 m/s, so any excess
     accelerates you away from the very condition you are trying to hold. It is
     a knife-edge balance of throttle against bank on three sliders and a fixed
     camera — frustrating rather than instructive.

     Both were built and flown before being rejected, which is how the numbers
     above are known. What it would need: a thrust model with a transonic rise,
     so the aeroplane has a top speed for an honest reason instead of running
     out of graph. */
  "energy-rate":
    "Ps = 0 is an unstable equilibrium in this model, and the aeroplane has no " +
    "transonic drag rise to stop it running away. Needs a thrust and drag model " +
    "that is credible above Mach 0.9.",

  /* The chapter's whole claim is that WHICH fight favours you depends on your
     aeroplane against theirs. Posing it needs two airframes with genuinely
     different best numbers — one that would rather fight for radius, one that
     would rather fight for rate. This repo has a Cessna and a fighter, and a
     Cessna at a merge is not a lesson. Flown fighter against fighter both
     circles are symmetric, neither choice favours anybody, and the exercise
     would quietly teach that the decision does not matter — which is the
     opposite of the chapter. */
  "one-or-two-circle":
    "Both aeroplanes would be the same aeroplane, so neither fight favours " +
    "anyone and the chapter's actual claim cannot be posed. Needs a second " +
    "fighter with a different rate/radius balance.",

  /* Built, flown, and thrown away — twice, in two different forms. Against one
     bandit holding a steady turn, "recover from the overshoot" collapses into
     "turn hard": a pilot holding full aileron and full back stick and nothing
     else passed it. Defending an overshoot properly needs the BANDIT to be
     attacking — a control law that pursues, overshoots, and can be reversed on
     — which is a different and much larger machine than holdTurn, and one whose
     own honesty would then need proving. Causing an overshoot on its own is
     achievable but is already what chapter 14's task punishes you for, so it
     would teach by repetition rather than by contrast. */
  overshoots:
    "Against a bandit that only holds a steady turn, recovering from an " +
    "overshoot reduces to turning hard, which chapter 14 already rewards. " +
    "Needs a bandit control law that attacks rather than orbits.",

  /* Not a physics limit — a duplication one. The model produces all three
     numbers and the sandbox already displays them; what chapter 13 would ask a
     reader to do with them is exactly chapter 14's task, one chapter later and
     with a reason attached. Two tasks separated by one chapter, the first of
     which only asks you to watch a readout, is worse than one that asks you to
     use it. */
  "three-numbers":
    "The three numbers are read in chapter 14's sandbox, where there is a " +
    "problem to spend them on. A watch-the-readout exercise here would be the " +
    "same task with nothing at stake.",

  /* The notch is a signal-processing fact before it is a geometric one: a
     radar rejects returns whose radial velocity falls inside its clutter
     filter. This model has no radar, no filter width and no returns, so a
     sandbox could only draw a cone and assert that entering it works — which
     is precisely the miming this file exists to forbid. The chapter's figure
     computes the band from stated premises and says they are premises. */
  "bvr-geometry":
    "There is no radar in this model — no filter width, no returns, no " +
    "detection. A notch sandbox could only assert that the cone works. Needs a " +
    "doppler receiver model before it could be honest.",

  /* There is nothing to fly. The chapter's subject is a sequence of decisions
     taken over minutes at thirty miles, where the aeroplane is going straight
     and the only thing changing is what you know and what you have committed
     to. A sandbox would be a countdown with buttons on it, which is a quiz
     wearing a cockpit. */
  "intercept-timeline":
    "Its subject is decision timing, not flying — at thirty miles the aeroplane " +
    "is going straight and only the picture changes. A sandbox here would be a " +
    "countdown with buttons, which is a quiz in a cockpit.",
};

/* ── the checkride ─────────────────────────────────────────────────────────
 *
 * The final test, and deliberately NOT a course through floating rings. Rings
 * would measure how well somebody drags a slider, and a learner who understands
 * everything could fail on the interface while one who understands nothing could
 * stumble through by trial and error. That is backwards.
 *
 * Instead every item asks you to PRODUCE a claim the course made. The model
 * judges it, so there is no marking to argue with, and most of them cannot be
 * reached by accident — item 2 in particular is unreachable unless you have
 * genuinely stopped believing that a stall is about speed.
 *
 * Each item resets the aircraft to its own sensible start, because failing item
 * six should not cost you items one through five.
 */
const airborne = (V = 45, h = 400) => () => ({ ...trim(V).state, h });

export const CHECKRIDE = [
  {
    ch: 1, name: "Get it flying",
    brief: "From a standing start on the runway: get airborne and 100 feet up. Nothing leaves the ground until the lift arrow is longer than the weight arrow.",
    controls: ["throttle", "elevator"],
    arrows: ["lift", "weight", "thrust", "drag"],
    start: () => initialState(),
    readout: [
      { k: "lift", label: "Lift", get: (s, f) => N(f.L) },
      { k: "weight", label: "Weight", get: (s, f) => N(f.W) },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "", label: "Altitude", get: (s) => ft(s.h) },
    ],
    goal: { test: (s) => !s.onGround && s.h > 30, done: "Airborne." },
  },
  {
    /* The one that cannot be faked. If you still think a stall is caused by
       flying too slowly, you will sit at 60 knots pulling gently and nothing
       will happen. It is an ANGLE, and you have to go and get it. */
    ch: 3, name: "Stall it above 60 knots",
    brief: "Stall the wing while showing more than 60 knots. Slowing down will not do it — you need the critical angle of attack, and at that speed the only way there is a firm pull.",
    controls: ["throttle", "elevator"],
    arrows: ["lift", "weight"],
    /* Started near 68 knots on purpose. Stalling at 60 needs n = (60/49)² ≈ 1.5 g,
       which a firm pull reaches easily; from a cruise start it would take over
       5 g and the item would be impossible rather than instructive. */
    start: airborne(35, 700),
    readout: [
      { k: "angle", label: "Angle of attack", get: (s, f) => deg(f.alpha) },
      { k: "", label: "Critical α", get: () => "16.0°" },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "lift", label: "C∟", get: (s, f) => num(f.CL) },
    ],
    goal: {
      test: (s, f) => !s.onGround && f.alpha > AIRCRAFT.aStall && s.V * 1.944 > 60,
      done: "Stalled at speed. A stall is an angle, and you just proved it.",
    },
  },
  {
    ch: 4, name: "Find minimum drag",
    brief: "Settle into level flight at the speed where parasite drag and induced drag are equal. That is the bottom of the curve, and the speed the aircraft is happiest at.",
    controls: ["throttle", "elevator"],
    arrows: ["thrust", "drag"],
    start: airborne(45, 600),
    readout: [
      { k: "drag", label: "Parasite", get: (s, f) => N(f.Dp) },
      { k: "lift", label: "Induced", get: (s, f) => N(f.Di) },
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "angle", label: "Climb", get: (s) => deg(s.gamma) },
    ],
    goal: {
      test: (s, f) => !s.onGround && s.V > 20 && Math.abs(s.gamma) < 0.06
        && Math.abs(f.Dp - f.Di) / Math.max(1, f.D) < 0.07,
      done: "Parasite equals induced — minimum drag, in level flight.",
    },
  },
  {
    ch: 6, name: "Prove it is stable",
    brief: "Disturb the pitch, then centre the stick and take your hands off. Twice. Nothing is holding the nose level except the aircraft's own moment.",
    controls: ["throttle", "elevator"],
    arrows: ["lift", "weight"],
    start: airborne(45, 600),
    readout: [
      { k: "angle", label: "Pitch θ", get: (s) => deg(s.theta) },
      { k: "moment", label: "Cm", get: (s, f) => num(f.Cm, 3) },
      { k: "", label: "Stick", get: (s, f, ctx) => (Math.abs(ctx.elevator || 0) < 0.06 ? "centred" : "held") },
      { k: "lift", label: "Returns", get: (s, f, ctx) => `${ctx.returns || 0} / 2` },
    ],
    track: TASKS["static-stability"].track,
    goal: { test: (s, f, ctx) => (ctx.returns || 0) >= 2, done: "Twice back to level, unaided." },
  },
  {
    ch: 8, name: "Damp a Dutch roll",
    brief: "Kick the rudder, then let everything go. Count three swings of sideslip while the fin puts it right without you.",
    controls: ["throttle", "elevator", "aileron", "rudder"],
    arrows: ["lift", "weight"],
    start: airborne(50, 900),
    readout: [
      { k: "drag", label: "Sideslip β", get: (s) => deg(s.beta) },
      { k: "moment", label: "Roll rate p", get: (s) => `${(s.p * 57.2958).toFixed(1)}°/s` },
      { k: "lift", label: "Yaw rate r", get: (s) => `${(s.r * 57.2958).toFixed(1)}°/s` },
      { k: "", label: "Swings", get: (s, f, ctx) => `${ctx.swings || 0} / 3` },
    ],
    track: TASKS["lateral-modes"].track,
    goal: { test: (s, f, ctx) => (ctx.swings || 0) >= 3, done: "Three swings, hands off." },
  },
  {
    ch: 9, name: "Turn at 45° and hold your height",
    brief: "Roll into 45° of bank and stay level. The wing has to pull about 1.4 g to do it — hold that for two seconds.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    start: airborne(50, 800),
    readout: [
      { k: "moment", label: "Bank", get: (s) => deg(s.phi) },
      { k: "lift", label: "Load factor", get: (s, f) => `${f.n.toFixed(2)} g` },
      { k: "", label: "1 / cos φ", get: (s) => `${(1 / Math.cos(s.phi)).toFixed(2)} g` },
      { k: "angle", label: "Climb", get: (s) => deg(s.gamma) },
    ],
    track: (s, f, ctx, dt) => {
      const ok = !s.onGround && Math.abs(s.phi) > 0.72 && f.n > 1.3 && Math.abs(s.gamma) < 0.06;
      ctx.bank = ok ? (ctx.bank || 0) + dt : 0;
    },
    goal: { test: (s, f, ctx) => (ctx.bank || 0) > 2, done: "Forty-five degrees, height held, 1.4 g on the wing." },
  },
  {
    ch: 12, name: "Close the loop",
    brief: "Climb above 100 feet, then engage the autopilot and take your hands off for eight seconds. It measures the error and pushes the other way — that is all it does.",
    controls: ["throttle", "elevator"],
    arrows: ["lift", "weight"],
    autopilot: { target: 60 },
    start: airborne(45, 40),
    readout: [
      { k: "", label: "Altitude", get: (s) => ft(s.h) },
      { k: "", label: "Target", get: (s, f, ctx) => ft(ctx.target) },
      { k: "drag", label: "Error", get: (s, f, ctx) => `${(s.h - ctx.target).toFixed(1)} m` },
      { k: "thrust", label: "Held", get: (s, f, ctx) => `${(ctx.apHeld || 0).toFixed(1)} s` },
    ],
    goal: { test: (s, f, ctx) => ctx.apHeld > 8, done: "Eight seconds, hands off." },
  },
];

/* ── the second checkride ──────────────────────────────────────────────────
 *
 * Part II's, and the same instrument as the first: every item is a claim the
 * course made, produced on demand, judged by the model. What changes is the
 * aeroplane and what a claim now costs to produce. All of it is flown in the
 * FIGHTER, because every claim Part II makes is about an airframe that can pull
 * nine g, and half of them are about a second aeroplane doing the same back.
 *
 * Item 3 is this ride's item 2 — the one that cannot be reached at all by a
 * reader who still believes a faster aeroplane turns better. It opens at 544
 * knots, and at that speed the airframe is already giving everything it has:
 * full back stick buys all nine g and nine g there is about 18° a second
 * against the 25 the item asks for. No stick input fixes that and the throttle
 * makes it worse — flown at full power the aeroplane sustains nine g at that
 * speed and turns at 18.2° a second for as long as anybody cares to hold it.
 * The only way to the rate is to throw the speed away.
 *
 * Chapters 16, 18 and 20 have no item, for the reason MISSING above exists —
 * and in one case only because it was built, flown and thrown away:
 *
 *   16  One circle against two is a claim about two aeroplanes with DIFFERENT
 *       best numbers. It needs a second airframe, not a second aircraft.
 *   18  "Recover the overshoot" WAS written: 400 m in front of his wingline
 *       with 80 knots of overtake, get back inside 45° of aspect. Flown, it
 *       passed for a pilot holding full aileron and full back stick and doing
 *       nothing else (10.1s), and came within 0.2s of passing for a plain hard
 *       level turn — because against one steadily turning bandit "recover"
 *       collapses into "turn hard", which items 1 and 2 already ask for. An
 *       item that cannot tell a correction from a yank is not testing the
 *       chapter, so it was dropped rather than tightened until it looked good.
 *   20  Its claim is a clock and a decision ladder. An item gated on "before he
 *       is inside eight miles" can be missed unrecoverably in the middle of a
 *       ride, and an item you cannot retry is a trap rather than a test.
 */
const fighterAt = (V, h = 4000) => () => ({ ...trim(V, FIGHTER).state, h });
const RATE = (s, f) => (s.V > 5 ? (f.L * Math.sin(s.phi)) / (FIGHTER.m * s.V) : 0);
/* Angle off the nose measured in the horizontal plane alone, signed the same
   way relative()'s ata is. The three-dimensional ata cannot be used to judge a
   crank: pointing the nose 50° UP puts him 50° off it without turning an inch,
   and an item gated on that latches on a zoom climb by a reader who has done
   nothing. A crank is a heading change, so this is measured off heading. */
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const offNose = (s, b) => wrap(Math.atan2(b.y - s.y, b.x - s.x) - s.psi);
/* Specific excess power, from the forces rather than by differencing energy:
   dEs/dt is exactly V(T−D)/W for a point mass, whatever the flight path is
   doing. Chapter 17's number, and the one the item below asks you to make
   negative with the engine already wide open. */
const PS = (s, f) => (f.T - f.D) * s.V / f.W;

export const CHECKRIDE_II = [
  {
    ch: 13, name: "Stop the range",
    ac: FIGHTER,
    brief:
      "He is a mile and a half ahead at 350 knots, straight and level, and you are 135 knots faster. " +
      "Close to inside a mile and then STOP the range: hold it there, closure inside 40 knots, for " +
      "three seconds. Range is not something that happens to you. You own one of its two terms.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    start: fighterAt(250),
    /* Straight and level, and offset enough that the range is not simply a
       subtraction. Nothing about the opening state is inside the goal: a mile
       and a half out and 70 m/s of overtake, so both have to be flown. */
    bandit: {
      start: () => ({ ...trim(180, FIGHTER).state, h: 4000, x: 2800, y: 700, psi: 0 }),
      law: holdTurn(0, 180),
    },
    readout: [
      ...GEOMETRY,
      { k: "angle", label: "Off our nose", get: (s, f, ctx) => (ctx.geo ? deg(ctx.geo.ata) : "—") },
    ],
    track: (s, f, ctx, dt) => {
      const g = ctx.geo;
      if (!g) return;
      const ok = !s.onGround && g.aspect < 0.79 && g.range > 400 && g.range < 1852
        && Math.abs(g.closure) < 20;
      ctx.held = ok ? (ctx.held || 0) + dt : 0;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 3,
      done: "Three seconds with the range standing still. Closure has two terms and you were flying one of them — the aspect never moved the whole time.",
    },
  },

  {
    ch: 14, name: "Take his rear quarter and keep it",
    ac: FIGHTER,
    brief:
      "Now he is turning, hard and to the left, and he will not stop. Get inside half a mile of his " +
      "tail, inside 40° of aspect, and stay there for five seconds. Point straight at him and you " +
      "arrive sooner with closure you cannot spend, and leave again immediately.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    start: fighterAt(250),
    bandit: {
      start: () => ({ ...trim(180, FIGHTER).state, h: 4000, x: 2600, y: 1100, psi: 1.9 }),
      law: holdTurn(-60, 180),
    },
    readout: [
      ...GEOMETRY,
      { k: "angle", label: "Off our nose", get: (s, f, ctx) => (ctx.geo ? deg(ctx.geo.ata) : "—") },
    ],
    track: (s, f, ctx, dt) => {
      const g = ctx.geo;
      if (!g) return;
      const ok = !s.onGround && g.aspect < 0.70 && g.range > 250 && g.range < 900;
      ctx.held = ok ? (ctx.held || 0) + dt : 0;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 5,
      done: "Five unbroken seconds inside his turn. What you were controlling the whole time was closure — with the nose, with the throttle, or both.",
    },
  },

  {
    ch: 15, name: "Twenty-five degrees a second",
    ac: FIGHTER,
    brief:
      "You are doing 544 knots. Bring the nose round at 25 degrees a second and hold it for two. " +
      "The airframe will give you all nine g at this speed and it still will not be enough — nine g " +
      "at 544 knots is 17.9 degrees a second. The rate is not in the engine.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    start: fighterAt(280, 6000),
    readout: [
      { k: "", label: "Airspeed", get: (s) => kt(s.V) },
      { k: "", label: "Corner", get: () => `${Math.round(V_CORNER * 1.944)} kt` },
      { k: "lift", label: "Load factor", get: (s, f) => `${f.n.toFixed(2)} g` },
      { k: "angle", label: "Turn rate", get: (s, f) => `${(RATE(s, f) * 57.2958).toFixed(1)}°/s` },
    ],
    track: (s, f, ctx, dt) => {
      ctx.held = !s.onGround && RATE(s, f) > 0.4363 ? (ctx.held || 0) + dt : 0;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 2,
      done: "Twenty-five degrees a second, and the only way you got there was by throwing away the speed you started with.",
    },
  },

  {
    ch: 17, name: "Present the bill",
    ac: FIGHTER,
    brief:
      "Full afterburner, and make the energy go DOWN — 120 metres of energy height a second, held " +
      "for three, in a level turn. Thrust is 129 kN. A hard turn at this speed costs more than that " +
      "in drag, and the engine cannot buy you out of it. Four g will not do it. Eight will.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "drag", "thrust", "weight"],
    start: fighterAt(200, 6000),
    readout: [
      { k: "thrust", label: "Ps", get: (s, f) => `${PS(s, f).toFixed(0)} m/s` },
      { k: "lift", label: "Load factor", get: (s, f) => `${f.n.toFixed(2)} g` },
      { k: "", label: "Energy height", get: (s) => `${Math.round(es(s)).toLocaleString()} m` },
      { k: "angle", label: "Climb", get: (s) => deg(s.gamma) },
    ],
    track: (s, f, ctx, dt) => {
      const paying = !s.onGround && f.T > FIGHTER.Tmax * 0.9 && Math.abs(s.gamma) < 0.15
        && PS(s, f) < -120;
      ctx.held = paying ? (ctx.held || 0) + dt : 0;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 3,
      done: "Wide open, level, and going backwards at 120 metres of energy a second. That is the bill, and it is presented every time you pull.",
    },
  },

  {
    ch: 19, name: "Crank",
    ac: FIGHTER,
    brief:
      "Eighteen miles, head on, both of you at 480 knots — 960 knots of closure and 68 seconds. " +
      "Turn far enough off to cut it and not so far that you go blind: settle him between 40 and 60 " +
      "degrees off your nose, roll level, and hold that for four seconds while you watch the closure. " +
      "Keep turning and you sweep straight past it.",
    controls: ["throttle", "elevator", "aileron"],
    arrows: ["lift", "weight"],
    start: fighterAt(250, 8000),
    bandit: {
      start: () => ({ ...trim(250, FIGHTER).state, h: 8000, x: 33336, y: 0, psi: Math.PI }),
      law: holdTurn(0, 250),
    },
    readout: [
      ...GEOMETRY,
      { k: "angle", label: "Off our nose", get: (s, f, ctx) => (ctx.bandit ? deg(offNose(s, ctx.bandit)) : "—") },
    ],
    track: (s, f, ctx, dt) => {
      if (!ctx.bandit) return;
      const off = Math.abs(offNose(s, ctx.bandit));
      /* Still closing, still outside five miles: a crank is something you do on
         the way IN. Without the closure term the same window is satisfied by
         sweeping through it after the merge, wings dragging round at 500 knots,
         which is not a crank and is not chapter 19. */
      /* The gimbal, in the chapter's own numbers: 50° off with 10° either side.
         What makes this hard is not the width of that window — it is the wings,
         which have to come level and stay there. A reader still turning sweeps
         through whatever window you draw, and the bank is what says so. */
      const ok = !s.onGround && off > 0.698 && off < 1.047 && Math.abs(s.phi) < 0.25
        && ctx.geo.range > 9260 && ctx.geo.closure > 100;
      ctx.held = ok ? (ctx.held || 0) + dt : 0;
    },
    goal: {
      test: (s, f, ctx) => (ctx.held || 0) > 4,
      done: "Cranked. Your half of the closure fell by the cosine of that turn and the merge moved twelve seconds further away — bought with a turn, not with the throttle.",
    },
  },
];

export const VS_KT = Math.round(stallSpeed() * 1.944);

export const hasTask = (id) => Object.hasOwn(TASKS, id);
