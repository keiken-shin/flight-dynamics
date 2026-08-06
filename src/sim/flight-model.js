/* Longitudinal flight model for the four-forces sandbox.
 *
 * This is deliberately readable rather than clever, because the plan is to show
 * the learner this exact file beside the simulation. Every symbol matches the
 * lesson: T thrust, D drag, L lift, W weight.
 *
 * Scope: point mass in the vertical plane. Three states that matter — airspeed,
 * flight path angle, altitude — plus pitch attitude the learner commands. No
 * yaw, no roll, no wind. That is enough to make lesson 1 physical, and adding
 * the other three degrees of freedom would add code without adding insight.
 */

/* A 1982 Cessna 172P.
 *
 * The geometry, inertias and moment derivatives are converted to SI from the
 * JSBSim `c172x` aircraft definition (github.com/JSBSim-Team/jsbsim, GPL, by
 * Tony Peden), itself built from publicly available data. They are measured
 * numbers for a real aeroplane rather than values chosen to make the picture
 * look right — which matters, because the modes this model has to show are
 * properties of these coefficients and nothing else.
 *
 * Sign conventions are the standard ones: positive elevator is trailing-edge
 * down (nose-down moment, hence Cmde < 0), and a stick pulled back commands
 * negative elevator. Cma < 0 is what makes the aircraft statically stable —
 * that single negative number is the whole of lesson 6.
 */
export const AIRCRAFT = {
  m: 1000,        // kg — mass, a realistic loaded 172
  S: 16.17,       // m² — wing area (174 ft²)
  b: 10.97,       // m  — span (36 ft)
  c: 1.494,       // m  — mean chord (4.9 ft)
  Iyy: 1825,      // kg·m² — pitch inertia (1346 slug·ft²)

  CL0: 0.25,      // lift coefficient at zero angle of attack (cambered wing)
  CLa: 5.0,       // per radian — lift-curve slope
  CLmax: 1.55,    // stall ceiling
  aStall: 0.28,   // rad ≈ 16° — critical angle of attack
  CD0: 0.032,     // parasite drag coefficient
  k: 0.045,       // induced drag factor: CD = CD0 + k·CL²

  /* Pitch moment, per radian. Cmq and Cmadot are the damping pair; they act on
     nearly the same motion during the short period, so they are carried as one
     group the way the textbook short-period approximation does. */
  Cm0: 0.10,
  Cma: -1.80,
  Cmq: -12.4,
  Cmadot: -5.2,
  Cmde: -1.28,

  /* Lateral-directional, per radian. Clb and Cnb are read as the slope of the
     JSBSim beta tables through zero; the rest are its constants. Cnb > 0 is
     weathercock stability (the fin), Clp < 0 is roll damping, and Clb < 0 is
     dihedral effect. Dutch roll is what those three do when they argue. */
  Ixx: 1285,      // kg·m² — roll inertia (948 slug·ft²)
  Izz: 2667,      // kg·m² — yaw inertia (1967 slug·ft²)

  CYb: -0.3095, CYp: -0.037, CYr: 0.21, CYdr: 0.098,
  Clb: -0.0891, Clp: -0.47, Clr: 0.096, Clda: 0.23, Cldr: 0.0147,
  Cnb: 0.0650, Cnp: -0.03, Cnr: -0.099, Cnda: 0.0053, Cndr: -0.043,

  Tmax: 3200,     // N — static thrust at full throttle
  mu: 0.02,       // rolling friction coefficient on the runway
  /* 23° — the real aircraft's elevator travel, not a round number. At the 20° I
     first guessed, full back stick could only command 17.4° of angle of attack
     against a 16° stall, so a hard pull never reached the critical angle before
     the flight path caught up: the aeroplane could not be stalled at speed at
     all, which is exactly the thing chapter 3 exists to disprove. */
  dEmax: 0.40,    // rad — elevator travel at full stick (±23°)
  dAmax: 0.35,    // rad — aileron
  dRmax: 0.28,    // rad — rudder
  gearArm: 0.42,  // m — how far the main wheels sit behind the CG; this is what
                  //     holds the nose down until the elevator can out-moment it
};

export const RHO = 1.225;   // kg/m³ — sea level density
export const G = 9.80665;   // m/s²

export function initialState() {
  return {
    x: 0,          // m     — distance down the runway
    h: 0,          // m     — height above the runway
    V: 0,          // m/s   — airspeed
    gamma: 0,      // rad   — flight path angle (climb angle)
    theta: 0,      // rad   — pitch attitude
    q: 0,          // rad/s — pitch rate. Pitch is now a MOMENT balance, not a
                   //         commanded rate, which is what lets the aircraft be
                   //         stable, and lets it oscillate when disturbed.
    // lateral-directional
    y: 0,          // m     — cross-track position
    psi: 0,        // rad   — heading
    phi: 0,        // rad   — bank, right wing down positive
    beta: 0,       // rad   — sideslip
    p: 0,          // rad/s — roll rate
    r: 0,          // rad/s — yaw rate
    onGround: true,
  };
}

/* Lift coefficient against angle of attack: linear, then it falls off a cliff.
 * The post-stall drop is what makes over-rotation punish you in the sandbox,
 * which is the whole point of lesson 3 arriving later. */
export function liftCoefficient(alpha, ac = AIRCRAFT) {
  const linear = ac.CL0 + ac.CLa * alpha;
  if (alpha <= ac.aStall) return Math.min(linear, ac.CLmax);
  const over = alpha - ac.aStall;
  return Math.max(0.35, Math.min(linear, ac.CLmax) - 4.2 * over);
}

/* Every force the lesson names, at this instant. The UI draws its four arrows
 * straight from this — the same four arrows as the lesson's figure, now live. */
export function forces(s, controls, ac = AIRCRAFT) {
  const alpha = s.theta - s.gamma;
  const qbar = 0.5 * RHO * s.V * s.V;      // dynamic pressure
  const CL = liftCoefficient(alpha, ac);
  const CD = ac.CD0 + ac.k * CL * CL;

  const L = qbar * ac.S * CL;
  const D = qbar * ac.S * CD;
  /* The same drag, split the way lesson 4 splits it: parasite grows with speed,
     induced falls away with it, and the sum has a minimum in between. */
  const Dp = qbar * ac.S * ac.CD0;
  const Di = qbar * ac.S * ac.k * CL * CL;
  const W = ac.m * G;
  /* Thrust falls off as the aircraft speeds up — a propeller cannot hold static
   * thrust to flying speed, and without this the takeoff roll is fantasy. */
  const T = controls.throttle * ac.Tmax * Math.max(0.35, 1 - s.V / 90);

  // On the runway the ground carries whatever lift has not yet taken.
  const N = s.onGround ? Math.max(0, W - L) : 0;
  const friction = ac.mu * N;

  /* Pitching moment about the CG. Everything the aircraft does in pitch comes
     out of this one line: Cm0 sets the trim, Cma pulls it back toward trim when
     disturbed (lesson 6), the damping group resists the rate (lesson 7), and the
     elevator is how you move the balance point. */
  const de = -(controls.elevator ?? 0) * ac.dEmax;      // stick back → nose up
  const damp = s.V > 5 ? (ac.Cmq + ac.Cmadot) * (s.q * ac.c) / (2 * s.V) : 0;
  const Cm = ac.Cm0 + ac.Cma * alpha + damp + ac.Cmde * de;
  let M = qbar * ac.S * ac.c * Cm;

  /* On the runway the main wheels sit behind the CG, and the weight still on
     them holds the nose down. Rotation is not a timer — it is the moment the
     elevator can finally out-moment that reaction, which is why it happens at a
     speed rather than at a moment in time. */
  if (s.onGround) M -= N * ac.gearArm;

  /* ── lateral-directional ──
     Roll and yaw are two moments that will not leave each other alone: sideslip
     rolls the aircraft (Clb, dihedral) while the fin yaws it back (Cnb), and the
     two chasing each other IS the Dutch roll. Rates are non-dimensionalised by
     b/2V, which is the convention every one of these coefficients was measured
     in. Ixz is zero for this aircraft, so roll and yaw do not need to be solved
     together — a real gift to readability. */
  const da = (controls.aileron ?? 0) * ac.dAmax;
  const dr = (controls.rudder ?? 0) * ac.dRmax;
  const b2v = s.V > 5 ? ac.b / (2 * s.V) : 0;
  const ph = (s.p ?? 0) * b2v, rh = (s.r ?? 0) * b2v;
  const beta = s.beta ?? 0;

  const CY = ac.CYb * beta + ac.CYp * ph + ac.CYr * rh + ac.CYdr * dr;
  const Cl = ac.Clb * beta + ac.Clp * ph + ac.Clr * rh + ac.Clda * da + ac.Cldr * dr;
  const Cn = ac.Cnb * beta + ac.Cnp * ph + ac.Cnr * rh + ac.Cnda * da + ac.Cndr * dr;

  const Y = qbar * ac.S * CY;                  // side force
  const Lroll = qbar * ac.S * ac.b * Cl;       // rolling moment
  const Nyaw = qbar * ac.S * ac.b * Cn;        // yawing moment

  // Load factor: what the wing is actually pulling, in g.
  const n = L / W;

  return { L, D, Dp, Di, T, W, N, friction, alpha, CL, CD, qbar, Cm, M, de,
           Y, Lroll, Nyaw, Cl, Cn, n, da, dr };
}

/* Semi-implicit Euler at a fixed sub-step. Chosen over RK4 on purpose: at 1/240 s
 * the error is invisible for this model, and a learner can read this loop and
 * see exactly what it does. */
const SUB_DT = 1 / 240;

export function step(state, controls, dt, ac = AIRCRAFT) {
  let s = { ...state };
  let n = Math.max(1, Math.min(20, Math.round(dt / SUB_DT)));
  const h = dt / n;

  let f = forces(s, controls, ac);
  for (let i = 0; i < n; i++) {
    f = forces(s, controls, ac);

    // Pitch: a moment divided by an inertia, integrated twice. Nothing commands
    // the attitude — it is what the moments leave behind.
    s.q += (f.M / ac.Iyy) * h;
    s.theta += s.q * h;

    // Along the flight path: thrust forward, drag and friction back, and the
    // component of weight that lies along the path once climbing.
    const dV = (f.T - f.D - f.friction - f.W * Math.sin(s.gamma)) / ac.m;
    s.V = Math.max(0, s.V + dV * h);

    if (s.onGround) {
      // Still rolling: no flight path angle. The nosewheel stops the aircraft
      // pitching below level, and the tail stops it rotating past the strike
      // angle; at either stop the rate goes with it.
      s.gamma = 0;
      if (s.theta < 0) { s.theta = 0; s.q = Math.max(0, s.q); }
      if (s.theta > 0.21) { s.theta = 0.21; s.q = Math.min(0, s.q); }
      if (f.L > f.W) s.onGround = false;   // lift finally beat weight
      // Wheels on the ground hold the wings level and stop it slipping.
      s.phi = 0; s.p = 0; s.r = 0; s.beta = 0;
    } else {
      s.theta = clamp(s.theta, -0.45, 0.5);

      /* Roll and yaw: moments over inertias, exactly as pitch. */
      s.p += (f.Lroll / ac.Ixx) * h;
      s.r += (f.Nyaw / ac.Izz) * h;
      s.phi = clamp(s.phi + s.p * h, -1.2, 1.2);

      /* Sideslip builds from side force, is unwound by yaw rate, and is fed by
         gravity whenever a wing is down — which is why an aircraft left banked
         slides toward the low wing instead of simply turning. */
      if (s.V > 5) {
        const dBeta = f.Y / (ac.m * s.V) - s.r + s.p * f.alpha
                    + (G / s.V) * Math.sin(s.phi) * Math.cos(s.theta);
        s.beta = clamp(s.beta + dBeta * h, -0.5, 0.5);
      }

      /* Across the flight path: only the vertical part of lift fights weight,
         so banking costs you climb — and holding altitude in a turn means
         pulling more than 1g. This one cosine is the whole of lesson 9. */
      const dGamma = s.V > 1
        ? (f.L * Math.cos(s.phi) - f.W * Math.cos(s.gamma)) / (ac.m * s.V) : 0;
      s.gamma = clamp(s.gamma + dGamma * h, -0.5, 0.5);

      // The horizontal part of lift is the centripetal force that turns you.
      if (s.V > 5) s.psi += (f.L * Math.sin(s.phi)) / (ac.m * s.V) * h;

      if (s.h <= 0 && s.gamma < 0) { s.gamma = 0; s.onGround = true; }
    }

    const ground = s.V * Math.cos(s.gamma);
    s.x += ground * Math.cos(s.psi) * h;
    s.y += ground * Math.sin(s.psi) * h;
    s.h = Math.max(0, s.h + s.V * Math.sin(s.gamma) * h);
    /* Strictly descending, not merely level: at the instant of liftoff gamma is
       still exactly 0 and h is still exactly 0, and a `<= 0` here re-grounds the
       aircraft on the same substep it left — forever. */
    if (s.h === 0 && !s.onGround && s.gamma < 0) s.onGround = true;
  }

  return { state: s, forces: f };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* Trim the aircraft in level flight at a given speed: find the elevator that
 * makes the pitching moment zero at the angle of attack which holds altitude.
 * Solved rather than hunted, because Cm is linear in both. */
export function trim(V, ac = AIRCRAFT) {
  const qbar = 0.5 * RHO * V * V;
  const CLneed = (ac.m * G) / (qbar * ac.S);
  const alpha = (CLneed - ac.CL0) / ac.CLa;
  // Cm0 + Cma·α + Cmde·δe = 0
  const de = -(ac.Cm0 + ac.Cma * alpha) / ac.Cmde;
  const elevator = -de / ac.dEmax;
  /* Built from initialState so it can never fall behind it. Handing back a
     literal here once omitted every lateral state, and `phi + p` quietly became
     NaN through the whole model. */
  return {
    state: { ...initialState(), h: 1000, V, theta: alpha, onGround: false },
    elevator, alpha,
  };
}

/* Disturb a trimmed aircraft and read the two longitudinal modes back out of
 * what it does next. Zero-crossings of pitch rate give the fast mode; of
 * airspeed, the slow one. */
export function measureModes(V = 50, ac = AIRCRAFT) {
  const tr = trim(V, ac);
  const controls = { throttle: 0.65, elevator: tr.elevator };
  const dt = 1 / 240;

  /* Times at which the signal crosses `level`, linearly interpolated. Half a
     cycle separates consecutive crossings, so the period is twice their gap. */
  const crossings = (samples, dtEach, level) => {
    const out = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1] - level, b = samples[i] - level;
      if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) out.push((i - a / (b - a)) * dtEach);
    }
    return out;
  };
  const periodFrom = (c) => (c.length < 2 ? null : 2 * ((c[c.length - 1] - c[0]) / (c.length - 1)));

  /* Fast mode: a sharp pitch nudge, read over the first three seconds only.
     The short period is over in about one, and looking further out measures the
     phugoid bleeding into the same signal — which is exactly the mistake that
     first reported this aircraft's 1.1s short period as 10.6s. */
  let s = { ...tr.state, q: 0.18 };
  const qs = [];
  for (let i = 0; i < 240 * 3; i++) { s = step(s, controls, dt, ac).state; qs.push(s.q); }
  const shortPeriod = periodFrom(crossings(qs, dt, 0));

  // Slow mode: a speed offset at trim attitude, watched over minutes.
  let p = { ...tr.state, V: V * 1.12 };
  const vs2 = [];
  for (let i = 0; i < 240 * 240; i++) {
    p = step(p, controls, dt, ac).state;
    if (i % 24 === 0) vs2.push(p.V);
  }
  const mean = vs2.reduce((a, b) => a + b, 0) / vs2.length;
  const phugoidPeriod = periodFrom(crossings(vs2, dt * 24, mean));

  /* Static stability is Cma < 0 stated as behaviour: nudge the nose up off trim
     and the moment must push it back down. */
  const off = forces({ ...tr.state, theta: tr.state.theta + 0.05 }, controls, ac);
  return {
    shortPeriod: shortPeriod ?? Infinity,
    phugoidPeriod: phugoidPeriod ?? Infinity,
    staticallyStable: off.M < 0,
    trimElevator: tr.elevator,
  };
}

/* The three lateral-directional modes, measured the same way: disturb, release,
 * watch. Dutch roll is an oscillation; roll subsidence is a decay; the spiral is
 * whatever bank does when left alone for a long time. */
export function measureLateral(V = 50, ac = AIRCRAFT) {
  const tr = trim(V, ac);
  const controls = { throttle: 0.65, elevator: tr.elevator, aileron: 0, rudder: 0 };
  const dt = 1 / 240;

  // Dutch roll: kick the rudder, let go, and time the sideslip oscillation.
  let s = { ...tr.state, beta: 0.10 };
  const bs = [], t0 = [];
  for (let i = 0; i < 240 * 20; i++) { s = step(s, controls, dt, ac).state; bs.push(s.beta); }
  for (let i = 1; i < bs.length; i++) {
    const a = bs[i - 1], b = bs[i];
    if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) t0.push((i - a / (b - a)) * dt);
  }
  const dutchRoll = t0.length >= 2 ? 2 * ((t0[t0.length - 1] - t0[0]) / (t0.length - 1)) : Infinity;
  // Damped if the later swings are smaller than the earlier ones.
  const peak = (from, to) => Math.max(...bs.slice(from, to).map(Math.abs));
  const dutchDamped = peak(240 * 6, 240 * 10) < peak(0, 240 * 4) * 0.7;

  /* Roll subsidence: hold aileron until the roll rate settles, release, and
     measure how long the rate takes to fall to 1/e. It is a first-order decay,
     not an oscillation — that is the whole character of the mode. */
  let q2 = { ...tr.state };
  for (let i = 0; i < 240 * 3; i++) q2 = step(q2, { ...controls, aileron: 0.5 }, dt, ac).state;
  const p0 = q2.p;
  let rollTau = Infinity;
  for (let i = 0; i < 240 * 5; i++) {
    q2 = step(q2, controls, dt, ac).state;
    if (Math.abs(q2.p) < Math.abs(p0) / Math.E) { rollTau = i * dt; break; }
  }

  // Spiral: leave it banked and hands-off, and see which way bank goes.
  let sp = { ...tr.state, phi: 0.12 };
  for (let i = 0; i < 240 * 60; i++) sp = step(sp, controls, dt, ac).state;
  const spiral = sp.phi > 0.12 ? "divergent" : "convergent";

  return { dutchRoll, dutchDamped, rollTau, spiral, spiralBankAfter60s: sp.phi };
}

/* Fly a steady level turn at a given bank and report what the wing ends up
 * pulling. Nothing here imposes n = 1/cos φ — the aileron holds the bank, the
 * elevator holds the height, and the load factor is whatever falls out. */
export function measureTurn(bankDeg, V = 45, ac = AIRCRAFT) {
  const want = (bankDeg * Math.PI) / 180;
  let s = { ...trim(V, ac).state, h: 500 };
  for (let i = 0; i < 240 * 60; i++) {
    const aileron = clamp((want - s.phi) * 3 - s.p * 2.5, -1, 1);
    const elevator = clamp(0.30 - s.gamma * 9 - s.q * 1.6, -1, 1);
    s = step(s, { throttle: 1, elevator, aileron, rudder: 0 }, 1 / 240, ac).state;
  }
  const f = forces(s, { throttle: 1, elevator: 0 }, ac);
  return {
    bank: s.phi,
    n: f.n,
    nRef: 1 / Math.cos(s.phi),
    turnRate: (f.L * Math.sin(s.phi)) / (ac.m * s.V),
    turnRateRef: (G * Math.tan(s.phi)) / s.V,
  };
}

/* Speeds worth naming on screen, derived rather than hard-coded so they stay
 * true if the aircraft constants are edited. */
export function stallSpeed(ac = AIRCRAFT, loadFactor = 1) {
  return Math.sqrt((2 * loadFactor * ac.m * G) / (RHO * ac.S * ac.CLmax));
}

/* ── self-check ───────────────────────────────────────────────────────────
 * Run with: npm run check
 * Asserts the model produces a takeoff that resembles the real aircraft. If
 * this fails, the sandbox is teaching something false.
 *
 * Lives here rather than in a test file so it sits beside the physics it
 * guards, but its *runner* is separate — importing node:url at module scope
 * put a Node builtin into the browser bundle. */
export function demo() {
  const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };

  const vs = stallSpeed();
  assert(vs > 22 && vs < 32, `stall speed ${vs.toFixed(1)} m/s outside plausible band`);

  // Full throttle, rotate once past a sensible rotation speed.
  let s = initialState(), f = null, t = 0, liftoffAt = null, liftoffX = null;
  while (t < 60) {
    const elevator = s.V > vs * 1.12 && s.onGround ? 0.55 : s.h > 0 && s.theta > 0.14 ? -0.1 : 0;
    const r = step(s, { throttle: 1, elevator }, 1 / 60);
    s = r.state; f = r.forces; t += 1 / 60;
    if (!s.onGround && liftoffAt === null) { liftoffAt = t; liftoffX = s.x; }
    if (s.h > 60) break;
  }

  assert(liftoffAt !== null, "never left the ground at full throttle");
  assert(liftoffAt > 8 && liftoffAt < 40, `liftoff at ${liftoffAt.toFixed(1)}s is implausible`);
  assert(liftoffX > 150 && liftoffX < 900, `takeoff roll ${liftoffX.toFixed(0)}m is implausible`);
  assert(s.h > 60, "did not climb away after liftoff");

  // Idle throttle must not fly.
  let g = initialState();
  for (let i = 0; i < 60 * 40; i++) g = step(g, { throttle: 0.15, elevator: 0 }, 1 / 60).state;
  assert(g.onGround, "took off at idle throttle, which is not a thing");

  // Lesson 1's claim, checked numerically: in a steady climb L < W.
  const climb = { x: 0, h: 300, V: 45, gamma: 0.12, theta: 0.16, onGround: false };
  const cf = forces(climb, { throttle: 0.8, elevator: 0 });
  assert(cf.L < cf.W, "lift is not less than weight in a climb — lesson 1 is wrong");

  /* Lesson 4's claim, and lesson 4's sandbox goal: parasite and induced drag
     cross, and they cross at a speed you can actually fly. If minimum drag fell
     below the stall the task would be unreachable and the chapter untrue. */
  const CLmd = Math.sqrt(AIRCRAFT.CD0 / AIRCRAFT.k);
  const Vmd = Math.sqrt((2 * AIRCRAFT.m * G) / (RHO * AIRCRAFT.S * CLmd));
  assert(Vmd > vs * 1.15, `minimum-drag speed ${Vmd.toFixed(1)} is not comfortably above the stall`);
  const md = forces({ x: 0, h: 200, V: Vmd, gamma: 0, theta: (CLmd - AIRCRAFT.CL0) / AIRCRAFT.CLa,
    onGround: false }, { throttle: 0.5 });
  assert(Math.abs(md.Dp - md.Di) / md.D < 0.05, "parasite and induced drag do not meet at Vmd");

  /* ── the modes ──────────────────────────────────────────────────────────
     These are the whole reason pitch became a moment balance rather than a
     commanded rate, so they are asserted rather than admired. Trim the aircraft,
     disturb it, and measure what it does on its own. */
  const modes = measureModes();
  assert(modes.staticallyStable, "Cma is not restoring — the aircraft is not statically stable");
  /* Textbook phugoid period is π·√2·V/g. At 50 m/s that is 22.6s; a real 172 is
     in the same country. A wide band, because this is a check against nonsense,
     not a fit. */
  const pRef = (Math.PI * Math.SQRT2 * 50) / G;
  assert(modes.phugoidPeriod > pRef * 0.6 && modes.phugoidPeriod < pRef * 1.7,
    `phugoid period ${modes.phugoidPeriod.toFixed(1)}s is nowhere near the expected ${pRef.toFixed(1)}s`);
  assert(modes.shortPeriod > 0.7 && modes.shortPeriod < 6,
    `short period ${modes.shortPeriod.toFixed(2)}s is implausible for a light single`);
  assert(modes.shortPeriod < modes.phugoidPeriod / 4,
    "short period is not clearly faster than the phugoid — they have not separated");

  /* ── lateral-directional ── */
  const lat = measureLateral();
  assert(lat.dutchRoll > 1 && lat.dutchRoll < 8,
    `Dutch roll period ${lat.dutchRoll.toFixed(2)}s is implausible for a light single`);
  assert(lat.dutchDamped, "Dutch roll does not damp out — the fin is not doing its job");
  assert(lat.rollTau > 0.02 && lat.rollTau < 1.5,
    `roll subsidence ${lat.rollTau.toFixed(2)}s is implausible`);
  assert(lat.rollTau < lat.dutchRoll,
    "roll subsidence is not faster than the Dutch roll — the modes have not separated");

  /* Lesson 9's claims, both of them, flown rather than asserted: hold height in
     a turn and the wing pulls 1/cos φ, and the aircraft comes round at g·tanφ/V.
     If either drifts, lesson 9 and its sandbox are teaching something false. */
  const turns = [15, 30, 45, 60].map((b) => measureTurn(b));
  for (const t of turns) {
    const deg = ((t.bank * 180) / Math.PI).toFixed(0);
    assert(Math.abs(t.n - t.nRef) < 0.02,
      `at ${deg}° bank the load factor is ${t.n.toFixed(3)}g, not 1/cos φ = ${t.nRef.toFixed(3)}g`);
    assert(Math.abs(t.turnRate - t.turnRateRef) < 0.01,
      `at ${deg}° bank the turn rate does not match g·tanφ/V`);
  }
  const steep = turns[turns.length - 1];

  console.log(
    `ok — Vs ${vs.toFixed(1)} m/s · liftoff ${liftoffAt.toFixed(1)}s at ${liftoffX.toFixed(0)}m · ` +
    `climb L/W ${(cf.L / cf.W).toFixed(3)} · Vmd ${Vmd.toFixed(1)} m/s\n` +
    `   long. modes — short period ${modes.shortPeriod.toFixed(2)}s · ` +
    `phugoid ${modes.phugoidPeriod.toFixed(1)}s (ref ${pRef.toFixed(1)}s)\n` +
    `   lat. modes  — dutch roll ${lat.dutchRoll.toFixed(2)}s ${lat.dutchDamped ? "damped" : "UNDAMPED"} · ` +
    `roll τ ${lat.rollTau.toFixed(2)}s · spiral ${lat.spiral}\n` +
    `   turn        — ${((steep.bank * 180) / Math.PI).toFixed(0)}° bank pulls ` +
    `${steep.n.toFixed(2)}g (1/cos φ = ${steep.nRef.toFixed(2)}g)`
  );
}

