/* Flight model for the four-forces sandbox.
 *
 * This is deliberately readable rather than clever, because the plan is to show
 * the learner this exact file beside the simulation. Every symbol matches the
 * lesson: T thrust, D drag, L lift, W weight.
 *
 * Scope: a point mass with attitude. Longitudinally it is a full moment balance
 * — airspeed, flight path angle, altitude, pitch attitude and pitch rate — and
 * laterally it carries bank, heading, sideslip, roll rate and yaw rate, which is
 * what makes the Dutch roll and the spiral emerge rather than be drawn. What it
 * does not have: wind, a variable atmosphere, compressibility, or any flight
 * control system. The last of those matters when the aeroplane is a fighter;
 * see FIGHTER.
 *
 * Every function takes the aircraft as its last argument, so a second aeroplane
 * is mostly data. Mostly — the three places it is not are the attitude clamps in
 * step(), the thrust lapse in forces(), and the limiter, all of which are now
 * driven off fields on the aircraft rather than off constants that only ever
 * described a Cessna.
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
  /* Thrust lapse: a propeller cannot hold static thrust to flying speed, so it
     falls linearly and then floors. These two numbers used to be written into
     forces() as 90 and 0.35, which quietly applied a propeller curve to every
     aircraft the model would ever carry. */
  Tv0: 90,        // m/s — speed at which the linear lapse would reach zero
  Tfloor: 0.35,   // fraction of static thrust the lapse never falls below
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

  /* Attitude clamps. Not physics — guard rails, marking where this model stops
     being a fair description of the aeroplane. They were literals in step();
     they are here so that an aircraft which genuinely banks past 69° can say so
     rather than be silently held back by a Cessna's limits. */
  phiMax: 1.20,   // rad — ±69°, which caps a level turn at 1/cos φ = 2.8 g
  thetaMin: -0.45,
  thetaMax: 0.50, // rad — ±26°/29°, past which a light single is not being flown
  gammaMax: 0.50, // rad — ±29° of flight path angle

  /* No nMax. A 172 has a placarded limit but nothing enforces it in the air, so
     the field is absent and alphaCap() below returns Infinity for this aircraft:
     no limiter, and every Part I lesson untouched. Its absence is also what
     makes the Cessna the wrong aeroplane for chapter 15 — with no G limit there
     is nothing for the lift limit to meet, and so no corner. */
};

/* A General Dynamics F-16A, Block 32, clean.
 *
 * Converted to SI from JSBSim's `f16` aircraft definition (github.com/JSBSim-
 * Team/jsbsim, GPL, by Erik Hofman), whose aerodynamic tables are in turn the
 * wind-tunnel data published in NASA TP-1538 — Nguyen, Ogburn, Gilbert, Kibler,
 * Brown and Deal, "Simulator Study of Stall/Post-Stall Characteristics of a
 * Fighter Airplane With Relaxed Longitudinal Static Stability", December 1979.
 * Both are public and unclassified. Nothing here comes from a performance chart
 * chosen to make the picture look right.
 *
 * The model wants single constants; the sources are tables. Every derivative
 * below is read at α = 0 and, where it is also a function of sideslip, as the
 * slope of the β table through zero — the same reduction the c172x entry above
 * describes. That is a real loss: the F-16's derivatives move a lot with angle
 * of attack, and this aeroplane is only honest at low α. The tables are not
 * carried, because a lookup table is not what chapter 15 is about.
 *
 * One number here is NOT measured, and it is called out where it appears: Cma.
 */
export const FIGHTER = {
  /* 21 116 lb = 17 400 empty + 230 pilot + half internal fuel (3486 of 6972),
     every term from f16.xml. The inertias are TP-1538's, quoted at that report's
     own reference weight rather than at this one — the same small inconsistency
     the 172 above carries, and for the same reason: the inertias are measured
     and the loading is a choice. */
  m: 9578,        // kg — 21 116 lb
  S: 27.87,       // m² — wing area (300 ft²)
  b: 9.144,       // m  — span (30 ft)
  c: 3.450,       // m  — mean aerodynamic chord (11.32 ft)
  Iyy: 75674,     // kg·m² — pitch inertia (55 814 slug·ft²)

  /* Lift, from the NASA CL(α, δh) table at δh = 0. CL0 and CLa are a least-
     squares line through α = 0…15°, which is where the table is straight. */
  CL0: 0.10,      // table value at α = 0
  CLa: 3.59,      // per radian — low for a wing this size, and that is the point
                  //   of an aspect ratio of 3: a delta trades slope for stall α
  /* CLmax is the lift at the flight control system's angle-of-attack limit, not
     at the aerodynamic peak. The wind-tunnel data keeps climbing to CL 1.83 at
     35°, but f16.xml's own comment says the flight computer "commands full down
     elevator" by 30°, so 30° is where the aeroplane actually stops. 1.74 is the
     table value there. Using 1.83 would put corner speed 3% low on lift the
     aeroplane is not allowed to use. */
  CLmax: 1.74,    // CL at α = 30°, δh = 0
  aStall: 0.5236, // rad — 30°, the FLCS limit, which for this aircraft arrives
                  //   before the aerodynamic stall rather than after it
  /* Drag, fitted to the NASA CD(α, δh = 0) table over α = 0…25° as CD = CD0 +
     k·CL² with CD0 pinned at the measured α = 0 value. A single parabola cannot
     hold a delta's vortex drag across that range: this fit runs ~30% high at
     cruise CL and ~10% low at the limiter. It is a fit, not a measurement. */
  CD0: 0.019,
  k: 0.207,       // e ≈ 0.71 at AR 3.0, which is about right for the planform

  /* Pitch. Cm0, Cmq and Cmde are read off the NASA tables at α = 0 (Cmde as the
     least-squares slope across the full ±25° stabilator row).

     Cma IS NOT MEASURED, AND IS THE ONLY SUCH NUMBER IN THIS FILE.
     The airframe's own value, from the same table and after the CG offset
     f16.xml applies, is about −0.02 per radian: neutral. That is the "relaxed
     longitudinal static stability" of the report's title, and it is exactly why
     the real aeroplane cannot be flown without its flight control system — which
     JSBSim models and this file does not. Shipping −0.02 here would produce an
     unflyable sandbox and a chapter about a thing nobody can do.
     So what is carried is an EFFECTIVE CLOSED-LOOP stiffness standing in for the
     airframe plus its FLCS: −0.18 per radian, which is −CLa × 0.05, a 5% mean-
     chord static margin. Five per cent is the low end of the conventional stable
     range and it is chosen low on purpose — much more and the ±25° stabilator
     cannot trim the aeroplane to its own 30° α limit, so the corner that chapter
     15 rests on becomes unreachable. It is an approximation. demo() asserts what
     it produces (a damped short period, and an aeroplane that reaches its own
     limits) rather than asserting the number itself. */
  Cm0: -0.009,
  Cma: -0.18,     // ← approximated, closed-loop. See above.
  Cmq: -5.23,
  /* Zero, not omitted. Neither JSBSim's f16 nor TP-1538 publishes an α̇ term, so
     rather than invent one, Cmq carries the pitch damping alone. */
  Cmadot: 0,
  Cmde: -0.44,

  Ixx: 12875,     // kg·m² — roll inertia (9496 slug·ft²)
  Izz: 85552,     // kg·m² — yaw inertia (63 100 slug·ft²)

  /* Lateral-directional, per radian, at α = 0. Read about the NASA model's own
     aerodynamic reference point; the 9-inch vertical offset from there to the CG
     is not carried, which understates the dihedral effect by roughly a quarter.
     Clda is the flaperon alone — the real jet also rolls with its stabilators,
     which this table does not include, so the aeroplane here rolls at about
     90°/s where the real one manages 300°/s. Nothing in chapter 15 turns on roll
     rate; anything that does should not use this number. */
  CYb: -1.146, CYp: -0.188, CYr: 0.876, CYdr: 0.086,
  Clb: -0.092, Clp: -0.443, Clr: 0.063, Clda: 0.051, Cldr: 0.015,
  Cnb: 0.207, Cnp: -0.052, Cnr: -0.378, Cnda: 0.010, Cndr: -0.045,

  /* F100-PW-229, from JSBSim's engine file: 17 800 lbf military, 29 000 lbf
     augmented. Full throttle here is full afterburner. */
  Tmax: 129000,   // N — 29 000 lbf
  /* No lapse. JSBSim's own military-thrust table at sea level moves between
     0.92 and 1.02 of static across Mach 0…0.8 — a turbofan's ram recovery very
     nearly cancels its momentum drag — so flat is a better approximation for
     this aeroplane than any straight line through it. The propeller lapse that
     used to be hard-coded in forces() would have starved it by 3× at corner. */
  Tv0: Infinity,
  Tfloor: 1,
  mu: 0.02,       // f16.xml rolling friction, same as the 172's
  dEmax: 0.436,   // rad — stabilator, ±25°
  dAmax: 0.375,   // rad — flaperon, ±21.5°
  dRmax: 0.524,   // rad — rudder, ±30°
  gearArm: 0.874, // m — mains 34.4 in behind the CG (f16.xml gear and CG stations)

  /* Wider than the Cessna's because this aeroplane genuinely goes there: 9 g in
     a level turn needs 83.6° of bank, and the shipped ±69° clamp would have held
     it to 2.8 g — a fighter with a Cessna's ceiling, and no corner at all. */
  phiMax: 1.52,   // rad — 87°
  thetaMin: -0.60,
  thetaMax: 1.00, // rad — 30° of α on top of a climb still has to fit inside this
  gammaMax: 1.00, // rad — 57°

  /* The two ceilings, and the entire subject of chapter 15. f16.xml states them
     in its own words: "The F-16 has a G limit of 9G positive and 4G negative",
     and the flight computer "reduces pilot command to zero when alpha exceeds 28
     degrees and approaches 30". Only the positive limit is modelled — nothing in
     this course pushes negative G. */
  nMax: 9,
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

/* The angle of attack a flight control system will not let the pilot past.
 *
 * Two ceilings expressed as one angle, because the elevator only ever commands
 * one thing. Below corner speed the wing runs out of lift first and the ceiling
 * is aStall; above it the structure runs out of margin first and the ceiling is
 * whatever angle makes exactly nMax. Which of the two is lower depends on speed
 * alone, and the speed where they swap places IS corner velocity — so this
 * function is chapter 15, and cornerSpeed() below is just its crossing point
 * solved rather than searched.
 *
 * An aircraft with no nMax has no ceiling here at all. That is not an oversight:
 * a 172 has a placard and a pilot, not a flight computer, and pretending
 * otherwise would put a limiter into every Part I lesson.
 */
function alphaCap(V, ac) {
  if (!ac.nMax) return Infinity;
  const CLn = (ac.nMax * ac.m * G) / Math.max(0.5 * RHO * V * V * ac.S, 1e-6);
  return Math.min(ac.aStall, (CLn - ac.CL0) / ac.CLa);
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
   * thrust to flying speed, and without this the takeoff roll is fantasy. The
   * shape of the fall-off is the aircraft's, not the model's: a turbofan barely
   * lapses at all, and applying a propeller's curve to one starves it by 3×. */
  const T = controls.throttle * ac.Tmax * Math.max(ac.Tfloor, 1 - s.V / ac.Tv0);

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
      s.theta = clamp(s.theta, ac.thetaMin, ac.thetaMax);

      /* Roll and yaw: moments over inertias, exactly as pitch. */
      s.p += (f.Lroll / ac.Ixx) * h;
      s.r += (f.Nyaw / ac.Izz) * h;
      s.phi = clamp(s.phi + s.p * h, -ac.phiMax, ac.phiMax);

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
      s.gamma = clamp(s.gamma + dGamma * h, -ac.gammaMax, ac.gammaMax);

      /* The limiter, held as a clamp on the state rather than as a loop through
         the elevator — for exactly the reason phi and theta above are. A
         controller chasing a ceiling at 240 Hz overshoots it: an elevator
         version of this let a hard pull reach 12.6 g against a 9 g limit before
         it caught up, which would have taught the opposite of chapter 15. A
         clamp cannot overshoot. Pitch rate goes with it, the same way the
         nosewheel stop takes it on the ground. */
      const aCap = alphaCap(s.V, ac);
      if (s.theta - s.gamma > aCap) { s.theta = s.gamma + aCap; s.q = Math.min(s.q, 0); }

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
 * elevator holds the height, and the load factor is whatever falls out.
 *
 * Bank and height are held. SPEED IS NOT. The throttle sits at full and V goes
 * wherever thrust and drag take it over the minute, which for a 172 is a few
 * m/s and for a fighter in afterburner is most of the way to the far end of the
 * envelope — so `turnRate` here is the rate at the speed it settled at, which is
 * reported as `V`, and not the rate at the V you asked for. The load factor is
 * unaffected, because n = 1/cos φ in a level turn at any speed at all; that is
 * the thing this function exists to check. Anything that needs a turn at a
 * stated speed needs a throttle law this does not have. */
export function measureTurn(bankDeg, V = 45, ac = AIRCRAFT) {
  const want = (bankDeg * Math.PI) / 180;
  /* Feed-forward: the elevator that trims the aeroplane at the angle of attack
     this bank asks for, at whatever speed it is doing now. Cm is linear in both,
     so it is solved rather than hunted — the same solve trim() does at 1 g, at
     1/cos φ instead. This used to be the constant 0.30, which is very nearly the
     right answer for a 172 at 60° and nowhere near it for anything else; the
     feedback below then had to make up the difference through a standing error
     in flight path angle, which for a fighter meant flying into the ground. */
  const hold = (v) => {
    const CLneed = (ac.m * G) / (Math.cos(want) * 0.5 * RHO * v * v * ac.S);
    const a = (Math.min(CLneed, ac.CLmax) - ac.CL0) / ac.CLa;
    return (ac.Cm0 + ac.Cma * a) / (ac.Cmde * ac.dEmax);
  };
  let s = { ...trim(V, ac).state, h: 3000 };
  for (let i = 0; i < 240 * 60; i++) {
    const aileron = clamp((want - s.phi) * 3 - s.p * 2.5, -1, 1);
    const elevator = clamp(hold(s.V) - s.gamma * 9 - s.q * 1.6, -1, 1);
    s = step(s, { throttle: 1, elevator, aileron, rudder: 0 }, 1 / 240, ac).state;
  }
  const f = forces(s, { throttle: 1, elevator: 0 }, ac);
  return {
    bank: s.phi,
    n: f.n,
    nRef: 1 / Math.cos(s.phi),
    V: s.V,
    turnRate: (f.L * Math.sin(s.phi)) / (ac.m * s.V),
    turnRateRef: (G * Math.tan(s.phi)) / s.V,
  };
}

/* Speeds worth naming on screen, derived rather than hard-coded so they stay
 * true if the aircraft constants are edited. */
export function stallSpeed(ac = AIRCRAFT, loadFactor = 1) {
  return Math.sqrt((2 * loadFactor * ac.m * G) / (RHO * ac.S * ac.CLmax));
}

/* The hardest turn available at this speed, and which ceiling stopped it. Both
 * limits are the same statement — how much lift may be carried — arriving from
 * opposite directions: the wing's answer grows with speed, the structure's does
 * not move at all. An aircraft with no nMax is only ever lift-limited, which is
 * why this is flat and dull for a 172 and the whole of chapter 15 for a fighter.
 *
 * Instantaneous, not sustained: nothing here asks whether the engine can hold
 * the speed. That is chapter 17's question, not chapter 15's. */
export function turnPerformance(V, ac = AIRCRAFT) {
  const nLift = (0.5 * RHO * V * V * ac.S * ac.CLmax) / (ac.m * G);
  const n = Math.min(nLift, ac.nMax ?? Infinity);
  // Only the horizontal component of the pull turns you; √(n²−1) is that part.
  const turn = Math.sqrt(Math.max(0, n * n - 1));
  return {
    n, nLift,
    limit: ac.nMax && nLift > ac.nMax ? "structure" : "lift",
    rate: (G * turn) / V,                            // rad/s
    radius: turn > 0 ? (V * V) / (G * turn) : Infinity,  // m
  };
}

/* Corner speed: the one speed at which both ceilings bind at once, and therefore
 * where turn rate is highest. Below it you cannot pull the G; above it you are
 * not allowed to. It is the 1-g stall speed times √nMax, because it is the same
 * boundary read at a different load — which is why chapter 15 can redraw chapter
 * 9's V-n diagram rather than introduce a new one. */
export function cornerSpeed(ac = AIRCRAFT) {
  return ac.nMax ? stallSpeed(ac, ac.nMax) : null;
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

  /* ── the fighter ────────────────────────────────────────────────────────
     Chapter 15 stands or falls on one claim: that turn rate has a best speed,
     and that the best speed is the one where two different limits meet. It is
     checked twice below, because checking it once would prove nothing. The
     formula version is close to a tautology — rate rises with speed along the
     lift boundary and falls as g·√(n²−1)/V above it, for any numbers at all —
     so the second version flies the aeroplane instead, and the two are then
     required to agree. If they ever stop agreeing, the model has drifted away
     from the picture the chapter draws, and the picture is the thing to fix. */
  const fVs = stallSpeed(FIGHTER);
  assert(fVs > 45 && fVs < 75,
    `fighter stall speed ${fVs.toFixed(1)} m/s (${(fVs * 1.944).toFixed(0)} kt) is not a fighter's`);

  /* Lesson 9's claim once more, on something that can pull four times as hard.
     82° is as far as this goes on purpose: 83.6° of bank is 9 g, which is the
     limiter, and a turn held against the limiter has stopped being level. */
  const fTurns = [30, 45, 60, 70, 80, 82].map((b) => measureTurn(b, 200, FIGHTER));
  for (const t of fTurns) {
    const deg = ((t.bank * 180) / Math.PI).toFixed(0);
    assert(Math.abs(t.n - t.nRef) < 0.02,
      `fighter at ${deg}° bank pulls ${t.n.toFixed(3)}g, not 1/cos φ = ${t.nRef.toFixed(3)}g`);
  }
  const hard = fTurns[fTurns.length - 1];
  assert(hard.n > 7,
    `the fighter never got past ${hard.n.toFixed(1)}g in a level turn — the bank clamp is still a Cessna's`);

  /* The limiter, flown. Full back stick at four speeds: it must never buy more
     than nMax, and below corner it must run out of lift before it runs out of
     structural margin. Both halves matter — an earlier version of this limiter
     worked through the elevator instead of on the state and let a hard pull
     reach 12.6 g against a 9 g placard, which teaches the reverse of chapter 15. */
  const pull = (V, secs = 4) => {
    let p = { ...trim(V, FIGHTER).state, h: 12000 };
    let peakN = 0, peakA = 0;
    for (let i = 0; i < 240 * secs; i++) {
      const r = step(p, { throttle: 1, elevator: 1, aileron: 1, rudder: 0 }, 1 / 240, FIGHTER);
      p = r.state;
      peakN = Math.max(peakN, r.forces.n);
      peakA = Math.max(peakA, r.forces.alpha);
    }
    return { peakN, peakA, V: p.V, phi: p.phi };
  };
  for (const V of [200, 300, 400]) {
    const p = pull(V);
    assert(p.peakN <= FIGHTER.nMax + 0.05,
      `full back stick at ${V} m/s reached ${p.peakN.toFixed(2)}g against a ${FIGHTER.nMax}g limit`);
    assert(p.peakN > FIGHTER.nMax - 0.2,
      `full back stick at ${V} m/s only reached ${p.peakN.toFixed(2)}g — above corner the limit should be the thing that stops you`);
  }
  const slow = pull(120);
  assert(slow.peakN < FIGHTER.nMax - 1,
    `at 120 m/s the wing should run out first, but the aeroplane still pulled ${slow.peakN.toFixed(2)}g`);
  assert(slow.peakA <= FIGHTER.aStall + 1e-6,
    `angle of attack reached ${((slow.peakA * 180) / Math.PI).toFixed(1)}° past a ${((FIGHTER.aStall * 180) / Math.PI).toFixed(0)}° limit`);

  /* ── corner ── */
  const Vc = cornerSpeed(FIGHTER);
  assert(Vc > 140 && Vc < 210,
    `corner speed ${Vc.toFixed(0)} m/s (${(Vc * 1.944).toFixed(0)} kt) is outside the band a clean fighter belongs in`);

  /* Rate against speed, from the formulae. The assertion is not that the peak is
     at any particular number — it is that there IS a peak, strictly inside the
     sweep. A curve that only ever rises would mean faster is always better, and
     the chapter's misconception would be true. */
  const sweep = [];
  for (let V = 80; V <= 420; V += 5) sweep.push({ V, ...turnPerformance(V, FIGHTER) });
  let pk = 0;
  sweep.forEach((p, i) => { if (p.rate > sweep[pk].rate) pk = i; });
  assert(pk > 0 && pk < sweep.length - 1,
    "turn rate does not peak inside the speed sweep — it rises monotonically, and there is no corner");
  assert(Math.abs(sweep[pk].V - Vc) < 0.06 * Vc,
    `turn rate peaks at ${sweep[pk].V} m/s but corner speed is ${Vc.toFixed(0)} m/s — the peak is not where the limits cross`);
  const pkRate = (sweep[pk].rate * 180) / Math.PI;
  assert(pkRate > 20 && pkRate < 35,
    `best instantaneous turn rate ${pkRate.toFixed(1)}°/s is not plausible for a 9 g fighter at sea level`);
  assert(sweep[pk].limit === "structure" || sweep[pk + 1].limit === "structure",
    "the peak is not at the hand-over between the two limits");

  /* And the chapter's actual claim, which is about what happens past the corner
     rather than at it: every extra knot from here costs rate and buys radius. */
  for (let i = pk + 1; i < sweep.length; i++) {
    assert(sweep[i].rate < sweep[i - 1].rate,
      `past corner, turn rate rises again at ${sweep[i].V} m/s`);
    assert(sweep[i].radius > sweep[i - 1].radius,
      `past corner, turn radius stops growing at ${sweep[i].V} m/s`);
  }

  /* The same peak, flown: roll hard, pull hard, and read the heading rate the
     aeroplane is actually making at the speed it is actually doing. Speed bleeds
     while this happens — at the top of the envelope a fighter cannot hold a
     corner turn for more than a second or two, which is exactly why the rate is
     called instantaneous — so each rate is paired with the speed it was measured
     at rather than with the speed it started from. */
  const flown = [];
  for (let V0 = 100; V0 <= 400; V0 += 10) {
    let p = { ...trim(V0, FIGHTER).state, h: 12000 };
    const u = { throttle: 1, elevator: 1, aileron: 1, rudder: 0 };
    for (let i = 0; i < 240 * 1.6; i++) p = step(p, u, 1 / 240, FIGHTER).state;
    const f = forces(p, u, FIGHTER);
    flown.push({ V: p.V, rate: (f.L * Math.sin(p.phi)) / (FIGHTER.m * p.V) });
  }
  flown.sort((a, b) => a.V - b.V);
  let fpk = 0;
  flown.forEach((p, i) => { if (p.rate > flown[fpk].rate) fpk = i; });
  assert(fpk > 0 && fpk < flown.length - 1,
    "flown turn rate does not peak inside the sweep — the aeroplane disagrees with the diagram");
  assert(Math.abs(flown[fpk].V - Vc) < 0.15 * Vc,
    `flown peak at ${flown[fpk].V.toFixed(0)} m/s is nowhere near the computed corner ${Vc.toFixed(0)} m/s`);
  assert(Math.abs(flown[fpk].rate - sweep[pk].rate) < 0.1 * sweep[pk].rate,
    `flown best rate ${((flown[fpk].rate * 180) / Math.PI).toFixed(1)}°/s and computed ` +
    `${pkRate.toFixed(1)}°/s disagree by more than a tenth`);

  /* The Cma approximation, checked by what it produces rather than by its value:
     an aeroplane that restores itself in pitch and has a short period a fighter
     pilot would recognise. If this ever fails, the honest fix is to say so in
     the FIGHTER comment, not to move the number until it passes. */
  const fModes = measureModes(250, FIGHTER);
  assert(fModes.staticallyStable,
    "the fighter's effective Cma is not restoring — the closed-loop stand-in has stopped standing in");
  assert(fModes.shortPeriod > 0.7 && fModes.shortPeriod < 4,
    `fighter short period ${fModes.shortPeriod.toFixed(2)}s is not a fighter's`);

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
  console.log(
    `ok — fighter Vs ${fVs.toFixed(1)} m/s (${(fVs * 1.944).toFixed(0)} kt) · ` +
    `corner ${Vc.toFixed(1)} m/s (${(Vc * 1.944).toFixed(0)} kt) · ` +
    `short period ${fModes.shortPeriod.toFixed(2)}s\n` +
    `   turn        — ${((hard.bank * 180) / Math.PI).toFixed(0)}° bank pulls ` +
    `${hard.n.toFixed(2)}g (1/cos φ = ${hard.nRef.toFixed(2)}g)\n` +
    `   corner      — best rate ${pkRate.toFixed(1)}°/s at ${sweep[pk].V} m/s, ` +
    `radius ${sweep[pk].radius.toFixed(0)}m, ${sweep[pk].n.toFixed(1)}g` +
    ` · flown ${((flown[fpk].rate * 180) / Math.PI).toFixed(1)}°/s at ${flown[fpk].V.toFixed(0)} m/s`
  );
}

