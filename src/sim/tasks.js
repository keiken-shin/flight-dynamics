/* What each lesson's sandbox asks you to do.
 *
 * Pure data and formatting — no Three.js, no DOM. lesson.js imports it to know
 * which chapters carry a sandbox without dragging the 3D engine into every
 * page, and sandbox.js imports it to configure the one scene it builds.
 *
 * A chapter only appears here if the shipped flight model can demonstrate its
 * idea HONESTLY. The model is a longitudinal point mass: speed, angle of attack,
 * flight path, height. It has no roll, no yaw, no sideslip and no pitch moment,
 * so the chapters that turn on those are deliberately absent rather than faked —
 * a sandbox that mimes a Dutch roll it is not computing would be the worst thing
 * this project could ship. See MISSING below for what each one needs.
 */

import { AIRCRAFT, initialState, trim, stallSpeed } from "./flight-model.js";

const AC_M = AIRCRAFT.m;
const kt = (v) => `${Math.round(v * 1.944)} kt`;
const ft = (v) => `${Math.round(v * 3.281)} ft`;
const N = (v) => `${Math.round(v).toLocaleString()} N`;
const deg = (r) => `${(r * 57.2958).toFixed(1)}°`;
const num = (v, d = 2) => v.toFixed(d);

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
};

/* The five chapters with no sandbox, and the physics each would need. Kept in
   code rather than in a note, so the reason is next to the thing it explains. */
/* Every chapter now has one. The object stays so the rule it encodes stays:
   a chapter without honest physics behind it gets no sandbox, and the reason
   goes here rather than into a commit message nobody will read. */
export const MISSING = {};

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

export const VS_KT = Math.round(stallSpeed() * 1.944);

export const hasTask = (id) => Object.hasOwn(TASKS, id);
