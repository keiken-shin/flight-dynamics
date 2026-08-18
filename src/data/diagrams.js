/* Every authored figure in the project. Each builder returns a complete SVG.
   Colour is never named here — only semantic kinds — so §1 holds by construction. */

import {
  line, arrow, component, moment, arc, path, dashed, poly, blob, dot,
  chip, note, aircraft, cgMark, airfoil, frame, curve, figure,
  turnCircle, trackPath,
} from "./svg.js";
/* Chapter 15's two plates are the only figures drawn from a second aeroplane,
   and the only ones whose geometry is a real distance in metres. Importing the
   model rather than transcribing its output is the point: if the FIGHTER
   constants move, the drawings move with them, and a figure can never quietly
   disagree with the simulator the reader is about to fly. */
import {
  FIGHTER, G as GRAV, RHO, forces, stallSpeed, cornerSpeed, turnPerformance,
} from "../sim/flight-model.js";

const R = (d) => (d * Math.PI) / 180;
const cos = (d) => Math.cos(R(d)), sin = (d) => Math.sin(R(d));
/* Point at distance `m` from (cx,cy) along screen-angle `a` (0 = right, y down). */
const at = (cx, cy, a, m) => [cx + m * cos(a), cy + m * sin(a)];

const D = {};

/* ══ four-forces ══════════════════════════════════════════════════════════ */

/* Lesson 1's two plates get their own taller box. The four forces make a
   plus-sign, which wants a squarer frame than the 800x500 landscape default —
   in the wide box the drawing sat small in the middle with air all round it.
   Here the airframe is drawn large and the arrows reach past it. */
const FF_VB = "0 0 700 540";

D["four-forces/level"] = () => {
  const CX = 350, CY = 242, L = 190, S = 1.2;
  return figure({
    vb: FF_VB,
    title: "The four forces in steady level flight",
    desc: "A light aircraft in side view, nose left. Four force arrows radiate from the centre of gravity — lift up, weight down, thrust forward, drag aft — all drawn the same length, because in steady level flight lift balances weight and thrust balances drag.",
    captions: [
      "An aircraft, and its centre of gravity.",
      "Weight always pulls toward the earth, from the centre of gravity.",
      "Lift opposes it. Here they are equal — so the aircraft holds its altitude.",
      "Thrust and drag balance too. All four equal: nothing changes.",
    ],
    states: [
      aircraft({ cx: CX, cy: CY, scale: S }),
      arrow(CX, CY, CX, CY + L, "weight") + chip(CX, CY + L + 22, "W — weight", "weight"),
      arrow(CX, CY, CX, CY - L, "lift") + chip(CX, CY - L - 22, "L — lift", "lift"),
      arrow(CX, CY, CX - L, CY, "thrust") + chip(CX - L - 50, CY - 26, "T — thrust", "thrust") +
      arrow(CX, CY, CX + L, CY, "drag") + chip(CX + L + 44, CY - 26, "D — drag", "drag"),
    ],
  });
};

D["four-forces/climb"] = () => {
  const CX = 350, CY = 252, W = 152, g = 30, S = 1.2;
  const fwd = 180 + g;                       // flight path, forward and up-left
  /* Screen angles run clockwise because y grows downward, so the sky side of a
     flight path at `fwd` is `fwd + 90`, not `fwd - 90`. These two were the wrong
     way round: lift was drawn pointing at the ground and the weight component it
     answers was drawn pointing at the sky. */
  const [lx, ly] = at(CX, CY, fwd + 90, W * cos(g));   // lift ⟂ path, magnitude W cos γ
  const [px, py] = at(CX, CY, fwd - 90, W * cos(g));   // the weight component it answers
  const [tx, ty] = at(CX, CY, fwd, 145);
  const [dx, dy] = at(CX, CY, fwd - 180, 70);
  const [fa] = [at(CX, CY, fwd, 180)], [fb] = [at(CX, CY, fwd - 180, 150)];
  return figure({
    vb: FF_VB,
    title: "Why lift is less than weight in a steady climb",
    desc: "The same aircraft in a steady 30-degree climb. Weight is unchanged and still points straight down, but lift acts perpendicular to the flight path and so only has to balance the component of weight across that path. The lift arrow is visibly shorter than the weight arrow, and thrust is visibly longer than drag.",
    captions: [
      "A steady climb. The flight path now sits at an angle to the horizon.",
      "Weight has not changed. It still pulls straight down, toward the earth.",
      "But lift answers to the flight path — and only this much of weight lies across it.",
      "So lift is less than weight. Thrust is more than drag. Nothing is balanced.",
    ],
    states: [
      dashed(CX - 170, CY, CX + 190, CY) + dashed(fa[0], fa[1], fb[0], fb[1]) +
        arc(CX, CY, 72, 180, fwd) + chip(...at(CX, CY, 180 + g / 2, 94), "γ", "angle", { small: true }) +
        aircraft({ cx: CX, cy: CY, rot: g, scale: S }),
      arrow(CX, CY, CX, CY + W, "weight") + chip(CX - 4, CY + W + 24, "W — weight", "weight"),
      component(CX, CY, px, py, "weight") + dashed(px, py, CX, CY + W) +
        chip(px - 56, py + 14, "W cos γ", "weight", { small: true }),
      arrow(CX, CY, lx, ly, "lift") + chip(lx + 52, ly - 6, "L — lift", "lift") +
      arrow(CX, CY, tx, ty, "thrust") + chip(tx - 20, ty - 26, "T — thrust", "thrust") +
      arrow(CX, CY, dx, dy, "drag") + chip(dx + 56, dy + 16, "D — drag", "drag"),
    ],
  });
};

/* ══ how-lift-works ═══════════════════════════════════════════════════════ */

D["how-lift-works/wrong-vs-right"] = () => {
  const wing = (cy) => airfoil({ cx: 400, cy, c: 300, aoa: 4 });
  /* Parcel positions: upper travels further per unit time in the real flow. */
  const pair = (cy, upX, loX) => dot(upX, cy - 13, "high", 6) + dot(loX, cy + 11, "low", 6);
  return figure({
    title: "The wrong model of lift, and the measured flow",
    desc: "Two identical wing sections. In the upper one, two air parcels that split at the leading edge are drawn arriving together at the trailing edge — the equal transit time story. In the lower one, measured flow is shown instead: the upper parcel arrives well before the lower one and they never rejoin.",
    captions: [
      "Two parcels of air split at the leading edge. What happens next?",
      "The popular story: they must meet again at the trailing edge, so the top one hurries.",
      "Measured flow says otherwise. The upper parcel arrives early — and they never rejoin.",
    ],
    states: [
      wing(160) + wing(340) +
        dashed(180, 160, 250, 160) + dashed(180, 340, 250, 340) +
        dot(258, 147, "high", 6) + dot(258, 171, "low", 6) +
        dot(258, 327, "high", 6) + dot(258, 351, "low", 6) +
        note(400, 96, "the equal-transit-time story") + note(400, 276, "what is actually measured"),
      pair(160, 545, 545) + chip(628, 150, "arrive together", "ref", { small: true }) +
        line(545, 128, 545, 192, "ref", "dash"),
      pair(340, 604, 512) + chip(672, 330, "early", "high", { small: true }) +
        chip(468, 372, "late", "low", { small: true }) +
        line(604, 308, 604, 372, "ref", "dash") +
        note(400, 424, "If the top parcel had to keep pace, inverted flight would be impossible. It is not."),
    ],
  });
};

D["how-lift-works/downwash"] = () => {
  const CY = 230;
  const stream = (y, bend) => poly(
    [[130, y], [300, y], [420, y + bend * 0.35], [560, y + bend], [690, y + bend * 1.25]], "flow", { cls: "dash" });
  return figure({
    title: "Lift as a reaction to deflected air",
    desc: "Air arrives horizontally, passes the wing, and leaves angled downward. The wing pushes the air down, so the air pushes the wing up. The upward reaction force on the wing is drawn from the section.",
    captions: [
      "Air arrives at the wing travelling level.",
      "It leaves travelling downward. The wing has thrown it down.",
      "Every push has an equal push back. The air pushes the wing up — that is lift.",
    ],
    states: [
      airfoil({ cx: 400, cy: CY, c: 210, aoa: 8 }) +
        stream(150, 0) + stream(190, 0) + stream(280, 0) + stream(320, 0) +
        chip(150, 118, "relative wind", "flow", { small: true }),
      stream(150, 46) + stream(190, 52) + stream(280, 44) + stream(320, 38) +
        chip(690, 392, "downwash", "flow", { small: true }),
      arrow(400, CY, 400, CY - 132, "lift") + chip(400, 72, "L — lift", "lift"),
    ],
  });
};

D["how-lift-works/inverted"] = () => figure({
  title: "Inverted flight falsifies the equal-transit-time story",
  desc: "An aircraft flying upside down. Its wing is inverted, so the curved surface now faces the ground, yet lift still points away from the ground toward the aircraft's belly. The pilot holds a positive angle of attack relative to the airflow, which is what produces lift.",
  captions: [
    "The same wing, flown upside down.",
    "The curved surface now faces the ground — the popular story predicts lift downward.",
    "Yet the aircraft flies. Angle of attack, not the shape of the top surface, is what matters.",
  ],
  states: [
    aircraft({ cx: 400, cy: 250, rot: 180 }) +
      dashed(150, 250, 650, 250) + chip(126, 250, "flight path", "ref", { small: true }),
    airfoil({ cx: 400, cy: 356, c: 150, aoa: 188 }) +
      arc(400, 356, 54, 180, 172) + chip(330, 344, "α", "angle", { small: true }) +
      dashed(300, 356, 520, 356),
    arrow(400, 250, 400, 118, "lift") + chip(400, 92, "L — lift", "lift") +
      arrow(400, 250, 400, 390, "weight") + chip(400, 414, "W — weight", "weight"),
  ],
});

/* ══ airfoil-and-stall ════════════════════════════════════════════════════ */

/* C_L rises almost linearly with α, rounds over, then falls off a cliff. */
const CL = (t) => (t < 0.72 ? 1.18 * t / 0.72 * (1 - 0.18 * t) : 1.02 - 2.6 * (t - 0.72) ** 1.35);

D["airfoil-and-stall/cl-curve"] = () => {
  /* No underscore in the axis label — SVG text has no markdown, and a subscript
     would need a tspan for one glyph. Spell it out instead. */
  const f = frame({ xLabel: "angle of attack  α", yLabel: "lift coefficient" });
  const { X, Y } = f;
  const mark = (t, lbl) => dot(X(t), Y(CL(t)), "angle") + chip(X(t), Y(CL(t)) - 26, lbl, "angle", { small: true });
  return figure({
    title: "Lift coefficient against angle of attack, and the stall",
    desc: "A curve of lift coefficient against angle of attack. It rises nearly linearly, flattens as it approaches the critical angle, peaks, then drops sharply. The peak is the critical angle of attack; beyond it the wing is stalled.",
    captions: [
      "Lift coefficient against angle of attack. Nothing else is changing.",
      "At small angles the relationship is almost a straight line — more angle, more lift.",
      "It flattens, then peaks. This is the critical angle of attack.",
      "Past the peak, lift collapses. The wing is stalled — at any airspeed.",
    ],
    states: [
      f.s,
      curve(CL, X, Y, "lift", { to: 0.5 }) + mark(0.25, "small α"),
      curve(CL, X, Y, "lift", { from: 0.5, to: 0.72 }) + mark(0.72, "α critical") +
        line(X(0.72), Y(0), X(0.72), Y(CL(0.72)), "ref", "dash"),
      curve(CL, X, Y, "lift", { from: 0.72 }) +
        blob([[X(0.72), Y(0)], [X(1), Y(0)], [X(1), Y(CL(1))], [X(0.72), Y(CL(0.72))]], "drag") +
        chip(X(0.87), Y(0.42), "stalled", "drag", { small: true }),
    ],
  });
};

D["airfoil-and-stall/separation"] = () => {
  /* Four frames at increasing α; separation creeps forward from the trailing edge. */
  const step = (aoa, sep, ox) => {
    const cy = 250;
    let s = airfoil({ cx: ox, cy, c: 150, aoa });
    for (const dy of [-26, -18]) {
      const pts = [[ox - 96, cy + dy]];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, x = ox - 96 + t * 192;
        const broken = t > sep;
        pts.push([x, cy + dy - 12 * Math.sin(R(t * 180)) + (broken ? (t - sep) * 90 * (i % 2 ? 1 : -1) : 0)]);
      }
      s += poly(pts, broken2(sep), { cls: "dash" });
    }
    return s + chip(ox, 372, `α = ${aoa}°`, "angle", { small: true });
  };
  const broken2 = (sep) => (sep < 0.9 ? "drag" : "flow");
  return figure({
    title: "Flow separation as angle of attack increases",
    desc: "Four wing sections at increasing angles of attack. At low angle the flow follows the upper surface all the way to the trailing edge. As angle increases the flow detaches earlier and earlier, until most of the upper surface is separated and the wing is stalled.",
    captions: [
      "At a low angle, the air follows the upper surface all the way back.",
      "Steeper. The flow begins to detach near the trailing edge.",
      "Steeper again. The separated region creeps forward.",
      "Now most of the upper surface has let go. That is the stall.",
    ],
    states: [step(2, 1, 150), step(8, 0.78, 350), step(14, 0.5, 550), step(18, 0.22, 700)],
  });
};

D["airfoil-and-stall/any-speed"] = () => {
  const one = (ox, label, speed) =>
    airfoil({ cx: ox, cy: 240, c: 130, aoa: 17 }) +
    arc(ox, 240, 46, 180, 197) + chip(ox - 74, 224, "α crit", "angle", { small: true }) +
    dashed(ox - 90, 240, ox + 96, 240) +
    chip(ox, 336, label, "flow", { small: true }) + chip(ox, 372, speed, "drag", { small: true });
  return figure({
    title: "A wing stalls at one angle, at any airspeed",
    desc: "Three wings at three very different airspeeds — slow, cruise and fast — all held at the same critical angle of attack. All three are stalled. Airspeed does not determine the stall; angle of attack does.",
    captions: [
      "A slow aircraft, held at the critical angle. It stalls.",
      "At cruise speed, same angle. It stalls too.",
      "Fast, in a hard pull-up, same angle. Still stalls. Speed was never the cause.",
    ],
    states: [
      one(190, "slow", "stalled"),
      one(400, "cruise speed", "stalled"),
      one(610, "fast", "stalled") + note(400, 424, "One angle. Any speed. Any attitude."),
    ],
  });
};

/* ══ drag ═════════════════════════════════════════════════════════════════ */

const PARA = (t) => 0.06 + 0.9 * t * t;         // parasite drag ∝ V²
const IND = (t) => 0.035 / Math.max(t * t, 0.02); // induced drag ∝ 1/V²
const TOT = (t) => Math.min(PARA(t) + IND(t), 1.02);

D["drag/curves"] = () => {
  const f = frame({ xLabel: "airspeed  V", yLabel: "drag  D" });
  const { X, Y } = f;
  /* Minimum total drag — and therefore best L/D — sits where the two cross. */
  let best = 0.35, lo = 1e9;
  for (let t = 0.15; t < 1; t += 0.005) if (TOT(t) < lo) { lo = TOT(t); best = t; }
  return figure({
    title: "Parasite drag, induced drag, and where they cross",
    desc: "Two drag curves plotted against airspeed. Parasite drag rises with the square of speed. Induced drag falls as speed rises. Their sum is a U-shaped curve whose minimum — the best lift-to-drag speed — lies where the two component curves cross.",
    captions: [
      "Parasite drag: pushing the shape through the air. It grows fast with speed.",
      "Induced drag: the price of making lift. It shrinks as you speed up.",
      "Add them. The bottom of the U is your best speed — and slowing below it costs more, not less.",
    ],
    states: [
      f.s + curve(PARA, X, Y, "drag", { from: 0.1 }) + chip(X(0.86), Y(PARA(0.78)), "parasite", "drag", { small: true }),
      curve(IND, X, Y, "other", { from: 0.19 }) + chip(X(0.3), Y(IND(0.4)), "induced", "other", { small: true }),
      curve(TOT, X, Y, "lift", { from: 0.19 }) + chip(X(0.62), Y(TOT(0.55)) - 26, "total", "lift", { small: true }) +
        dot(X(best), Y(TOT(best)), "angle") + line(X(best), Y(0), X(best), Y(TOT(best)), "ref", "dash") +
        /* On its own drop line inside the plot, not under the axis: at Y(0)+26
           the chip's paper sat across "airspeed V", and an axis label is not
           something a chip may cover. Up here it still touches the line it
           names, so it needs no leader. */
        chip(X(best), Y(0) - 22, "best L/D", "angle", { small: true }) +
        blob([[X(0.19), Y(0)], [X(best), Y(0)], [X(best), Y(TOT(best))], [X(0.19), Y(TOT(0.19))]], "drag") +
        chip(X(0.26), Y(0) + 58, "slower costs more", "drag", { small: true }),
    ],
  });
};

D["drag/induced-chain"] = () => figure({
  title: "How a wingtip vortex becomes drag",
  desc: "A wing seen from behind. High pressure below and low pressure above drive air around the wingtip, forming a vortex. The vortex induces a downward component in the air over the wing, tilting the lift vector backward. The rearward part of that tilted vector is induced drag.",
  captions: [
    "Pressure is higher below the wing than above it.",
    "At the tip, air escapes around the end — and spins. That is the vortex.",
    "It tilts the local airflow down, tilting lift backward. The backward part is induced drag.",
  ],
  states: [
    poly([[220, 250], [580, 250]], "ink") + poly([[220, 250], [230, 244], [230, 256]], "ink") +
      chip(400, 196, "low pressure", "low", { small: true }) +
      chip(400, 306, "high pressure", "high", { small: true }) +
      /* Under the section, not over it. State 3 fills the top of the plate with
         L, the tilted lift and induced drag, and this note was printed
         underneath all three of them. Below the high-pressure chip nothing else
         hangs, and the note still sits with the wing it names. */
      note(400, 348, "wing seen from behind"),
    path("M 580 250 C 634 250 652 214 626 190 C 604 170 566 182 566 212", "flow") +
      path("M 220 250 C 166 250 148 214 174 190 C 196 170 234 182 234 212", "flow") +
      chip(668, 176, "vortex", "flow", { small: true }),
    arrow(400, 250, 400, 130, "lift") + chip(352, 118, "L", "lift", { small: true }) +
      arrow(400, 250, 452, 138, "other", { trim: 0 }) + chip(510, 128, "tilted lift", "other", { small: true }) +
      arrow(400, 130, 452, 138, "drag", { trim: 0 }) + chip(478, 96, "induced drag", "drag", { small: true }),
  ],
});

/* ══ axes-and-controls ════════════════════════════════════════════════════ */

D["axes-and-controls/three-axes"] = () => {
  const CX = 400, CY = 250;
  return figure({
    title: "The three axes through the centre of gravity",
    desc: "An aircraft with three axes drawn through its centre of gravity: the longitudinal axis running nose to tail about which it rolls, the lateral axis running wingtip to wingtip about which it pitches, and the vertical axis about which it yaws.",
    captions: [
      "Every rotation an aircraft makes happens about its centre of gravity.",
      "Nose to tail: the roll axis.",
      "Wingtip to wingtip: the pitch axis.",
      "Straight through, top to bottom: the yaw axis.",
    ],
    states: [
      aircraft({ cx: CX, cy: CY }),
      dashed(CX - 190, CY, CX + 200, CY) + moment(CX + 96, CY, 40, 210, 150) +
        chip(CX + 214, CY - 26, "roll", "moment", { small: true }),
      dashed(CX, CY, CX, CY) + dot(CX, CY, "ref", 4) + moment(CX, CY - 96, 42, 168, 12) +
        chip(CX + 6, CY - 152, "pitch", "moment", { small: true }) +
        note(CX - 128, CY + 34, "pitch axis points into the page"),
      dashed(CX, CY - 150, CX, CY + 150) + moment(CX, CY + 112, 40, 120, 60) +
        chip(CX, CY + 178, "yaw", "moment", { small: true }),
    ],
  });
};

D["axes-and-controls/control-surfaces"] = () => {
  const CX = 400, CY = 240;
  return figure({
    title: "Each control surface commands one axis",
    desc: "Three views of the same aircraft. Deflecting the ailerons produces a rolling moment, deflecting the elevator produces a pitching moment, and deflecting the rudder produces a yawing moment.",
    captions: [
      "Three surfaces. Each one is a way of making a moment.",
      "Ailerons move opposite each other — one wing gains lift, the other loses it. Roll.",
      "The elevator changes the tail's download. Pitch.",
      "The rudder pushes the tail sideways. Yaw — which is not the same as turning.",
    ],
    states: [
      aircraft({ cx: CX, cy: CY, scale: 0.9 }),
      arrow(CX - 120, CY - 6, CX - 120, CY - 76, "lift", { trim: 0 }) +
        arrow(CX + 60, CY - 6, CX + 60, CY + 60, "weight", { trim: 0 }) +
        moment(CX, CY, 108, 200, 160) + chip(CX - 4, CY - 132, "roll ← ailerons", "moment", { small: true }),
      arrow(CX + 150, CY - 22, CX + 150, CY + 44, "other", { trim: 0 }) +
        moment(CX, CY, 74, 150, 30) + chip(CX + 214, CY + 66, "pitch ← elevator", "moment", { small: true }),
      moment(CX, CY + 128, 44, 118, 62) + chip(CX, CY + 196, "yaw ← rudder", "moment", { small: true }),
    ],
  });
};

D["axes-and-controls/adverse-yaw"] = () => figure({
  title: "Adverse yaw: the aileron yaws you the wrong way",
  desc: "An aircraft seen from above rolling to the left. The down-going right aileron makes more lift on that wing, but it also makes more induced drag there. The extra drag on the rising wing pulls the nose toward the right — away from the intended turn.",
  captions: [
    "Seen from above, rolling left. The right aileron goes down.",
    "That wing makes more lift — and with it, more induced drag.",
    "The extra drag drags that wing back. The nose yaws right, away from the turn. The rudder fixes it.",
  ],
  states: [
    poly([[400, 130], [400, 372]], "ink") + poly([[220, 250], [580, 250]], "ink") +
      chip(400, 106, "nose", "ref", { small: true }) +
      moment(400, 250, 118, 250, 200) + chip(268, 152, "rolling left", "moment", { small: true }),
    arrow(548, 250, 548, 320, "drag", { trim: 0 }) + chip(612, 320, "more drag", "drag", { small: true }) +
      arrow(252, 250, 252, 296, "drag", { trim: 0 }) + chip(190, 300, "less", "drag", { small: true }),
    moment(400, 250, 62, 268, 316) + chip(474, 176, "nose yaws right", "moment", { small: true }) +
      note(400, 424, "Aileron alone turns you the wrong way first. That is what the rudder is for."),
  ],
});

/* ══ static-stability ═════════════════════════════════════════════════════ */

D["static-stability/marble"] = () => {
  const bowl = (ox, kind, up) => {
    const d = up
      ? `M ${ox - 90} 320 Q ${ox} 216 ${ox + 90} 320`      // dome
      : `M ${ox - 90} 236 Q ${ox} 340 ${ox + 90} 236`;     // basin
    return path(d, kind) + dot(ox, up ? 258 : 316, "ink", 13);
  };
  return figure({
    title: "Stable, unstable, and neutral",
    desc: "Three marbles. One rests at the bottom of a basin and rolls back when nudged — stable. One balances on top of a dome and rolls away when nudged — unstable. One sits on a flat surface and simply stays where it is put — neutral.",
    captions: [
      "Nudge this marble and it comes back. Stable.",
      "Nudge this one and it leaves. Unstable.",
      "This one just stays wherever you put it. Neutral.",
    ],
    states: [
      bowl(180, "lift", false) + chip(180, 386, "stable", "lift", { small: true }) +
        moment(180, 300, 58, 214, 326),
      bowl(400, "drag", true) + chip(400, 386, "unstable", "drag", { small: true }) +
        arrow(430, 250, 496, 286, "drag", { trim: 0 }),
      line(520, 316, 700, 316, "ref") + dot(610, 303, "ink", 13) +
        chip(610, 386, "neutral", "ref", { small: true }),
    ],
  });
};

D["static-stability/cg-ac-np"] = () => {
  const CY = 250;
  return figure({
    title: "Centre of gravity, aerodynamic centre, neutral point and static margin",
    desc: "An aircraft in side view with three marked stations along its length: the centre of gravity, the aerodynamic centre of the wing, and the neutral point of the whole aircraft. The distance from the centre of gravity back to the neutral point is the static margin, and it must be positive for the aircraft to be stable.",
    captions: [
      "Three points along the fuselage decide whether this aircraft is stable.",
      "The aerodynamic centre: where the wing's lift change effectively acts.",
      "The neutral point: where the whole aircraft's lift change acts, tail included.",
      "CG ahead of the neutral point — that gap is static margin. Positive means stable.",
    ],
    states: [
      aircraft({ cx: 400, cy: CY, cg: false }) + dashed(250, CY, 620, CY),
      dot(408, CY, "other") + chip(408, CY + 46, "aerodynamic centre", "other", { small: true }),
      dot(470, CY, "lift") + chip(524, CY + 90, "neutral point", "lift", { small: true }) +
        line(470, CY, 470, CY + 68, "ref", "dash"),
      cgMark(372, CY) + chip(300, CY - 62, "CG", "ink", { small: true }) +
        line(372, CY, 372, CY + 110, "ref", "dash") + line(470, CY, 470, CY + 110, "ref", "dash") +
        arrow(372, CY + 104, 470, CY + 104, "angle", { trim: 0 }) +
        chip(421, CY + 138, "static margin", "angle", { small: true }),
    ],
  });
};

D["static-stability/restoring"] = () => figure({
  title: "A pitch disturbance produces a restoring moment",
  desc: "An aircraft is disturbed nose-up by a gust. Because the centre of gravity is ahead of the neutral point, the increase in lift acts behind the centre of gravity and produces a nose-down moment that undoes the disturbance.",
  captions: [
    "Trimmed and steady.",
    "A gust pitches the nose up. Angle of attack increases.",
    "Extra lift appears behind the CG — and pushes the nose back down. That is stability.",
  ],
  states: [
    aircraft({ cx: 400, cy: 250 }) + dashed(210, 250, 600, 250),
    aircraft({ cx: 400, cy: 250, rot: 14 }) + arc(400, 250, 96, 180, 194) +
      chip(292, 232, "gust", "angle", { small: true }),
    arrow(470, 232, 470, 148, "lift", { trim: 0 }) + chip(470, 122, "extra lift", "lift", { small: true }) +
      moment(400, 250, 66, 320, 20) + chip(482, 336, "nose-down moment", "moment", { small: true }),
  ],
});

/* ══ longitudinal-modes ═══════════════════════════════════════════════════ */

D["longitudinal-modes/traces"] = () => {
  const f = frame({ xLabel: "time", yLabel: "deviation" });
  const { X, Y } = f;
  const short = (t) => 0.5 + 0.34 * Math.exp(-9 * t) * Math.cos(34 * t);
  const phug = (t) => 0.5 + 0.34 * Math.exp(-0.8 * t) * Math.cos(6.4 * t);
  return figure({
    title: "Short period and phugoid, on one time axis",
    desc: "Two traces of pitch deviation against time. The short period mode is a fast oscillation that damps out within a couple of seconds. The phugoid is a slow oscillation, much longer in period and only lightly damped, that continues for a long time.",
    captions: [
      "Disturb the pitch and let go. Two motions follow, at once.",
      "The short period: quick, sharp, and gone in seconds.",
      "The phugoid: slow, lazy, and it can go on for a minute or more.",
      "Both are happening together. Neither needs a pilot to sustain it.",
    ],
    states: [
      f.s + line(X(0), Y(0.5), X(1), Y(0.5), "ref", "dash"),
      curve(short, X, Y, "drag") + chip(X(0.24), Y(0.9), "short period", "drag", { small: true }),
      curve(phug, X, Y, "lift") + chip(X(0.68), Y(0.86), "phugoid", "lift", { small: true }),
      note(400, 424, "Controls locked. These are the aircraft's own natural motions."),
    ],
  });
};

D["longitudinal-modes/energy"] = () => {
  const C = [400, 240], r = 118;
  const nodeAt = (a, label, kind) => {
    const [x, y] = at(C[0], C[1], a, r);
    return dot(x, y, kind) + chip(x, y - 34, label, kind, { small: true });
  };
  return figure({
    title: "The phugoid as an exchange of height for speed",
    desc: "A circular loop showing the phugoid cycle. The aircraft trades altitude for airspeed and back again: descending it speeds up, which generates extra lift and pitches it up, which trades that speed back for height, and the cycle repeats.",
    captions: [
      "High and slow.",
      "It sinks — and sinking, it gains speed.",
      "Fast now, it makes more lift than it needs, and climbs.",
      "Climbing costs speed. Back to high and slow. The cycle repeats, slowly.",
    ],
    states: [
      moment(C[0], C[1], r, 265, 260) + nodeAt(270, "high, slow", "lift"),
      nodeAt(0, "descending", "other"),
      nodeAt(90, "low, fast", "drag"),
      nodeAt(180, "climbing", "thrust") +
        note(400, 424, "Total energy barely changes. It just moves between height and speed."),
    ],
  });
};

/* ══ lateral-modes ════════════════════════════════════════════════════════ */

D["lateral-modes/dutch-roll"] = () => {
  const topY = 170, rearY = 320;
  const tick = (t) => 260 + t * 300;
  return figure({
    title: "Dutch roll: yaw and roll coupled together",
    desc: "The same motion shown twice on a shared time cursor. Seen from above, the nose wags left and right. Seen from behind, the wings rock in roll. The two are a quarter cycle apart, which makes the wingtip trace a shallow oval.",
    captions: [
      "From above: the nose wags from side to side.",
      "From behind: at the same time, the wings rock.",
      "The two are out of step by a quarter cycle — so a wingtip traces an oval.",
    ],
    states: [
      note(140, topY, "from above") +
        poly([[260, topY], [560, topY]], "ref", { cls: "dash" }) +
        curve((t) => 0.5 + 0.4 * Math.cos(t * 12), (v) => tick(v), (v) => topY + (v - 0.5) * 80, "moment"),
      note(140, rearY, "from behind") +
        poly([[260, rearY], [560, rearY]], "ref", { cls: "dash" }) +
        curve((t) => 0.5 + 0.4 * Math.sin(t * 12), (v) => tick(v), (v) => rearY + (v - 0.5) * 80, "lift"),
      `<ellipse class="stroke k-angle" cx="660" cy="245" rx="52" ry="30" fill="none"/>` +
        chip(660, 190, "wingtip path", "angle", { small: true }) +
        line(tick(0.5), topY - 44, tick(0.5), rearY + 44, "ref", "dash"),
    ],
  });
};

D["lateral-modes/root-locus"] = () => {
  const CX = 400, CY = 240;
  return figure({
    title: "The three lateral modes on one plane",
    desc: "A complex plane with the real axis horizontal. Roll subsidence sits far to the left on the real axis, heavily damped. Dutch roll sits as a complex pair, lightly damped and oscillatory. The spiral mode sits just to the right of the origin, slowly divergent.",
    captions: [
      "Left of the line is stable. Right of it is not. Distance from the line is how fast.",
      "Roll subsidence: far left. Any roll rate dies almost immediately.",
      "Dutch roll: a complex pair. It oscillates, and it only just damps.",
      "Spiral: barely to the right. Slowly divergent — and deliberately so.",
    ],
    states: [
      line(160, CY, 660, CY, "ref", "axis") + line(CX, 96, CX, 384, "ref", "axis") +
        chip(206, CY + 34, "stable", "lift", { small: true }) +
        chip(600, CY + 34, "unstable", "drag", { small: true }),
      dot(224, CY, "lift", 7) + chip(224, CY - 34, "roll subsidence", "lift", { small: true }),
      dot(346, CY - 74, "moment", 7) + dot(346, CY + 74, "moment", 7) +
        chip(300, CY - 108, "dutch roll", "moment", { small: true }),
      dot(432, CY, "drag", 7) + chip(482, CY - 36, "spiral", "drag", { small: true }) +
        note(400, 424, "A spirally-stable aircraft is unpleasantly stiff in roll. This is a trade, not a fault."),
    ],
  });
};

/* ══ turning-flight ═══════════════════════════════════════════════════════ */

D["turning-flight/bank"] = () => {
  const CX = 400, CY = 260, W = 130, b = 45;
  const Ltot = W / cos(b);
  const [lx, ly] = at(CX, CY, 270 + b, Ltot);
  return figure({
    title: "Resolving lift in a banked turn",
    desc: "An aircraft seen from behind, banked 45 degrees. Lift acts perpendicular to the wings, so it tilts with them. Its vertical component must still equal weight, which means the total lift vector has to grow. The leftover horizontal component is what turns the aircraft.",
    captions: [
      "Level. Lift straight up, equal to weight.",
      "Bank it. Lift tilts with the wings — and now only part of it points up.",
      "The vertical part must still equal weight, so total lift has to grow.",
      "The sideways part is what curves the flight path. That is the turn.",
    ],
    states: [
      aircraft({ cx: CX, cy: CY, rot: 0, scale: 0.8, cg: true }) +
        arrow(CX, CY, CX, CY - W, "lift") + chip(CX, CY - W - 24, "L", "lift", { small: true }) +
        arrow(CX, CY, CX, CY + W, "weight") + chip(CX, CY + W + 24, "W", "weight", { small: true }),
      arrow(CX, CY, lx, ly, "lift") + chip(lx + 26, ly - 20, "L, tilted", "lift", { small: true }) +
        arc(CX, CY, 66, 270, 270 + b) + chip(...at(CX, CY, 270 + b / 2, 88), "φ", "angle", { small: true }),
      component(CX, CY, CX, CY - W, "lift") + dashed(CX, CY - W, lx, ly) +
        chip(CX - 62, CY - W + 6, "L cos φ = W", "lift", { small: true }),
      component(CX, CY, lx, CY, "other") + dashed(lx, CY, lx, ly) +
        chip(lx + 24, CY + 30, "L sin φ turns you", "other", { small: true }),
    ],
  });
};

D["turning-flight/load-factor"] = () => {
  const f = frame({ xLabel: "bank angle  φ", yLabel: "load factor  n" });
  const { X, Y } = f;
  const NF = (t) => Math.min(1 / cos(t * 80) / 6, 1.02);
  const mark = (deg, lbl) => {
    const t = deg / 80, y = NF(t);
    return dot(X(t), Y(y), "angle") + line(X(t), Y(0), X(t), Y(y), "ref", "dash") + chip(X(t), Y(y) - 26, lbl, "angle", { small: true });
  };
  return figure({
    title: "Load factor and stall speed against bank angle",
    desc: "Load factor plotted against bank angle. It is one at wings level, two at sixty degrees of bank, and rises steeply beyond. Because stall speed rises with the square root of load factor, a sixty degree bank raises stall speed by forty-one percent.",
    captions: [
      "Wings level: load factor is one. You weigh what you weigh.",
      "Thirty degrees: about 1.15. Barely noticeable.",
      "Sixty degrees: exactly two. You and the aircraft now weigh double.",
      "And stall speed rises with the square root of that — up 41% at sixty degrees.",
    ],
    states: [
      f.s + curve(NF, X, Y, "other", { to: 0.94 }),
      mark(30, "n = 1.15"),
      mark(60, "n = 2"),
      mark(75, "n = 3.9") + note(400, 424, "The danger in a steep turn is not the angle. It is the stall speed that came with it."),
    ],
  });
};

D["turning-flight/vn"] = () => {
  const f = frame({ xLabel: "airspeed  V", yLabel: "load factor  n" });
  const { X, Y } = f;
  const stallPos = (t) => Math.min(t * t * 9, 0.78);
  const stallNeg = (t) => Math.max(-t * t * 5, -0.34);
  const Y2 = (v) => Y(0.35 + v * 0.55);
  return figure({
    title: "The V-n diagram",
    desc: "A manoeuvring envelope. Curved stall boundaries on the left limit how much load factor is available at low speed. Horizontal limits above and below are the structural limits. A vertical line on the right is the never-exceed speed. The enclosed region is where the aircraft may be flown.",
    captions: [
      "Speed across, load factor up. Where may this aircraft be flown?",
      "At low speed you simply cannot pull hard — the wing stalls first.",
      "High up, the airframe sets the limit. Pull past it and something bends.",
      "And there is a speed you must not exceed at all. Inside all of it: legal flight.",
    ],
    states: [
      /* The zero chip sits between the y-axis label and the axis, not on top of
         it: at X(0)-30 its paper clipped the bottom of the rotated "load factor
         n" — the label of the very quantity it is reading zero of. */
      f.s + line(X(0), Y2(0), X(1), Y2(0), "ref", "dash") + chip(X(0) - 20, Y2(0), "0", "ref", { small: true }),
      curve(stallPos, X, Y2, "lift", { to: 0.3 }) + curve(stallNeg, X, Y2, "lift", { to: 0.26 }) +
        chip(X(0.17), Y2(0.86), "stall boundary", "lift", { small: true }),
      line(X(0.294), Y2(0.78), X(0.86), Y2(0.78), "drag") +
        line(X(0.26), Y2(-0.34), X(0.86), Y2(-0.34), "drag") +
        chip(X(0.6), Y2(0.78) - 24, "structural limit", "drag", { small: true }),
      line(X(0.86), Y2(0.78), X(0.86), Y2(-0.34), "other") +
        chip(X(0.86), Y2(-0.34) + 30, "V_NE", "other", { small: true }) +
        blob([[X(0.294), Y2(0.78)], [X(0.86), Y2(0.78)], [X(0.86), Y2(-0.34)], [X(0.26), Y2(-0.34)]], "lift"),
    ],
  });
};

/* ══ flight-envelope ══════════════════════════════════════════════════════ */

D["flight-envelope/converge"] = () => {
  const f = frame({ xLabel: "airspeed  V", yLabel: "altitude" });
  const { X, Y } = f;
  const stall = (t) => 0.12 + 0.5 * t;         // stall speed rises with altitude
  const mach = (t) => 0.92 - 0.28 * t;         // limiting Mach falls with altitude
  return figure({
    title: "The flight envelope narrowing with altitude, and the coffin corner",
    desc: "Two boundaries plotted against altitude. Stall speed increases with altitude; the speed at which the critical Mach number is reached decreases with altitude. The gap between them narrows until they meet at a point called the coffin corner, where the aircraft can neither slow down nor speed up.",
    captions: [
      "Low down there is plenty of room between too slow and too fast.",
      "Climb, and the speed at which you stall keeps rising.",
      "At the same time the speed at which you meet Mach limits keeps falling.",
      "They meet. At the corner, there is one speed left — and no margin either side.",
    ],
    states: [
      f.s + chip(X(0.5), Y(0.06), "usable speed range", "ref", { small: true }),
      curve(stall, X, Y, "lift", { to: 0.94 }) + chip(X(0.24), Y(0.62), "stall", "lift", { small: true }),
      curve(mach, X, Y, "drag", { to: 0.94 }) + chip(X(0.82), Y(0.44), "Mach limit", "drag", { small: true }),
      blob([[X(stall(0)), Y(0)], [X(mach(0)), Y(0)], [X(mach(0.94)), Y(0.94)], [X(stall(0.94)), Y(0.94)]], "lift") +
        dot(X(0.62), Y(1.0), "angle") + chip(X(0.62), Y(1.0) - 28, "coffin corner", "angle", { small: true }),
    ],
  });
};

D["flight-envelope/shock"] = () => {
  const step = (ox, M, shockAt) =>
    airfoil({ cx: ox, cy: 232, c: 140, aoa: 3 }) +
    (shockAt ? line(ox + shockAt, 196, ox + shockAt, 226, "drag") : "") +
    (shockAt ? chip(ox + shockAt + 6, 172, "shock", "drag", { small: true }) : "") +
    chip(ox, 320, `M ${M}`, "flow", { small: true });
  return figure({
    title: "Shock formation on an aerofoil as Mach number rises",
    desc: "Four wing sections at increasing free-stream Mach number. Below the critical Mach number the flow is entirely subsonic. Above it a supersonic pocket forms on the upper surface, terminated by a shock wave that moves aft and strengthens as Mach number rises, driving a sharp increase in drag.",
    captions: [
      "Well below the speed of sound, the flow over the wing is subsonic everywhere.",
      "Faster: somewhere on the upper surface the air goes supersonic. That is critical Mach.",
      "A shock wave forms to slow it back down — and drag begins to climb steeply.",
      "Faster still, the shock strengthens and moves aft. This is the drag rise.",
    ],
    states: [step(150, "0.60", 0), step(340, "0.72", -6), step(530, "0.80", 18), step(700, "0.86", 40)],
  });
};

/* ══ equations-of-motion ══════════════════════════════════════════════════ */

D["equations-of-motion/frames"] = () => figure({
  title: "Body axes and earth axes",
  desc: "The same aircraft described in two reference frames. The earth frame is fixed to the ground with north, east and down axes. The body frame is fixed to the aircraft with x forward along the fuselage, y out the right wing and z downward through the belly, and rotates with the aircraft.",
  captions: [
    "The earth does not move. Fix a frame to it: north, east, down.",
    "But the aircraft does. Fix a second frame to the aircraft itself.",
    "The body frame tilts with the aircraft. Attitude is the relationship between the two.",
  ],
  states: [
    dashed(120, 380, 300, 380) + dashed(200, 300, 200, 400) +
      arrow(200, 380, 290, 380, "ref", { trim: 0 }) + chip(310, 380, "north", "ref", { small: true }) +
      arrow(200, 380, 200, 306, "ref", { trim: 0 }) + chip(200, 288, "up", "ref", { small: true }),
    aircraft({ cx: 470, cy: 220, rot: 18 }),
    arrow(470, 220, ...at(470, 220, 180 + 18, 118), "drag", { trim: 14 }) +
      chip(...at(470, 220, 180 + 18, 146), "x  forward", "drag", { small: true }) +
      arrow(470, 220, ...at(470, 220, 90 + 18, 96), "lift", { trim: 14 }) +
      chip(...at(470, 220, 90 + 18, 128), "z  down", "lift", { small: true }) +
      chip(624, 200, "y  out the right wing", "thrust", { small: true }) + dot(470, 220, "thrust", 6),
  ],
});

D["equations-of-motion/six-states"] = () => {
  const CX = 400, CY = 236;
  return figure({
    title: "Six numbers describe any motion",
    desc: "One aircraft with six quantities marked: three velocities along the body axes — forward, sideways and downward — and three rotation rates about them — roll rate, pitch rate and yaw rate. Together these six describe every motion an aircraft can make.",
    captions: [
      "Three ways to move.",
      "u forward, v sideways, w down. That covers every possible translation.",
      "Three ways to turn: p roll, q pitch, r yaw. Six numbers. Nothing else is needed.",
    ],
    states: [
      aircraft({ cx: CX, cy: CY }),
      arrow(CX, CY, CX - 128, CY, "thrust") + chip(CX - 172, CY, "u", "thrust", { small: true }) +
        arrow(CX, CY, CX, CY + 110, "lift") + chip(CX, CY + 136, "w", "lift", { small: true }) +
        dot(CX, CY, "other", 7) + chip(CX + 74, CY + 62, "v (into page)", "other", { small: true }),
      moment(CX - 128, CY, 34, 200, 160) + chip(CX - 128, CY - 62, "p", "moment", { small: true }) +
        moment(CX, CY - 86, 34, 168, 12) + chip(CX + 4, CY - 134, "q", "moment", { small: true }) +
        moment(CX + 128, CY + 62, 34, 120, 60) + chip(CX + 128, CY + 122, "r", "moment", { small: true }),
    ],
  });
};

D["equations-of-motion/gimbal-lock"] = () => {
  const ring = (cx, cy, rx, ry, kind, rot = 0) =>
    `<ellipse class="stroke ${kind === "ink" ? "k-ink" : "k-" + kind}" cx="${cx}" cy="${cy}"
      rx="${rx}" ry="${ry}" fill="none" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const CX = 400, CY = 230;
  return figure({
    title: "Gimbal lock, and why quaternions are used instead",
    desc: "Three nested gimbal rings representing roll, pitch and yaw angles. As pitch approaches ninety degrees, two of the three rings become aligned, so they now rotate about the same axis. One degree of freedom has been lost, and the attitude description breaks down.",
    captions: [
      "Three rings, three angles. Any attitude can be reached.",
      "Pitch up toward ninety degrees.",
      "Two rings are now aligned — they turn about the same axis. A degree of freedom is gone.",
      "Quaternions have no rings, and no orientation where they fail.",
    ],
    states: [
      ring(CX, CY, 150, 150, "ref") + ring(CX, CY, 112, 44, "lift") + ring(CX, CY, 74, 74, "moment") +
        /* CY+170, not CY+196: the closing note in state 4 runs the full width of
           the plate along the bottom, and at +196 this chip sat in the middle of
           that sentence. The band below the outer ring holds both, in order —
           chip under the rings it names, note under the chip. */
        chip(CX, CY + 170, "roll · pitch · yaw", "ref", { small: true }),
      ring(CX, CY, 112, 82, "lift") + arc(CX, CY, 178, 250, 300) +
        chip(CX + 152, CY - 154, "pitching up", "angle", { small: true }),
      ring(CX, CY, 112, 6, "lift") + ring(CX, CY, 74, 6, "moment") +
        chip(CX, CY - 52, "aligned — locked", "drag", { small: true }),
      note(400, 438, "A quaternion carries no preferred axis, so there is no attitude at which it degenerates."),
    ],
  });
};

/* ══ control-and-autopilot ════════════════════════════════════════════════ */

D["control-and-autopilot/loop"] = () => {
  const box = (x, y, w, h, label, kind) =>
    `<rect class="stroke ${kind ? "k-" + kind : "k-ink"}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none"/>` +
    `<text class="chip-t sm ${kind ? "k-" + kind : "k-ink"}" x="${x + w / 2}" y="${y + h / 2}">${label}</text>`;
  const Y = 216, H = 56;
  return figure({
    title: "A feedback control loop",
    desc: "A block diagram. A target value enters a comparison point where the measured value is subtracted from it, producing an error. The error goes to a controller, whose output drives the aircraft. The aircraft's actual state is measured by a sensor and fed back to the comparison point.",
    captions: [
      "Here is what you want the aircraft to do.",
      "Here is what it is actually doing. Subtract: that difference is the error.",
      "The controller acts on the error. Big error, big correction.",
      "The result is measured and fed back — and around it goes, continuously.",
    ],
    states: [
      arrow(96, Y + H / 2, 178, Y + H / 2, "ref", { trim: 0 }) +
        chip(96, Y + H / 2 - 34, "target", "ref", { small: true }),
      `<circle class="stroke k-ink" cx="200" cy="${Y + H / 2}" r="22" fill="none"/>` +
        `<text class="chip-t sm k-ink" x="200" y="${Y + H / 2}">−</text>` +
        arrow(222, Y + H / 2, 292, Y + H / 2, "drag", { trim: 0 }) +
        chip(258, Y + H / 2 - 32, "error", "drag", { small: true }),
      box(292, Y, 130, H, "controller", "thrust") +
        arrow(422, Y + H / 2, 500, Y + H / 2, "thrust", { trim: 0 }) +
        box(500, Y, 130, H, "aircraft", "lift"),
      arrow(630, Y + H / 2, 690, Y + H / 2, "lift", { trim: 0 }) +
        chip(690, Y + H / 2 - 34, "actual", "lift", { small: true }) +
        poly([[660, Y + H / 2], [660, Y + 148], [200, Y + 148], [200, Y + H / 2 + 22]], "other") +
        box(384, Y + 120, 116, 56, "sensor", "other"),
    ],
  });
};

D["control-and-autopilot/pid"] = () => {
  const f = frame({ xLabel: "time", yLabel: "response" });
  const { X, Y } = f;
  const target = 0.72;
  const p = (t) => target * 0.62 * (1 - Math.exp(-6 * t));
  const pi = (t) => target * (1 - Math.exp(-5 * t) * Math.cos(9 * t));
  const pid = (t) => target * (1 - Math.exp(-7.5 * t) * Math.cos(5.2 * t));
  return figure({
    title: "Proportional, then integral, then derivative",
    desc: "Three step responses on the same axes against a target value. Proportional control alone settles below the target, leaving a steady offset. Adding integral action removes the offset but overshoots and oscillates. Adding derivative action damps the oscillation so the response settles quickly and accurately.",
    captions: [
      "The target. Everything below is an attempt to reach it.",
      "Proportional alone: fast, but it settles short. That gap never closes.",
      "Add integral: the gap closes — at the cost of overshoot and ringing.",
      "Add derivative: it anticipates, damps the ringing, and settles. That is PID.",
    ],
    states: [
      f.s + line(X(0), Y(target), X(1), Y(target), "ref", "dash") + chip(X(1.0) - 20, Y(target) - 26, "target", "ref", { small: true }),
      curve(p, X, Y, "drag") + chip(X(0.74), Y(p(0.74)) - 26, "P", "drag", { small: true }) +
        line(X(0.74), Y(p(0.74)), X(0.74), Y(target), "ref", "dash") +
        chip(X(0.86), Y((p(0.74) + target) / 2), "offset", "drag", { small: true }),
      curve(pi, X, Y, "other") + chip(X(0.34), Y(pi(0.2)) + 30, "PI", "other", { small: true }),
      curve(pid, X, Y, "lift") + chip(X(0.56), Y(target) + 34, "PID", "lift", { small: true }),
    ],
  });
};

/* ══ Part II — the relational plates ══════════════════════════════════════

   Part I draws forces acting on one aeroplane. From here the subject is two of
   them, and the grammar changes with it — content/visual-grammar.md §1a. Four
   kinds, and one rule decides which is which:

     friendly · threat   who somebody is: the mark, and the nose it points
     track               where an aeroplane has been
     circle              where one is committed to going

   Identity therefore rides on the aircraft symbol and on the bandit's own path,
   which has to stay separable from ours at a glance and in a greyscale print.
   A path that is one of OUR choices is a `track`, because on those plates the
   question is which line we flew and not whose it is.

   No force kind appears on any of these plates, and nothing on them carries an
   arrowhead. §1a bans a relational kind drawn as a force arrow, and an arrow
   springing from an aircraft is exactly what that ban is about — it would read
   as a sibling of drag. Velocity is shown by drawing where something got to. */

const KTS = 1.944;                              // m/s → kt, the factor used everywhere else
const DEG = (rad) => (rad * 180) / Math.PI;

/* An aeroplane from above: where it is, and where its nose points. Not the
   `aircraft()` silhouette — that is a side view of a light aircraft and belongs
   to Part I's plates, whereas a fight is read from overhead. The stub is a
   plain line for the reason above. */
const jet = (x, y, hdg, kind, len = 30) =>
  line(x, y, ...at(x, y, hdg, len), kind) + dot(x, y, kind, 5);

/* A chip that cannot sit on what it labels, with the leader §3 asks for. An
   antenna train angle is ten degrees wide: at any radius where the arc is
   visible the wedge is thinner than the text, so a chip placed inside it hides
   the mark it is naming. The leader runs to the arc rather than the chip to the
   arc, and the chip's own paper covers the tail. */
const tag = (from, to, text, kind = "angle") =>
  dashed(from[0], from[1], to[0], to[1], "ref") + chip(to[0], to[1], text, kind, { small: true });

/* ══ three-numbers ════════════════════════════════════════════════════════ */

/* Both plates below are one geometry drawn twice, and every mark on either of
   them falls out of these six numbers. Nothing is placed by eye: the aspect
   fixes where we sit, the antenna train angle fixes where our nose points, and
   the two speeds and the clock fix everything that happens next.

   Screen angles: 0 points right and they run clockwise, because y grows
   downward. The bandit flies along 0°, so its tail points at 180° and we sit
   AA off that; our bearing to it is therefore −AA, and our nose sits ATA to the
   lead side of that bearing — lead being the side the bandit is going. */
const TN = (() => {
  const VF = 220, VB = 180;         // m/s — 428 kt and 350 kt
  const R = 1400;                   // m  — range at the first instant
  const AA = 40;                    // °  — aspect: from the bandit's TAIL round to us
  const ATA = 10;                   // °  — our nose off the line of sight, on the lead side
  const DT = 3;                     // s  — the interval the closure is measured over
  const S = 0.30;                   // px per metre, the same on both plates
  const B = [452, 128];
  const F = at(B[0], B[1], 180 - AA, R * S);
  const LOS = -AA;                  // ° — bearing from us to the bandit
  const HDG = LOS + ATA;            // ° — our heading. Lead subtracts: HCA = AA − ATA.
  /* Three seconds of straight flight each, then the range is measured again
     rather than predicted. Closure is a rate and it does not hold still: the
     instant value at the start is V cos(ATA) − V cos(AA) = 78.8 m/s, and the
     average below comes out lower because the geometry moved while we watched. */
  const F2 = at(F[0], F[1], HDG, VF * DT * S);
  const B2 = at(B[0], B[1], 0, VB * DT * S);
  const R2 = Math.hypot(B2[0] - F2[0], B2[1] - F2[1]) / S;
  return { VF, VB, R, AA, ATA, HCA: AA - ATA, DT, S, B, F, LOS, HDG, F2, B2, R2 };
})();

/* The pair, the line between them, and nothing else. Shared by both plates so
   the second one cannot drift a pixel from the first — the whole point of the
   second plate is that it re-measures THIS picture rather than a lookalike. */
const tnBase = () =>
  jet(TN.F[0], TN.F[1], TN.HDG, "friendly") +
  jet(TN.B[0], TN.B[1], 0, "threat") +
  dashed(TN.F[0], TN.F[1], TN.B[0], TN.B[1], "ref");

D["three-numbers/geometry"] = () => {
  const mid = [(TN.F[0] + TN.B[0]) / 2, (TN.F[1] + TN.B[1]) / 2];
  const mid2 = [(TN.F2[0] + TN.B2[0]) / 2, (TN.F2[1] + TN.B2[1]) / 2];
  const spent = Math.round(TN.R - TN.R2);
  /* One dot per second on each track, so the two speeds are readable off the
     plate rather than taken on trust — 220 m/s lays its dots further apart than
     180 does, and that difference is what closure is made of. */
  const ticks = (a, b, kind) => {
    let s = "";
    for (let i = 1; i <= TN.DT; i++)
      s += dot(a[0] + ((b[0] - a[0]) * i) / TN.DT, a[1] + ((b[1] - a[1]) * i) / TN.DT, kind, 3);
    return s;
  };
  return figure({
    title: "Range, angles and closure on one plan view",
    desc: "Two aircraft seen from above. A dashed line between them is the line of sight, labelled with the range of 1400 metres. An arc on the bandit measures aspect angle, 40 degrees from its tail; an arc on the friendly fighter measures antenna train angle, 10 degrees between its nose and the line of sight. Both aircraft are then drawn again three seconds later, joined to their first positions by their tracks. The range has fallen to 1187 metres, which is 213 metres of closure in three seconds.",
    captions: [
      "Two aeroplanes, and the one number they both agree on: how far apart they are.",
      "Where you sit on him, and where your nose sits. Two questions, two different answers.",
      "Three seconds later. Two hundred and thirteen metres gone — that is closure, and it is a rate, not a place.",
    ],
    states: [
      tnBase() +
        chip(mid[0] - 46, mid[1] - 24, `R ${TN.R} m`, "ref", { small: true }) +
        note(TN.F[0] + 24, TN.F[1] + 34, "us", { anchor: "start" }) +
        note(TN.B[0] + 6, TN.B[1] - 26, "the bandit", { anchor: "start" }),
      arc(TN.B[0], TN.B[1], 54, 180 - TN.AA, 180) +
        tag(at(TN.B[0], TN.B[1], 180 - TN.AA / 2, 54), [330, 176], `aspect ${TN.AA}°`) +
        arc(TN.F[0], TN.F[1], 104, TN.LOS, TN.HDG) +
        tag(at(TN.F[0], TN.F[1], TN.HDG, 104), [306, 382], `nose ${TN.ATA}° off`),
      trackPath([TN.F, TN.F2], "track") + ticks(TN.F, TN.F2, "track") +
        trackPath([TN.B, TN.B2], "threat") + ticks(TN.B, TN.B2, "threat") +
        jet(TN.F2[0], TN.F2[1], TN.HDG, "friendly") + jet(TN.B2[0], TN.B2[1], 0, "threat") +
        dashed(TN.F2[0], TN.F2[1], TN.B2[0], TN.B2[1], "ref") +
        chip(mid2[0] + 8, mid2[1] + 30, `R ${Math.round(TN.R2)} m`, "ref", { small: true }) +
        chip(450, 330, `${spent} m in ${TN.DT} s · ${Math.round((spent / TN.DT) * KTS)} kt`,
          "circle", { small: true }),
    ],
  });
};

D["three-numbers/three-angles"] = () => {
  /* The same plate, measured three ways. Each state adds one measurement and
     names the service that uses it, because on this page the services do not
     agree and picking one would make the other's reader wrong. */
  const B = TN.B, F = TN.F;
  return figure({
    title: "Three angles, measured on one geometry",
    desc: "The same two aircraft. First, two arcs on the bandit: aspect angle 40 degrees measured from its tail, which the USAF uses, and target aspect 140 degrees measured from its nose, which the Navy uses; the two always sum to 180. Second, the heading crossing angle of 30 degrees, measured at the friendly fighter between its heading and a line parallel to the bandit's heading. Third, the antenna train angle of 10 degrees, between the fighter's nose and the line of sight.",
    captions: [
      "Aspect: where you sit, measured on him. The USAF counts from his tail, the Navy from his nose — and the two always make 180.",
      "Angle-off, as the USAF means it: the difference between the two headings. It says nothing about where you sit.",
      "Antenna train angle: how far your own nose has to move to point at him. The Navy calls this one angle off.",
    ],
    states: [
      tnBase() +
        arc(B[0], B[1], 54, 180 - TN.AA, 180) +
        tag(at(B[0], B[1], 180 - TN.AA / 2, 54), [330, 176], `aspect ${TN.AA}°`) +
        arc(B[0], B[1], 76, 0, 180 - TN.AA) +
        tag(at(B[0], B[1], (180 - TN.AA) / 2, 76), [600, 232], `target aspect ${180 - TN.AA}°`) +
        note(B[0] + 108, B[1] + 176, `${TN.AA} + ${180 - TN.AA} = 180, always`, { anchor: "start" }),
      dashed(F[0] - 20, F[1], F[0] + 120, F[1], "ref") +
        arc(F[0], F[1], 70, TN.HDG, 0) +
        tag(at(F[0], F[1], TN.HDG / 2, 70), [392, 424], `heading crossing ${TN.HCA}°`),
      arc(F[0], F[1], 176, TN.LOS, TN.HDG) +
        tag(at(F[0], F[1], TN.HDG, 176), [438, 334], `antenna train ${TN.ATA}°`) +
        note(400, 452, `${TN.AA}° from his tail, ${TN.ATA}° off your nose, ${TN.HCA}° between the headings. Any two of them fix the third.`),
    ],
  });
};

/* ══ pursuit-curves ═══════════════════════════════════════════════════════ */

/* One fight, flown three times, differing only in where the nose is pointed.
   Everything below is integrated rather than drawn: the bandit flies the
   hardest turn the model gives him at his speed, we fly the hardest turn ours
   gives at ours, and each run holds its own fixed offset from the line of sight
   for as long as the aeroplane can hold it. Where it cannot — where the line of
   sight swings faster than 22.8°/s — the nose simply falls behind, and that is
   the misconception demonstrating itself rather than being asserted.

   Both aircraft hold speed and 9 g for the whole nine seconds, which no engine
   will pay for. That is chapter 15's warning still standing: these plates are
   about where a nose points, not about what the turn costs. */
const PC = (() => {
  const VD = 200, VA = 220;         // m/s — 389 kt for him, 428 kt for us
  const R0 = 900, ASP0 = 20;        // m, ° — we start in his rear quarter
  const OFF = 15;                   // ° — the lead and lag angles held on the line of sight
  const T = 9, dt = 0.02;           // s
  const d = turnPerformance(VD, FIGHTER), a = turnPerformance(VA, FIGHTER);
  const rad = (deg) => (deg * Math.PI) / 180;
  /* Maths coordinates, y up, bandit turning left from the origin. Projected to
     screen by each plate, because the two plates want different frames. */
  const dPos = (t) => [d.radius * Math.sin(d.rate * t), d.radius * (1 - Math.cos(d.rate * t))];

  const fly = (off) => {
    let p = [R0 * Math.cos(Math.PI + rad(ASP0)), R0 * Math.sin(Math.PI + rad(ASP0))];
    let psi = null;
    const out = [];
    for (let i = 0; i * dt <= T + 1e-9; i++) {
      const t = i * dt, hd = d.rate * t, dp = dPos(t);
      const dv = [VD * Math.cos(hd), VD * Math.sin(hd)];
      const los = [dp[0] - p[0], dp[1] - p[1]], R = Math.hypot(los[0], los[1]);
      const lam = Math.atan2(los[1], los[0]);
      // which side of the line of sight he is going, so lead leads and lag lags
      const s = Math.sign(los[0] * dv[1] - los[1] * dv[0]) || 1;
      /* Established on the chosen pursuit before the clock starts, so the three
         runs differ from the first frame and the choice is the only difference
         between them. Same rule that steers the rest of the run, so the sign
         cannot disagree with itself if the start moves to the other side. */
      if (psi === null) psi = lam + s * rad(off);
      const va = [VA * Math.cos(psi), VA * Math.sin(psi)];
      const clos = ((los[0] / R) * (va[0] - dv[0]) + (los[1] / R) * (va[1] - dv[1]));
      const rx = p[0] - dp[0], ry = p[1] - dp[1];
      out.push({
        t, x: p[0], y: p[1], dx: dp[0], dy: dp[1], R, clos,
        // the same instant in HIS frame: along his nose, and out his left wing
        xr: Math.cos(hd) * rx + Math.sin(hd) * ry,
        yr: -Math.sin(hd) * rx + Math.cos(hd) * ry,
      });
      const err = ((lam + s * rad(off) - psi + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      psi += Math.max(-a.rate * dt, Math.min(a.rate * dt, err));
      p = [p[0] + VA * Math.cos(psi) * dt, p[1] + VA * Math.sin(psi) * dt];
    }
    return out;
  };
  const stat = (r) => {
    const min = r.reduce((m, q) => (q.R < m.R ? q : m));
    const max = r.reduce((m, q) => (q.clos > m.clos ? q : m));
    return { r, min, peak: max.clos, end: r[r.length - 1] };
  };
  return {
    VD, VA, R0, ASP0, OFF, T, dt, d, a, dPos,
    lead: stat(fly(OFF)), pure: stat(fly(0)), lag: stat(fly(-OFF)),
  };
})();

/* Sampled down for drawing: the integrator steps every 20 ms because the turn
   limiter needs it to, but a path drawn at that resolution is 450 points of
   identical curve. */
const pcPts = (run, project, every = 5) =>
  run.r.filter((_, i) => i % every === 0 || i === run.r.length - 1).map(project);
const pcTicks = (run, project, kind, from = 1) => {
  let s = "";
  for (let t = from; t <= PC.T; t++) s += dot(...project(run.r[Math.round(t / PC.dt)]), kind, 3);
  return s;
};

D["pursuit-curves/three-curves"] = () => {
  const S = 0.30, X0 = 378, Y0 = 377;          // px per metre, and the bandit's start
  const P = (q) => [X0 + q.x * S, Y0 - q.y * S];
  const D0 = [X0, Y0], A0 = P(PC.pure.r[0]);
  const cc = [X0, Y0 - PC.d.radius * S];       // centre of the circle he committed to
  const dTrack = PC.pure.r.filter((_, i) => i % 5 === 0).map((q) => [X0 + q.dx * S, Y0 - q.dy * S]);
  const dEnd = dTrack[dTrack.length - 1];
  /* His heading at the end, in screen degrees: the turn is anticlockwise in
     maths coordinates and the projection flips y, so it reads clockwise here. */
  const dHdgEnd = -DEG(PC.d.rate * PC.T);
  const los0 = DEG(Math.atan2(PC.pure.r[0].y, -PC.pure.r[0].x));  // screen bearing, us → him
  /* Each label sits out along the nose that run actually started on, taken from
     the run itself rather than assumed. Which side of the line of sight counts
     as lead depends on which way he is going, and writing that sign in by hand
     here is exactly how the lead and lag labels end up on each other's curve. */
  /* Fifteen degrees apart is not much: the three runs stay within thirty pixels
     of each other for the whole nine seconds, and a chip is taller than that. So
     only the outer two are labelled out in clear paper on a leader, and the
     middle one is named where it lies along the drawn line of sight, which is
     the one place it is unmistakable — pure pursuit starts on that line by
     definition, and the caption says so. */
  const laid = (run) => trackPath(pcPts(run, P), "track") + pcTicks(run, P, "track");
  const endOf = (run) => { const p = pcPts(run, P); return p[p.length - 1]; };
  const bar = 500 * S;
  return figure({
    vb: "0 0 640 560",
    title: "Lead, pure and lag from one identical start",
    desc: "A bandit turning at nine g flies a 456 metre circle, drawn as a dashed circle with his flown arc on it. A fighter 900 metres behind him at 20 degrees aspect flies the same nine seconds three times over. Holding his nose on the bandit, it closes to 223 metres and crosses the bandit's flightpath. Holding 15 degrees of lead, it closes to 115 metres and crosses sooner and harder. Holding 15 degrees of lag, it stops at 356 metres and crosses nothing. Dots mark one-second intervals on every path.",
    captions: [
      "Point at him and hold it. The nose stays on for six seconds, then the line of sight outruns the aeroplane.",
      "Point ahead of him. The angles come faster — and so does everything else: 115 metres, and straight through his flightpath.",
      "Point behind him. You hand back the angles for now and keep the fight: 356 metres, and the closure spent rather than spending you.",
    ],
    states: [
      turnCircle(cc[0], cc[1], PC.d.radius * S, "circle") +
        trackPath(dTrack, "threat") + pcTicks(PC.pure, (q) => [X0 + q.dx * S, Y0 - q.dy * S], "threat") +
        jet(D0[0], D0[1], 0, "threat") + jet(dEnd[0], dEnd[1], dHdgEnd, "threat") +
        jet(A0[0], A0[1], los0, "friendly") +
        dashed(A0[0], A0[1], D0[0], D0[1], "ref") +
        chip(A0[0] + 0.24 * (D0[0] - A0[0]), A0[1] + 0.24 * (D0[1] - A0[1]),
          `${PC.R0} m`, "ref", { small: true }) +
        line(64, 92, 64 + bar, 92, "ref", "axis") + line(64, 87, 64, 97, "ref", "axis") +
        line(64 + bar, 87, 64 + bar, 97, "ref", "axis") +
        chip(64 + bar / 2, 76, "500 m", "ref", { small: true }) +
        chip(160, 200, `his circle · ${Math.round(PC.d.radius)} m at ${DEG(PC.d.rate).toFixed(1)}°/s`,
          "circle", { small: true }) +
        laid(PC.pure) + chip(...pcPts(PC.pure, P)[26], "pure", "track", { small: true }),
      laid(PC.lead) + tag(endOf(PC.lead), [286, 88], `${PC.OFF}° lead`, "track"),
      laid(PC.lag) + tag(endOf(PC.lag), [410, 72], `${PC.OFF}° lag`, "track"),
    ],
  });
};

D["pursuit-curves/consequences"] = () => {
  /* The same nine seconds in the bandit's frame: he sits still with his nose
     up, and the three runs are drawn as where we were relative to him. Distance
     from the middle IS range and the angle round it IS aspect, so one picture
     carries both numbers the chapter is about. */
  const S = 0.36, CX = 424, CY = 108;
  const P = (q) => [CX - q.yr * S, CY - q.xr * S];
  const ring = (m, at3) =>
    arc(CX, CY, m * S, 8, 172, "ref", "dash") +
    chip(...at(CX, CY, at3, m * S + 22), `${m} m`, "ref", { small: true });
  /* The closest point is marked and not captioned. Three chips would want a
     hundred pixels each and the three closest points are forty apart, so any
     labelling of them collides — and it is not needed: the rings ARE the scale,
     each run arrives in its own state, and the caption carries the number. */
  const shot = (run) =>
    trackPath(pcPts(run, P), "track") + pcTicks(run, P, "track") + dot(...P(run.min), "circle", 5);
  const start = P(PC.pure.r[0]);
  return figure({
    title: "The same nine seconds, seen from the bandit's cockpit",
    desc: "The bandit is held fixed at the centre with his nose upward, and the three pursuit runs are plotted as the attacker's position relative to him. Distance from the centre is range; angle around him is aspect. Dashed arcs mark 300, 600 and 900 metres, and a dashed horizontal line marks his three-nine line. All three runs start together at 900 metres in his right rear quarter. Pure pursuit reaches 223 metres, lead reaches 115 metres, lag stops at 356 metres. None of the three ever crosses the three-nine line.",
    captions: [
      "Distance from the middle is range; the angle round him is aspect. Pure walks in to 223 metres and swings across his tail.",
      "Lead gets there first and closest — 115 metres — and it does not stop there.",
      "Lag holds at 356 metres with the closure spent. And nothing crossed his 3/9 line: all three of these are still behind him.",
    ],
    states: [
      ring(900, 26) + ring(600, 22) + ring(300, 16) +
        dashed(CX - 330, CY, CX + 330, CY, "ref") +
        chip(CX + 300, CY - 22, "3/9 line", "ref", { small: true }) +
        jet(CX, CY, -90, "threat", 34) +
        dot(start[0], start[1], "friendly", 5) +
        chip(start[0] + 40, start[1] + 26, `start · ${PC.R0} m`, "ref", { small: true }) +
        shot(PC.pure),
      shot(PC.lead),
      shot(PC.lag),
    ],
  });
};

/* ══ rate-and-radius ══════════════════════════════════════════════════════ */

/* INSTANTANEOUS, throughout both plates. turnPerformance() asks what the
   aeroplane can do this second and never asks whether the engine can pay for
   it — at the corner it cannot, by a factor of about two and a half. The
   sustained picture is a different curve peaking at a different speed, it is
   chapter 17's, and not one line here belongs to it. */
const VS_F = stallSpeed(FIGHTER);               // 56.2 m/s — the 1 g stall
const VC = cornerSpeed(FIGHTER);                // 168.7 m/s — Vs√nMax, where the two limits meet
const CORNER = turnPerformance(VC, FIGHTER);    // 29.8°/s at 9 g, radius 324 m
/* g√(n²−1) — the whole numerator of turn rate once load factor is pinned at the
   structural limit. Above the corner it is a constant, which is why that branch
   of the envelope is exactly ω = TURN/V and the radius contours cross it at a
   speed that solves rather than searches. */
const TURN = GRAV * Math.sqrt(FIGHTER.nMax * FIGHTER.nMax - 1);
/* The two edges of the rate/speed plate. Hoisted out of the doghouse builder
   because chapter 17 draws its energy contours onto the same axes, and a second
   copy of these two numbers is exactly how the two plates would quietly stop
   being the same picture. */
const VMAX = 600 / KTS;                         // m/s at the right edge — 600 kt
const WMAX = R(35);                             // rad/s at the top — 35°/s

D["rate-and-radius/doghouse"] = () => {
  /* State 1 is chapter 9's plate, redrawn: the same frame() call, the same
     constants, the same kinds, the same words in the chips. Verbatim rather
     than recomputed for this aeroplane on purpose — the reader has to RECOGNISE
     the picture before it is allowed to mean anything new, and a redrawn-but-
     different one would ask them to spot differences instead. It is schematic,
     as chapter 9's was. No number appears until state 2, where they are all
     real. */
  const f = frame({ xLabel: "airspeed  V", yLabel: "load factor  n" });
  const { X, Y } = f;
  const stallPos = (t) => Math.min(t * t * 9, 0.78);
  const stallNeg = (t) => Math.max(-t * t * 5, -0.34);
  const Y2 = (v) => Y(0.35 + v * 0.55);
  /* Held as data rather than written inline so the paper patches below can be
     cut from the same coordinates. Two labels drifting apart is exactly the
     kind of silent error a hand-placed second copy produces. */
  const L9 = [
    /* X(0)-20, matching chapter 9's plate exactly — it was moved there to keep
       the zero chip off the rotated y-axis label, and the two must not drift.
       The paper patch below is cut from this same number, so it follows. */
    { x: X(0) - 20, y: Y2(0), t: "0", k: "ref" },
    { x: X(0.17), y: Y2(0.86), t: "stall boundary", k: "lift" },
    { x: X(0.6), y: Y2(0.78) - 24, t: "structural limit", k: "drag" },
    { x: X(0.86), y: Y2(-0.34) + 30, t: "V_NE", k: "other" },
  ];
  const c9 = (i) => chip(L9[i].x, L9[i].y, L9[i].t, L9[i].k, { small: true });
  const vn =
    f.s + line(X(0), Y2(0), X(1), Y2(0), "ref", "dash") + c9(0) +
    curve(stallPos, X, Y2, "lift", { to: 0.3 }) + curve(stallNeg, X, Y2, "lift", { to: 0.26 }) + c9(1) +
    line(X(0.294), Y2(0.78), X(0.86), Y2(0.78), "drag") +
    line(X(0.26), Y2(-0.34), X(0.86), Y2(-0.34), "drag") + c9(2) +
    line(X(0.86), Y2(0.78), X(0.86), Y2(-0.34), "other") + c9(3) +
    blob([[X(0.294), Y2(0.78)], [X(0.86), Y2(0.78)], [X(0.86), Y2(-0.34)], [X(0.26), Y2(-0.34)]], "lift");

  /* States are additive by construction — svg.js gives each its own <g> and the
     stylesheet only ever hides LATER ones — so the only way to re-read a plate
     is to lay paper over it. That is wanted rather than worked around: the old
     envelope stays underneath as a ghost, which is the argument the chapter is
     making. `chip` is the existing page-background fill, so no colour is named
     here and the dark plate follows for free.

     TEXT is the exception and gets full paper, not a wash. A ghosted line reads
     as history; ghosted words read as a printing fault, and a half-visible
     second "structural limit" sitting beside the live one is worse than no
     ghost at all. So the four chips of chapter 9's plate and the y-axis label —
     the only marks whose words change — are covered outright. */
  const blank = L9.map(({ x, y, t }) => {
    const w = 7 * t.length + 22, h = 28;
    return `<rect class="chip" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}"/>`;
  }).join("");
  const ghost =
    `<rect class="chip" x="30" y="30" width="740" height="392" opacity="0.9"/>` +
    `<rect class="chip" x="58" y="136" width="52" height="172"/>` + blank;

  const g = frame({ xLabel: "airspeed  V", yLabel: "turn rate  ω" });
  const rate = (V) => turnPerformance(V, FIGHTER).rate;
  const Wn = (t) => rate(t * VMAX) / WMAX;      // normalised rate against normalised speed
  const PX = (V, w) => [g.X(V / VMAX), g.Y(w / WMAX)];
  const tS = VS_F / VMAX, tC = VC / VMAX;

  /* One function, two boundaries, drawn in the two kinds chapter 9 used for
     them. Below the corner turnPerformance returns the lift-limited answer and
     the curve climbs; above it the load factor is pinned and the same function
     falls away as 1/V. Nothing switches over by hand. */
  const rim = [];
  for (let i = 0; i <= 60; i++) { const t = tS + ((1 - tS) * i) / 60; rim.push([g.X(t), g.Y(Wn(t))]); }
  const [sbx, sby] = PX(0.62 * VC, rate(0.62 * VC));
  const [slx, sly] = PX(1.30 * VC, rate(1.30 * VC));
  const doghouse =
    blob([...rim, [g.X(1), g.Y(0)], [g.X(tS), g.Y(0)]], "lift") +
    curve(Wn, g.X, g.Y, "lift", { from: tS, to: tC, steps: 60 }) +
    curve(Wn, g.X, g.Y, "drag", { from: tC, to: 1, steps: 60 }) +
    chip(sbx - 78, sby - 8, "stall boundary", "lift", { small: true }) +
    chip(slx, sly - 26, "structural limit", "drag", { small: true });

  /* Constant radius is a straight line through the origin on these axes,
     because ω = V/r. Each ray is drawn to the point where it leaves the
     envelope, and past the corner that boundary is ω = TURN/V, so the crossing
     solves exactly: V = √(r·TURN). The label sits on the ray at a stated speed,
     which is the only hand-chosen number in the figure and moves nothing. */
  const contour = (r, atV) => {
    const Vx = Math.sqrt(r * TURN);
    return dashed(g.X(0), g.Y(0), ...PX(Vx, Vx / r), "ref") +
      chip(...PX(atV, atV / r), `r ${r} m`, "ref", { small: true });
  };

  const [ccx, ccy] = PX(VC, CORNER.rate);
  return figure({
    title: "From the V-n diagram to the turn-rate doghouse",
    desc: "Chapter nine's manoeuvring envelope, then the same two boundaries plotted as turn rate against airspeed. The lift limit rises steeply from the stall; the structural limit falls away as one over speed. They cross at a single peak, the corner: 328 knots at 9 g, giving 29.8 degrees per second through a 324 metre circle. Straight lines through the origin are contours of constant turn radius. Every value is instantaneous, not sustained.",
    captions: [
      "Chapter nine's manoeuvring envelope. You have drawn this picture already.",
      "Same frame, same two boundaries — but up the side now reads turn rate. The old envelope is ghosted underneath.",
      "Constant radius is a straight line through the origin here, because rate is just speed divided by radius.",
      "Where the two boundaries meet: the corner. Best instantaneous rate, and the tightest circle this aeroplane owns.",
    ],
    states: [
      vn,
      ghost + g.s + doghouse,
      /* 500 and not 400: below the corner the boundary IS very nearly a line of
         constant radius — a CLmax turn holds about 325 m at any speed — so a
         400 m contour lies almost on top of the stall branch and its label had
         nowhere to sit. That near-coincidence is a real fact about the plate and
         the chapter says so in prose; it is just not something a contour can
         show without drawing the same line twice. */
      contour(500, 140) + contour(700, 220) + contour(1000, 260),
      dashed(ccx, ccy, ccx, g.Y(0), "ref") + dot(ccx, ccy, "angle") +
        chip(ccx, ccy - 26, "corner", "angle", { small: true }) +
        chip(ccx, g.Y(0) - 42,
          `${Math.round(VC * KTS)} kt · ${FIGHTER.nMax} g · ${DEG(CORNER.rate).toFixed(1)}°/s`,
          "angle", { small: true }),
    ],
  });
};

D["rate-and-radius/two-turns"] = () => {
  const BASE = 384, SCALE = 0.19, SECS = 4, GAP = 58, LEFT = 66;
  /* Three speeds, one aeroplane, one scale. The middle one is the corner itself
     rather than a round number near it, so the plate cannot drift away from the
     model by a rounding. */
  let run = LEFT;
  const P = [250 / KTS, VC, 500 / KTS].map((V) => {
    const t = turnPerformance(V, FIGHTER);
    const rad = t.radius * SCALE;              // metres → px, the same factor for all three
    const cx = run + rad;
    run = cx + rad + GAP;
    return { ...t, V, kt: Math.round(V * KTS), rad, cx, cy: BASE - rad };
  });
  /* Screen degrees, 0 to the right, y downward. Each aircraft starts at the
     bottom of its circle heading right and turns toward the centre, so the
     sweep runs from 90° downward — and how far it gets in four seconds IS the
     turn rate, drawn rather than asserted. */
  const arcPts = (cx, cy, r, a0, a1, steps = 60) => {
    const p = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; p.push([cx + r * cos(a), cy + r * sin(a)]); }
    return p;
  };
  const plot = (p) => {
    const swept = DEG(p.rate) * SECS;
    const pts = arcPts(p.cx, p.cy, p.rad, 90, 90 - swept);
    return turnCircle(p.cx, p.cy, p.rad, "circle") +
      trackPath(pts, "track") +
      dot(p.cx, BASE, "track", 4) + dot(...pts[pts.length - 1], "track", 4) +
      chip(p.cx, p.cy - p.rad - 20, `${p.kt} kt · r ${Math.round(p.radius)} m`, "circle", { small: true }) +
      chip(p.cx, BASE + 24, `${DEG(p.rate).toFixed(1)}°/s · ${Math.round(swept)}° in ${SECS} s`, "track", { small: true });
  };
  const bar = 500 * SCALE;
  return figure({
    title: "The same aircraft turning at three speeds",
    desc: "Three turn circles drawn to one scale, each begun on the same line heading the same way. At 250 knots the aircraft flies a 328 metre circle at 22.4 degrees per second. At the corner, 328 knots, it flies a 324 metre circle at 29.8 degrees per second. At 500 knots, still at 9 g, the circle has grown to 754 metres and the rate has fallen to 19.5 degrees per second. The dashed circle is where each is committed to go; the solid arc is where it gets in four seconds. All three are instantaneous, not sustained.",
    captions: [
      "Two hundred and fifty knots, pulling everything the wing will give: ninety degrees in four seconds.",
      "The corner. Same four seconds, a hundred and nineteen degrees — and the circle is no bigger than the slow one.",
      "Five hundred knots, still nine g. The circle more than doubled and the rate fell by a third.",
    ],
    states: [
      dashed(50, BASE, 748, BASE, "ref") +
        line(60, 84, 60 + bar, 84, "ref", "axis") + line(60, 79, 60, 89, "ref", "axis") +
        line(60 + bar, 79, 60 + bar, 89, "ref", "axis") +
        chip(60 + bar / 2, 68, "500 m", "ref", { small: true }) +
        plot(P[0]),
      plot(P[1]),
      plot(P[2]),
    ],
  });
};

/* ══ one-or-two-circle ════════════════════════════════════════════════════ */

/* One merge, drawn twice. The two plates share a start, a scale, a projection
   and a viewBox, and they are built from one object so they cannot drift: the
   only difference a reader can find between them is the one the chapter is
   about, which is which way we turned.

   Two speeds fix everything else. We arrive at 220 kt, below the corner, where
   the wing is the limit; he arrives at 400 kt, above it, where the airframe is.
   Chapter 15 already drew what that costs him — a 483 m circle against our 333,
   bought with the rate he keeps. Neither aeroplane is better. They are better at
   different questions, and the merge decides which question gets asked.

   The turning room is NOT chosen. It is the sum of the two radii, because that
   is the separation at which a one-circle fight is literally one circle: both
   turn circles then share a centre, and the phrase stops being a metaphor. */
const OTC = (() => {
  const KT_F = 220, KT_B = 400;
  const us = turnPerformance(KT_F / KTS, FIGHTER);
  const him = turnPerformance(KT_B / KTS, FIGHTER);
  const room = us.radius + him.radius;           // 816 m — see above
  /* Fight metres, laid out the way the plate reads: x to the right, y DOWNWARD,
     so the numbers here and the screen degrees elsewhere in this file agree. We
     start at the origin heading up the plate; he is off to our right, heading
     down it, and they are abeam at t = 0. That instant is the merge. */
  const F0 = [0, 0], B0 = [room, 0], HF = 270, HB = 90;
  /* One turn, as a commitment: a centre, a radius, and an angle that advances.
     `sense` is +1 for a clockwise turn on the plate and −1 for anticlockwise —
     the centre always sits 90° that way from the nose. */
  const mk = (P, hdg, perf, sense) => {
    const w = DEG(perf.rate), r = perf.radius;
    const C = at(P[0], P[1], hdg + 90 * sense, r);
    const a0 = hdg - 90 * sense;
    return {
      C, r, w, sense, kt: Math.round(perf.V * KTS), n: perf.n,
      pos: (t) => at(C[0], C[1], a0 + sense * w * t, r),
      hdg: (t) => hdg + sense * w * t,
      ang: (t) => a0 + sense * w * t,
    };
  };
  /* He turns the same way on both plates. Only our choice moves, because that is
     the decision the chapter is asking the reader to make — and holding his half
     of it still is the only way the two pictures stay comparable. */
  const HIM = mk(B0, HB, { ...him, V: KT_B / KTS }, +1);
  const US1 = mk(F0, HF, { ...us, V: KT_F / KTS }, +1);   // toward him — one circle
  const US2 = mk(F0, HF, { ...us, V: KT_F / KTS }, -1);   // away — two circles
  /* His half-turn is the clock both plates run on: the same elapsed time, so the
     tracks are comparable rather than merely similar. */
  const T = 180 / HIM.w;
  const box = [US1, US2, HIM].reduce((b, c) => [
    Math.min(b[0], c.C[0] - c.r), Math.min(b[1], c.C[1] - c.r),
    Math.max(b[2], c.C[0] + c.r), Math.max(b[3], c.C[1] + c.r),
  ], [Infinity, Infinity, -Infinity, -Infinity]);
  /* Projection: one scale, derived from the union of every circle either plate
     draws, so both are drawn to the same metre. */
  const VB_X = 700, VB_Y = 540, PAD = 30, TOP = 40, BOT = 460;
  const S = Math.min((VB_X - 2 * PAD) / (box[2] - box[0]), (BOT - TOP) / (box[3] - box[1]));
  const OX = PAD + ((VB_X - 2 * PAD) - S * (box[2] - box[0])) / 2 - box[0] * S;
  const OY = TOP + ((BOT - TOP) - S * (box[3] - box[1])) / 2 - box[1] * S;
  const P = ([x, y]) => [OX + x * S, OY + y * S];
  return { us, him, room, HIM, US1, US2, T, S, P, vb: `0 0 ${VB_X} ${VB_Y}` };
})();

/* The pass itself, identical on both plates and drawn from one function so it
   cannot be identical only by inspection. */
const otcMerge = () => {
  const f = OTC.P([0, 0]), b = OTC.P([OTC.room, 0]);
  return dashed(f[0], f[1], b[0], b[1], "ref") +
    jet(f[0], f[1], 270, "friendly") + jet(b[0], b[1], 90, "threat") +
    chip((f[0] + b[0]) / 2, f[1] - 22, `turning room ${Math.round(OTC.room)} m`, "ref", { small: true }) +
    chip(f[0] - 6, f[1] + 34, `us · ${OTC.US1.kt} kt`, "friendly", { small: true }) +
    chip(b[0] - 56, b[1] + 34, `him · ${OTC.HIM.kt} kt`, "threat", { small: true });
};

/* The clock chip sits in the one corner of the box neither plate ever draws in —
   above and left of every circle on either of them. Both plates run the same
   elapsed time, so it is the same chip in the same place twice, which is the
   only way a reader can tell the two pictures are being compared fairly. */
const otcClock = (o) =>
  chip(150, 62, `${OTC.T.toFixed(1)} s · him 180°, us ${Math.round(o.w * OTC.T)}°`, "ref", { small: true });

/* Where an aeroplane actually got to in `t`, sampled off its own turn rather
   than drawn along it. */
const otcTrack = (o, t, kind, steps = 60) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(OTC.P(o.pos((t * i) / steps)));
  const end = OTC.P(o.pos(t));
  return trackPath(pts, kind) + jet(end[0], end[1], o.hdg(t), kind);
};

D["one-or-two-circle/one-circle"] = () => {
  const c = OTC.P(OTC.HIM.C);
  const rUs = OTC.US1.r * OTC.S, rHim = OTC.HIM.r * OTC.S;
  /* The gap between the two circles is the whole fight, so it is measured where
     nothing else is happening: 135° round from the merge, in the lower left,
     which both tracks have left alone by the time either reaches it. */
  const gA = 135;
  const g0 = at(c[0], c[1], gA, rUs), g1 = at(c[0], c[1], gA, rHim);
  return figure({
    vb: OTC.vb,
    title: "One circle: both turn toward each other",
    desc: "Two aircraft pass abeam, 815 metres apart, flying opposite ways. Both turn toward each other. Because the turning room is the sum of their two turn radii, the two turn circles share a centre: our 333 metre circle sits entirely inside his 483 metre one, 150 metres inside it everywhere. Seven and a half seconds later he has come 180 degrees round his circle and we have come 144 degrees round ours, and the two of us are still in the same piece of sky.",
    captions: [
      "The merge. Eight hundred metres apart, going opposite ways, and neither of you has decided anything yet.",
      "Both turn toward each other. The two circles share a centre — that is what one-circle means, and here it is literal.",
      "Seven and a half seconds. He has come all the way round; we have made 144° of it. Neither of us has left.",
      "And this is the whole fight: 150 metres of radius. In here, the tighter circle is the one on the inside.",
    ],
    states: [
      otcMerge(),
      turnCircle(c[0], c[1], rHim, "circle") + turnCircle(c[0], c[1], rUs, "circle") +
        dot(c[0], c[1], "angle", 4) +
        chip(c[0], c[1] + 24, "one centre", "angle", { small: true }) +
        chip(...at(c[0], c[1], -68, rUs - 40), `r ${Math.round(OTC.US1.r)} m`, "friendly", { small: true }) +
        chip(...at(c[0], c[1], -74, rHim + 24), `r ${Math.round(OTC.HIM.r)} m`, "threat", { small: true }),
      otcTrack(OTC.HIM, OTC.T, "threat") + otcTrack(OTC.US1, OTC.T, "track") + otcClock(OTC.US1),
      line(g0[0], g0[1], g1[0], g1[1], "angle") +
        tag(at(c[0], c[1], gA, (rUs + rHim) / 2), [96, 452],
          `${Math.round(OTC.HIM.r - OTC.US1.r)} m inside him`),
    ],
  });
};

D["one-or-two-circle/two-circle"] = () => {
  const cU = OTC.P(OTC.US2.C), cH = OTC.P(OTC.HIM.C);
  const rUs = OTC.US2.r * OTC.S, rHim = OTC.HIM.r * OTC.S;
  /* Where we would be if we owned his rate: the same circle, the same start, and
     180° of it instead of 144. The shortfall is drawn as an arc of our own
     circle rather than written down, because it IS an arc of our own circle. */
  const owed = OTC.US2.ang(OTC.T), full = OTC.US2.ang(180 / OTC.US2.w);
  const short = 180 - OTC.US2.w * OTC.T;
  return figure({
    vb: OTC.vb,
    title: "Two circles: both turn the same way across the sky",
    desc: "The same merge, from the same 815 metre pass. This time we turn the other way, and the two aircraft turn the same way across the sky onto two separate circles whose centres are 666 metres apart. In the seven and a half seconds his 180 degree turn takes, we manage only 144 degrees. He arrives at the next pass 36 degrees of heading ahead of us, and goes on gaining at 4.9 degrees per second for as long as both hold the turn.",
    captions: [
      "The same merge. Same two aeroplanes, same 816 metres, same instant.",
      "We turn the other way, and now there are two circles with 665 metres between their centres. Nobody is sharing anything.",
      "The same seven and a half seconds. He is round and pointing back at the pass; we are still coming.",
      "Thirty-six degrees short, and short again every half turn. In here it is the clock, not the room, that runs out.",
    ],
    states: [
      otcMerge(),
      turnCircle(cU[0], cU[1], rUs, "circle") + turnCircle(cH[0], cH[1], rHim, "circle") +
        dot(cU[0], cU[1], "angle", 4) + dot(cH[0], cH[1], "angle", 4) +
        dashed(cU[0], cU[1], cH[0], cH[1], "ref") +
        chip((cU[0] + cH[0]) / 2, cU[1] - 22, `${Math.round(OTC.HIM.C[0] - OTC.US2.C[0])} m apart`, "ref", { small: true }) +
        chip(...at(cU[0], cU[1], 250, rUs - 34), `r ${Math.round(OTC.US2.r)} m`, "friendly", { small: true }) +
        chip(...at(cH[0], cH[1], -74, rHim + 24), `r ${Math.round(OTC.HIM.r)} m`, "threat", { small: true }),
      otcTrack(OTC.HIM, OTC.T, "threat") + otcTrack(OTC.US2, OTC.T, "track") + otcClock(OTC.US2),
      arc(cU[0], cU[1], rUs, full, owed, "angle") +
        tag(at(cU[0], cU[1], (owed + full) / 2, rUs + 8), [150, 452],
          `${Math.round(short)}° short · ${(OTC.HIM.w - OTC.US2.w).toFixed(1)}°/s`),
    ],
  });
};

/* ══ energy-rate ══════════════════════════════════════════════════════════ */

/* Specific excess power: whatever is left of the thrust once the drag at this
   speed and this load factor has been paid, expressed as the height per second
   it would buy. Ps = V(T − D)/W.

   Both terms come out of forces(), the same function the sandbox integrates, so
   these contours are the aeroplane's own arithmetic rather than a curve drawn to
   suit the argument. Full throttle throughout — full afterburner on this
   engine — because the question the chapter asks is what the aeroplane can pay
   for at its best, not what it happens to be paying now.

   A load factor above the lift limit is refused rather than clamped. forces()
   would answer for a stalled wing and hand back a drag figure lower than the
   truth, which would put the contours on the wrong side of the argument.

   The tolerance on that test is load-bearing and not tidiness. At corner speed
   the lift limit IS nMax — that is the definition of the speed — but it arrives
   through a square root and comes back 8.999999999999998, so asking for nine
   there was refused and the corner's own Ps rendered as a confident zero. */
const psAt = (V, n) => {
  const cap = turnPerformance(V, FIGHTER).n;
  if (n > cap + 1e-9) return null;
  const CL = (Math.min(n, cap) * FIGHTER.m * GRAV) / (0.5 * RHO * V * V * FIGHTER.S);
  const s = { V, h: 0, gamma: 0, theta: (CL - FIGHTER.CL0) / FIGHTER.CLa, q: 0, onGround: false };
  const f = forces(s, { throttle: 1 }, FIGHTER);
  return (V * (f.T - f.D)) / (FIGHTER.m * GRAV);
};
/* The load factor at which the aeroplane is exactly `target` metres per second
   in hand. Bisected because Ps falls monotonically with n at a fixed speed —
   induced drag goes as n², and nothing else in the expression moves. Where the
   envelope runs out before the engine does, the envelope is the answer. */
const nForPs = (V, target) => {
  const cap = turnPerformance(V, FIGHTER).n;
  if (psAt(V, cap) >= target) return cap;
  if (psAt(V, 1) < target) return null;
  let lo = 1, hi = cap;
  for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (psAt(V, m) > target) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
const rateAt = (V, n) => (GRAV * Math.sqrt(n * n - 1)) / V;
/* The best turn the engine will actually pay for: the peak of the Ps = 0 curve.
   18.6°/s at 262 kt and 4.6 g, against the corner's 29.8°/s at 328 and nine. */
const SUSTAIN = (() => {
  let best = null;
  for (let kt = 120; kt <= 700; kt += 0.5) {
    const V = kt / KTS, n = nForPs(V, 0);
    if (!n) continue;
    const w = rateAt(V, n);
    if (!best || w > best.w) best = { V, kt, n, w, radius: V / w };
  }
  return best;
})();

D["energy-rate/ps-contours"] = () => {
  const g = frame({ xLabel: "airspeed  V", yLabel: "turn rate  ω" });
  const rate = (V) => turnPerformance(V, FIGHTER).rate;
  const Wn = (t) => rate(t * VMAX) / WMAX;
  const PX = (V, w) => [g.X(V / VMAX), g.Y(w / WMAX)];
  const tS = VS_F / VMAX, tC = VC / VMAX;
  /* Chapter 15's doghouse, from chapter 15's own expressions. It has to be the
     same drawing or the overlay means nothing. */
  const rim = [];
  for (let i = 0; i <= 60; i++) { const t = tS + ((1 - tS) * i) / 60; rim.push([g.X(t), g.Y(Wn(t))]); }
  const [ccx, ccy] = PX(VC, CORNER.rate);
  const doghouse =
    blob([...rim, [g.X(1), g.Y(0)], [g.X(tS), g.Y(0)]], "lift") +
    curve(Wn, g.X, g.Y, "lift", { from: tS, to: tC, steps: 60 }) +
    curve(Wn, g.X, g.Y, "drag", { from: tC, to: 1, steps: 60 }) +
    dot(ccx, ccy, "angle") + chip(ccx, ccy - 26, "corner", "angle", { small: true });

  /* The Ps = 0 contour, walked across the speed range, plus the envelope above
     it. Where the two coincide — below about 210 kt and above about 570 — the
     wing or the structure gives out before the engine does, and the aeroplane
     can hold everything it is able to pull. That coincidence is drawn rather
     than trimmed away, because it is the honest shape of the answer. */
  const sustained = [], ceiling = [];
  for (let kt = 110; kt <= 640; kt += 4) {
    const V = kt / KTS, n = nForPs(V, 0);
    if (!n) continue;
    sustained.push(PX(V, rateAt(V, n)));
    ceiling.push(PX(V, turnPerformance(V, FIGHTER).rate));
  }
  const [sx, sy] = PX(SUSTAIN.V, SUSTAIN.w);
  const psCorner = psAt(VC, FIGHTER.nMax);
  /* How fast the speed itself falls at the corner. Ps is a height rate; in level
     flight the same excess is V̇ = g·Ps/V, and that number is what makes the
     corner a place you visit rather than a place you fly. */
  const decel = (GRAV * psCorner) / VC;
  return figure({
    title: "What the engine will pay for, drawn on chapter fifteen's plate",
    desc: "Chapter fifteen's turn-rate doghouse, with the specific excess power of the same aircraft laid over it. The Ps equals zero line — every turn the engine can hold indefinitely at full afterburner — peaks at 18.6 degrees per second at 262 knots and 4.6 g, well inside the envelope. Below about 210 knots and above about 570 it runs along the envelope itself, because there the wing or the structure gives out before the engine does. The whole region between the two lines is turning bought on credit. At the corner, 328 knots and 9 g, the aircraft is spending 332 metres of energy height every second, which is 19 metres per second per second of deceleration, or 37 knots a second.",
    captions: [
      "Chapter fifteen's envelope, unchanged. Everything inside it is a turn this aeroplane can make for one second.",
      "And this is the one it can make for ever: 18.6°/s at 262 knots and 4.6 g, where thrust and drag finally agree.",
      "Everything between the two lines is bought on credit. At the corner the interest is 332 metres of height a second.",
    ],
    states: [
      g.s + doghouse,
      poly(sustained, "thrust") +
        dot(sx, sy, "thrust", 5) +
        chip(sx - 8, sy + 30,
          `sustained · ${Math.round(SUSTAIN.kt)} kt · ${SUSTAIN.n.toFixed(1)} g · ${DEG(SUSTAIN.w).toFixed(1)}°/s`,
          "thrust", { small: true }),
      blob([...ceiling, ...sustained.slice().reverse()], "drag") +
        dashed(ccx, ccy, ccx + 74, ccy - 30, "ref") +
        chip(ccx + 156, ccy - 36, `at the corner · Ps ${Math.round(psCorner).toString().replace("-", "−")} m/s`, "drag", { small: true }) +
        chip(ccx + 156, ccy - 8, `= ${Math.abs(decel * KTS).toFixed(0)} kt a second`, "drag", { small: true }),
    ],
  });
};

D["energy-rate/yo-yo"] = () => {
  /* A side elevation, drawn to one true scale in both directions — no vertical
     exaggeration, because the whole claim is about how much height a speed is
     worth and a stretched axis would flatter it.

     Every dimension falls out of three numbers: the speed we arrive with, the
     speed we choose to be doing at the top, and the tightest pull the aeroplane
     has at the speed it starts. Height comes from the energy the speeds differ
     by; the pull-up and the push-over are arcs of the real turn circle at 450
     kt; the straight climb is whatever is left over. */
  const KT_A = 450, KT_TOP = 380, KT_HIM = Math.round(VC * KTS);
  const VA = KT_A / KTS, VT = KT_TOP / KTS;
  const dh = (VA * VA - VT * VT) / (2 * GRAV);   // 784 m — the trade, exactly
  const GAM = 45;                               // ° — the climb angle held
  const pull = turnPerformance(VA, FIGHTER);    // 611 m, the tightest arc at 450 kt
  const arcH = pull.radius * (1 - cos(GAM));    // height inside one corner
  const arcX = pull.radius * sin(GAM);
  const strH = dh - 2 * arcH, strX = strH / Math.tan(R(GAM));
  const LEAD = 320;                             // m of level run before the pull
  const half = arcX + strX + arcX;              // horizontal run of the climb
  const W = LEAD + 2 * half, H = dh;

  const VBX = 820, VBY = 380, PAD = 32, TOPY = 74, BASE = 292;
  const S = Math.min((VBX - 2 * PAD) / W, (BASE - TOPY) / H);
  const OX = PAD + ((VBX - 2 * PAD) - S * W) / 2;
  const P = (x, h) => [OX + x * S, BASE - h * S];

  /* The profile, sampled off the arcs rather than splined between corners. */
  const seg = (x0, h0, a0, a1, steps = 22) => {
    const p = [], sgn = Math.sign(a1 - a0);
    /* Centre of the arc: perpendicular to the flight path, on the side the turn
       is going, in the vertical plane. */
    const cx = x0 - sgn * pull.radius * sin(a0), ch = h0 + sgn * pull.radius * cos(a0);
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      p.push([cx + sgn * pull.radius * sin(a), ch - sgn * pull.radius * cos(a)]);
    }
    return p;
  };
  const up1 = seg(LEAD, 0, 0, GAM);
  const [x1, h1] = up1[up1.length - 1];
  const straight = [[x1, h1], [x1 + strX, h1 + strH]];
  const up2 = seg(x1 + strX, h1 + strH, GAM, 0);
  const apex = up2[up2.length - 1];
  const upTo = [[0, 0], ...up1, ...straight];               // level run, then the climb
  /* The descent is the climb reflected through the apex — the same three pieces
     in the same order, which is what makes it a trade and not a loss. */
  const down = [...up1, ...straight, ...up2]
    .map(([x, h]) => [2 * apex[0] - x, h]).reverse();
  const px = (a) => a.map(([x, h]) => P(x, h));

  const level = P(0, 0), levelEnd = P(W, 0);
  const himX = P(LEAD + 620, 0);
  const apexPx = P(apex[0], apex[1]);
  const alongKt = Math.round(KT_A * cos(GAM));
  const top = turnPerformance(VT, FIGHTER);
  return figure({
    vb: `0 0 ${VBX} ${VBY}`,
    title: "A high yo-yo, drawn as the trade it is",
    desc: "A side elevation at true scale. We are 450 knots behind a bandit doing 328, with 122 knots of closure we cannot spend and a 611 metre turn circle against his 324. Instead of pulling in his plane, we unload and pull up through 45 degrees. At that climb angle our speed along his line is 318 knots, ten knots slower than he is going, so the closure is not reduced but gone. The climb converts the difference between 450 and 380 knots into 784 metres of height, at the top of which our turn circle has shrunk to 436 metres and our rate risen to 25.7 degrees per second. Coming back down returns the same 784 metres as speed.",
    captions: [
      "Four hundred and fifty knots behind a bandit doing 328. Too fast, too wide, and closing at 122 knots.",
      "Unload and pull up. At 45° of climb your speed along his line is 318 knots — the closure is not reduced, it is gone.",
      "Seven hundred and eighty-four metres, bought with seventy knots. Up here the circle is 436 metres instead of 611.",
      "And back down for exactly what it cost. Nothing was created; it was moved twice, and you chose when.",
    ],
    states: [
      trackPath([level, levelEnd], "threat") +
        jet(himX[0], himX[1], 0, "threat") +
        jet(level[0], level[1], 0, "friendly") +
        chip(level[0] + 66, level[1] + 26, `us · ${KT_A} kt`, "friendly", { small: true }) +
        chip(himX[0] + 60, himX[1] + 26, `him · ${KT_HIM} kt`, "threat", { small: true }) +
        chip((level[0] + himX[0]) / 2 + 30, level[1] - 24,
          `closure ${KT_A - KT_HIM} kt`, "circle", { small: true }) +
        chip(VBX / 2 + 104, BASE + 28,
          `our circle ${Math.round(pull.radius)} m · his ${Math.round(CORNER.radius)} m`, "ref", { small: true }),
      trackPath(px(upTo), "track") +
        chip(...P(LEAD + arcX + strX * 0.5, arcH + strH * 0.62),
          `${KT_A} × cos ${GAM}° = ${alongKt} kt along his line`, "track", { small: true }) +
        chip(...P(LEAD + arcX + strX * 0.5, arcH + strH * 0.28),
          `${KT_HIM - alongKt} kt slower than he is`, "circle", { small: true }),
      trackPath(px([[apex[0] - (apex[0] - x1 - strX), h1 + strH], ...up2]), "track") +
        dashed(apexPx[0], apexPx[1], apexPx[0], BASE, "ref") +
        line(apexPx[0] - 7, apexPx[1], apexPx[0] + 7, apexPx[1], "ref", "axis") +
        tag([apexPx[0], (apexPx[1] + BASE) / 2], [apexPx[0] + 96, BASE - 46],
          `${Math.round(dh)} m of height`, "angle") +
        chip(apexPx[0] + 6, apexPx[1] - 24,
          `${KT_TOP} kt · r ${Math.round(top.radius)} m · ${DEG(top.rate).toFixed(1)}°/s`, "track", { small: true }),
      trackPath(px(down), "track") +
        tag(P(2 * apex[0] - x1 - strX / 2, h1 + strH / 2), [700, 124],
          `${Math.round(dh)} m back is ${KT_A - KT_TOP} kt back`, "track"),
    ],
  });
};

/* ══ overshoots ═══════════════════════════════════════════════════════════

   Two overshoots, drawn in the defender's own frame — chapter 14's second
   plate, continued. Distance from him is range and the angle round him is
   aspect, and two lines through him say which overshoot this is:

     his flightpath   a real circle in his frame, through him, centred out the
                      wing he is turning toward. Crossing it is a FLIGHTPATH
                      overshoot.
     his 3/9 line     the horizontal through him. Getting forward of it is a
                      3/9-line overshoot, and that is a change of roles.

   Both runs are chapter 14's integrator with chapter 14's control law: the
   defender breaks at the hardest turn the model gives him, and the attacker
   holds a fixed angle on the line of sight for as long as his own turn rate
   allows. Same start, same clock, same speeds. The ONLY difference between the
   two is which side of the line of sight the attacker chose to point. */
const OV = (() => {
  const KT_D = 300, KT_A = 400;       // his speed, ours — both below the corner
  const R0 = 1050, ASP0 = -25;        // m, ° — we sit on the wing he breaks into
  const OFF = 20, LEAD = 15;          // ° held on the line of sight: lag, then lead
  const T = 4.5, dt = 0.02;
  const d = turnPerformance(KT_D / KTS, FIGHTER), a = turnPerformance(KT_A / KTS, FIGHTER);
  const VD = KT_D / KTS, VA = KT_A / KTS;

  const fly = (off) => {
    let dp = [0, 0], dh = 0;
    let p = [-R0 * cos(ASP0), -R0 * sin(ASP0)], psi = null;
    const out = [];
    for (let i = 0; i * dt <= T + 1e-9; i++) {
      const t = i * dt;
      const dv = [VD * Math.cos(dh), VD * Math.sin(dh)];
      const los = [dp[0] - p[0], dp[1] - p[1]], rng = Math.hypot(los[0], los[1]);
      const lam = Math.atan2(los[1], los[0]);
      const s = Math.sign(los[0] * dv[1] - los[1] * dv[0]) || 1;
      if (psi === null) psi = lam + s * R(off);
      const va = [VA * Math.cos(psi), VA * Math.sin(psi)];
      const clos = ((los[0] / rng) * (va[0] - dv[0]) + (los[1] / rng) * (va[1] - dv[1]));
      const rx = p[0] - dp[0], ry = p[1] - dp[1];
      /* His frame: xr along his nose, yr out his left wing — which is the wing
         he is turning toward, so his turn centre sits at (0, +radius) and his
         own flightpath is the circle of that radius through the origin. */
      const xr = Math.cos(dh) * rx + Math.sin(dh) * ry;
      const yr = -Math.sin(dh) * rx + Math.cos(dh) * ry;
      out.push({ t, R: rng, clos, xr, yr, fp: Math.hypot(xr, yr - d.radius) - d.radius });
      const err = ((lam + s * R(off) - psi + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      psi += Math.max(-a.rate * dt, Math.min(a.rate * dt, err));
      p = [p[0] + VA * Math.cos(psi) * dt, p[1] + VA * Math.sin(psi) * dt];
      dh += d.rate * dt;
      dp = [dp[0] + dv[0] * dt, dp[1] + dv[1] * dt];
    }
    /* The two crossings, found on the samples rather than asserted: the first
       moment inside his turn circle, and the first moment forward of his
       wingline. A run that never does either returns null and says so. */
    const first = (f) => out.find(f) || null;
    return {
      r: out, end: out[out.length - 1],
      peak: out.reduce((m, q) => (q.clos > m.clos ? q : m)).clos,
      min: out.reduce((m, q) => (q.R < m.R ? q : m)),
      fp: first((q) => q.fp < 0), f39: first((q) => q.xr > 0),
      fwd: out.reduce((m, q) => (q.xr > m.xr ? q : m)),
    };
  };
  return { KT_D, KT_A, R0, ASP0, OFF, LEAD, T, dt, d, a, lag: fly(-OFF), lead: fly(LEAD) };
})();

D["overshoots/two-overshoots"] = () => {
  const S = 0.30, CX = 520, CY = 172;          // px per metre, and where he sits
  const P = (q) => [CX - q.yr * S, CY - q.xr * S];
  const M = (xr, yr) => [CX - yr * S, CY - xr * S];   // the same map, from metres
  const pts = (run, every = 5) =>
    run.r.filter((_, i) => i % every === 0 || i === run.r.length - 1).map(P);
  const ticks = (run, kind) => {
    let s = "";
    for (let t = 1; t <= OV.T; t++) s += dot(...P(run.r[Math.round(t / OV.dt)]), kind, 3);
    return s;
  };
  const laid = (run) => trackPath(pts(run), "track") + ticks(run, "track");
  const start = P(OV.lag.r[0]);
  const fpC = M(0, OV.d.radius);               // centre of his flightpath circle
  const bar = 500 * S;
  /* The ring is the attacker's own turn radius, and it is not a range ring: at
     400 kt the tightest circle this aeroplane owns is 483 m, and V/ω is the same
     number. Inside it, something crossing square in front of you sweeps the line
     of sight faster than the aeroplane can turn, so the nose cannot be kept on
     it however hard it is pulled. Drawn in the angle kind and not the circle
     kind, because it is a measurement and not somebody's commitment. */
  const ring = OV.a.radius * S;
  return figure({
    vb: "0 0 760 560",
    title: "The two overshoots, told apart",
    desc: "The defender is held fixed at the centre with his nose upward, breaking at 300 knots into an attacker who arrives at 400 knots from 1050 metres. Distance from the centre is range and the angle round him is aspect. His own flightpath is drawn as a circle through him, centred out the wing he is turning toward; his three-nine line is the horizontal through him. Holding 20 degrees of lag, the attacker crosses that flightpath circle at 636 metres and stays 71 metres behind the three-nine line. Holding 15 degrees of lead from the identical start, he crosses the flightpath sooner and then crosses the three-nine line at 688 metres, ending 146 metres forward of it. A third circle marks 483 metres — the attacker's own turn radius at 400 knots, which is also his speed divided by his turn rate.",
    captions: [
      "Twenty degrees of lag. The flightpath is crossed — that is one overshoot — and he is still behind the wingline.",
      "Fifteen degrees of lead, same start, same clock. Across the flightpath sooner, and then across the 3/9 line.",
      "And this ring is your own turn radius, V over ω. Inside it the line of sight outruns you, and pulling harder cannot help.",
    ],
    states: [
      turnCircle(fpC[0], fpC[1], OV.d.radius * S, "circle") +
        chip(fpC[0] - 8, fpC[1] + 24, "his flightpath", "circle", { small: true }) +
        dashed(CX - 215, CY, CX + 205, CY, "ref") +
        chip(CX + 160, CY - 22, "his 3/9 line", "ref", { small: true }) +
        jet(CX, CY, -90, "threat", 34) +
        chip(CX + 96, CY + 30, `him · ${OV.KT_D} kt · ${DEG(OV.d.rate).toFixed(1)}°/s`, "threat", { small: true }) +
        dot(start[0], start[1], "friendly", 5) +
        chip(start[0] + 4, start[1] + 28, `start · ${OV.R0} m · ${OV.KT_A} kt`, "friendly", { small: true }) +
        line(64, 500, 64 + bar, 500, "ref", "axis") + line(64, 495, 64, 505, "ref", "axis") +
        line(64 + bar, 495, 64 + bar, 505, "ref", "axis") +
        chip(64 + bar / 2, 484, "500 m", "ref", { small: true }) +
        /* Every number on this plate is tied to the point on the track that
           produced it. A floating chip in clear paper is a claim the reader has
           to take on trust; a leader makes it a measurement. */
        laid(OV.lag) + dot(...P(OV.lag.fp), "angle", 5) +
        tag(P(OV.lag.fp), [186, 306],
          `flightpath crossed · ${Math.round(OV.lag.fp.R)} m`) +
        tag(P(OV.lag.end), [178, 222],
          `${Math.abs(Math.round(OV.lag.fwd.xr))} m short of his 3/9`, "track"),
      laid(OV.lead) + dot(...P(OV.lead.f39), "angle", 5) +
        tag(P(OV.lead.f39), [232, 118], `3/9 crossed · ${Math.round(OV.lead.f39.R)} m`) +
        tag(P(OV.lead.end), [656, 60],
          `${Math.round(OV.lead.fwd.xr)} m in front · ${Math.round(OV.lead.peak * KTS)} kt`, "track"),
      turnCircle(CX, CY, ring, "angle") +
        chip(630, 250, `${Math.round(OV.a.radius)} m · your own turn radius`, "angle", { small: true }),
    ],
  });
};

/* A scissors is a race to be slowest along one line, and that line is the only
   thing in it that holds still. Both aeroplanes weave about the fight axis
   between fixed heading limits, each turning at the hardest rate the model
   gives it at its own speed — so the tracks below are integrated, and the mean
   speed each makes along the axis comes out of the integration rather than
   being written on.

   That mean is V·sin θ / θ for a weave to ±θ, which is where the whole fight
   lives: it depends on speed and on how far you are willing to point away, and
   on nothing else at all. Slower is better, and being behind is winning. */
const SC = (() => {
  const KT_F = 350, KT_B = 250;      // us, out in front after the overshoot; him
  const TH = 45, T = 10, dt = 0.02;  // ° of weave either side of the axis; seconds
  const GAP0 = 300;                  // m — how far ahead of him we start
  /* `sense` starts the two of them turning opposite ways, because that is what a
     scissors is: each reversing into the other rather than flying parallel
     wiggles down the same line. It changes nothing in the arithmetic — the mean
     along the axis is phase-blind — and everything in whether the plate looks
     like the fight it is describing. */
  const weave = (kt, x0, sense) => {
    const p = turnPerformance(kt / KTS, FIGHTER), V = kt / KTS;
    let psi = 0, sgn = sense, x = x0, y = 0;
    const pts = [];
    for (let i = 0; i * dt <= T + 1e-9; i++) {
      pts.push([x, y]);
      psi += sgn * p.rate * dt;
      if (psi >= R(TH)) sgn = -1;
      if (psi <= -R(TH)) sgn = 1;
      x += V * Math.cos(psi) * dt;
      y += V * Math.sin(psi) * dt;
    }
    return { pts, perf: p, kt, V, along: (pts[pts.length - 1][0] - x0) / T, spread: Math.max(...pts.map((q) => Math.abs(q[1]))) };
  };
  const us = weave(KT_F, GAP0, +1), him = weave(KT_B, 0, -1);
  return { KT_F, KT_B, TH, T, GAP0, us, him, gap: us.pts[us.pts.length - 1][0] - him.pts[him.pts.length - 1][0] };
})();

D["overshoots/scissors"] = () => {
  const S = 0.34, OX = 88, TOP = 176, BOT = 442;
  const A = (x, y) => [OX + x * S, TOP - y * S];       // plan: y is left of the axis
  const E = (x, h) => [OX + x * S, BOT - h * S];       // elevation: h is height
  const weft = (pts, f, kind) => trackPath(pts.map(([x, y]) => f(x, y)), kind);
  const end = (w) => w.pts[w.pts.length - 1];
  const kt = (mps) => Math.round(mps * KTS);
  const axL = A(-60, 0), axR = A(end(SC.us)[0] + 60, 0);
  const bar = 500 * S;
  return figure({
    vb: "0 0 820 580",
    title: "A scissors, flat and then rolling",
    desc: "The fight axis is drawn as a horizontal line and both aircraft weave about it between headings 45 degrees either side, each turning as hard as it can at its own speed. We start 300 metres in front at 350 knots and make 313 knots along the axis; he starts behind at 250 knots and makes 224 knots along it. In ten seconds the gap grows by 455 metres, so he falls further behind — which in a scissors is the winning end. Below, the same contest is drawn in elevation with the weave put into the vertical, where gravity takes 13.5 knots a second off anyone climbing at 45 degrees and lowers the same number further.",
    captions: [
      "You have overshot and you are out in front. The fight axis is the only thing here that stands still.",
      "Both weave. What each of you makes along that axis is your speed times sin 45° over 45° in radians — and nothing else.",
      "Ten seconds: 313 knots along the line against 224. He is 755 metres behind you, and behind is where he wants to be.",
      "Put the weave in the vertical and the same race gets a second term: climbing at 45° costs 13.5 knots a second on its own.",
    ],
    states: [
      dashed(axL[0], axL[1], axR[0], axR[1], "ref") +
        chip(axR[0] - 58, axL[1] - 22, "the fight axis", "ref", { small: true }) +
        jet(...A(SC.GAP0, 0), 0, "friendly") +
        chip(...A(SC.GAP0 + 40, -180), `us · ${SC.KT_F} kt`, "friendly", { small: true }) +
        jet(...A(0, 0), 0, "threat") +
        chip(...A(-40, -180), `him · ${SC.KT_B} kt`, "threat", { small: true }) +
        line(64, 522, 64 + bar, 522, "ref", "axis") + line(64, 517, 64, 527, "ref", "axis") +
        line(64 + bar, 517, 64 + bar, 527, "ref", "axis") +
        chip(64 + bar / 2, 506, "500 m", "ref", { small: true }),
      weft(SC.us.pts, A, "track") + weft(SC.him.pts, A, "threat") +
        chip(...A(SC.GAP0 + 620, 250), `${kt(SC.us.along)} kt along the axis`, "track", { small: true }) +
        chip(...A(240, -250), `${kt(SC.him.along)} kt along the axis`, "track", { small: true }),
      jet(...A(end(SC.us)[0], end(SC.us)[1]), 0, "friendly") +
        jet(...A(end(SC.him)[0], end(SC.him)[1]), 0, "threat") +
        dashed(...A(end(SC.him)[0], 0), ...A(end(SC.us)[0], 0), "ref") +
        chip(...A((end(SC.him)[0] + end(SC.us)[0]) / 2, -100),
          `${Math.round(SC.gap)} m behind you after ${SC.T} s`, "angle", { small: true }),
      dashed(...E(-60, 0), ...E(end(SC.us)[0] + 60, 0), "ref") +
        weft(SC.us.pts, E, "track") +
        weft(SC.him.pts, E, "threat") +
        chip(...E(SC.GAP0 + 300, 250), "the same weave, put in the vertical", "track", { small: true }) +
        /* The one band of paper neither register ever draws in: below the plan
           weave's lowest crest and above the elevation weave's highest. */
        chip(600, 320,
          `climbing at 45° costs ${Math.abs(GRAV * Math.sin(R(45)) * KTS).toFixed(1)} kt a second on its own`,
          "circle", { small: true }),
    ],
  });
};

/* ══ bvr-geometry ═════════════════════════════════════════════════════════

   Fifty miles of the same three numbers. Everything on these two plates comes
   out of chapter 13's closure expression and nothing else:

       Vc = V_us · cos(ATA) − V_him · cos(AA)

   Two terms, one owned by each aeroplane. A crank pays down the first with
   geometry instead of throttle; a beam takes the second to zero. Neither of
   them stops the range falling, and the plates say so in knots.

   Two premises are the figure's own and are NOT claims about anybody's
   equipment: the radar's ±60° gimbal limit, and the 30 m/s of radial velocity
   inside which a doppler filter rejects a return. Real numbers for both are
   equipment-specific and not public. What is not a premise is the SHAPE they
   produce, which is arithmetic. */
const BV = (() => {
  const KT = 480, R0 = 30 * 1852;    // both aeroplanes, and 30 nautical miles
  const GIMBAL = 60, CRANK = 50;     // ° — stated premise, and where we put him
  const NOTCH = 30;                  // m/s — stated premise, see above
  const T = 60, dt = 0.05;           // s
  const V = KT / KTS;
  const clos = (ata, aa) => V * cos(ata) - V * cos(aa);
  /* Straight-line flight for both, from the same instant, in three pairings.
     `usHdg` and `himHdg` are screen degrees with us at the left flying right. */
  const runPair = (usHdg, himHdg) => {
    const us = [-R0 / 2, 0], him = [R0 / 2, 0];
    const u2 = at(us[0], us[1], usHdg, V * T), h2 = at(him[0], him[1], himHdg, V * T);
    return { us, him, u2, h2, R: Math.hypot(h2[0] - u2[0], h2[1] - u2[1]) };
  };
  return {
    KT, R0, GIMBAL, CRANK, NOTCH, T, dt, V, clos,
    hot: runPair(0, 180), crank: runPair(-CRANK, 180), beam: runPair(-CRANK, -90),
    /* The rejection condition is |V·cos AA| < NOTCH, so the headings that satisfy
       it are a band of half-width arcsin(NOTCH/V) about the beam. It is a
       condition on velocity, which is why it narrows as he speeds up. */
    band: (kt) => DEG(Math.asin(Math.min(1, NOTCH / (kt / KTS)))),
  };
})();

D["bvr-geometry/crank-beam-notch"] = () => {
  const S = 600 / BV.R0, CY = 286;                 // px per metre, and the axis
  const P = ([x, y]) => [400 + x * S, CY + y * S];
  const nm = (m) => (m / 1852).toFixed(0);
  const bar = 10 * 1852 * S;
  const us = P(BV.hot.us), him = P(BV.hot.him);
  const leg = (r, kind) => trackPath([P(kind === "threat" ? r.him : r.us), P(kind === "threat" ? r.h2 : r.u2)], kind);
  return figure({
    vb: "0 0 820 500",
    title: "Crank, beam and notch on one intercept",
    desc: "Two aircraft 30 nautical miles apart, both at 480 knots, closing head-on at 960 knots. Our radar's gimbal limit is drawn as a 60 degree cone either side of the nose, which is a stated premise rather than a claim about any equipment. Cranking 50 degrees off the line of sight cuts the closure to 789 knots and leaves him 10 degrees inside the gimbal limit. If he then beams — turning to put us on his three-nine line — his own contribution to the closure goes to zero and the total falls to 309 knots. The velocity-rejection band is drawn at his aircraft as an angular band of headings about the beam, plus or minus 7 degrees at 480 knots, because the condition is on radial velocity and not on a place in the sky.",
    captions: [
      "Thirty miles, both at 480 knots, nose to nose. Nine hundred and sixty knots of closure and 113 seconds.",
      "Crank fifty degrees. The closure falls to 789 knots and he is still 10° inside the gimbal limit — reduced, not stopped.",
      "Now he beams. His term in the closure goes to zero and the total falls to 309 knots. Still falling.",
      "And the notch is not a place. It is a band of his headings about the beam, ±7° at this speed, and it narrows as he speeds up.",
    ],
    states: [
      dashed(us[0], us[1], him[0], him[1], "ref") +
        arc(us[0], us[1], 132, -BV.GIMBAL, BV.GIMBAL, "ref", "dash") +
        dashed(us[0], us[1], ...at(us[0], us[1], -BV.GIMBAL, 132), "ref") +
        dashed(us[0], us[1], ...at(us[0], us[1], BV.GIMBAL, 132), "ref") +
        chip(us[0] + 96, us[1] - 78, `gimbal ±${BV.GIMBAL}°`, "ref", { small: true }) +
        jet(us[0], us[1], 0, "friendly") + jet(him[0], him[1], 180, "threat") +
        chip(us[0] + 10, us[1] + 34, `us · ${BV.KT} kt`, "friendly", { small: true }) +
        chip(him[0] - 10, him[1] + 34, `him · ${BV.KT} kt`, "threat", { small: true }) +
        chip(400, CY - 30, `${nm(BV.R0)} nm`, "ref", { small: true }) +
        chip(400, 92, `closure ${Math.round(BV.clos(0, 180) * KTS)} kt · ${Math.round(BV.R0 / BV.clos(0, 180))} s`, "circle", { small: true }) +
        leg(BV.hot, "threat") +
        line(64, 452, 64 + bar, 452, "ref", "axis") + line(64, 447, 64, 457, "ref", "axis") +
        line(64 + bar, 447, 64 + bar, 457, "ref", "axis") +
        chip(64 + bar / 2, 436, "10 nm", "ref", { small: true }),
      leg(BV.crank, "track") +
        arc(us[0], us[1], 72, -BV.CRANK, 0, "angle") +
        tag(at(us[0], us[1], -BV.CRANK / 2, 72), [188, 152], `crank ${BV.CRANK}°`) +
        chip(400, 130, `closure ${Math.round(BV.clos(BV.CRANK, 180) * KTS)} kt · ${Math.round(BV.R0 / BV.clos(BV.CRANK, 180))} s`, "circle", { small: true }),
      leg(BV.beam, "threat") +
        arc(him[0], him[1], 66, 90, 180, "angle") +
        tag(at(him[0], him[1], 135, 66), [636, 196], `aspect 90°`) +
        chip(400, 168, `closure ${Math.round(BV.clos(BV.CRANK, 90) * KTS)} kt · his term is zero`, "circle", { small: true }),
      /* Drawn in the angle grammar and not as a filled region, because it is
         not a region: it is the set of HIS headings whose radial component is
         small enough to be thrown away. Two rays and the arc between them say
         that; a shaded wedge of sky would say the opposite thing. */
      (() => {
        const w = BV.band(BV.KT), r = 104;
        return dashed(him[0], him[1], ...at(him[0], him[1], -90 - w, r + 26), "ref") +
          dashed(him[0], him[1], ...at(him[0], him[1], -90 + w, r + 26), "ref") +
          arc(him[0], him[1], r, -90 - w, -90 + w, "angle") +
          arc(him[0], him[1], r + 12, -90 - w, -90 + w, "angle") +
          chip(him[0] - 6, him[1] - r - 46, `±${w.toFixed(1)}° of his heading`, "angle", { small: true }) +
          /* Clear of the gimbal arc's lower reach, which sweeps down to x = 181
             at this height and would otherwise be ruled through the sentence. */
          note(452, 392, `|V cos AA| < ${BV.NOTCH} m/s. A condition on velocity, so the band is ±${BV.band(300).toFixed(1)}° at 300 kt and ±${BV.band(600).toFixed(1)}° at 600.`);
      })(),
    ],
  });
};

D["bvr-geometry/closure-lever"] = () => {
  /* Chapter 13's closure expression, plotted against the one term each of you
     owns. The x axis is our nose off the line of sight; the two curves are what
     he is doing about it. Every mark on the plate is that expression evaluated,
     which is the whole argument that BVR is not a second subject. */
  const g = frame({ xLabel: "our nose off the line of sight", yLabel: "closure  (kt)" });
  const AMAX = 90, CMAX = 1000;                  // ° across, kt up
  const PX = (ata, kt) => [g.X(ata / AMAX), g.Y(kt / CMAX)];
  const kt = (ata, aa) => BV.clos(ata, aa) * KTS;
  const line2 = (aa, kind) =>
    curve((t) => kt(t * AMAX, aa) / CMAX, g.X, g.Y, kind, { steps: 60 });
  const mark = (ata, aa, text, dy, kind = "angle") => {
    const p = PX(ata, kt(ata, aa));
    return dot(p[0], p[1], kind, 5) + chip(p[0], p[1] + dy, text, kind, { small: true });
  };
  return figure({
    title: "One equation, two people, two levers",
    desc: "Chapter thirteen's closure expression plotted against our own antenna train angle, with both aircraft at 480 knots. With the bandit hot, closure falls from 960 knots nose-on to 480 knots on the beam; chapter fourteen's 15 degrees of lag takes only 16 knots off it, while a 50 degree crank takes 171. A second curve shows the same sweep with the bandit beaming, where his term is zero: cranked and beamed together, the closure is 309 knots. Neither lever reaches the axis, so the range keeps falling in every case.",
    captions: [
      "Closure against where your own nose is, with him coming straight at you. Nine hundred and sixty knots at the top left.",
      "Chapter fourteen's lag is the same lever at 15°, worth 16 knots. A crank is the same lever at 50°, worth 171.",
      "His term is the other half. Beaming takes it to zero — and the two together still leave 309 knots of closing.",
    ],
    states: [
      g.s + line2(180, "circle") +
        chip(g.X(0.13), g.Y(kt(0, 180) / CMAX) - 24, `${Math.round(kt(0, 180))} kt nose-on`, "circle", { small: true }) +
        /* Only the two ends. The axis is linear and frame() already puts the
           name of the quantity in the middle of that line, so a third label at
           45° lands on top of it and buys nothing. */
        note(g.X(0), g.Y(0) + 22, "0°") + note(g.X(1), g.Y(0) + 22, "90°"),
      /* Fifteen degrees and nose-on are 16 kt apart, which is the point being
         made and also means their chips cannot both sit on the curve. The lag
         mark goes out on a leader into clear paper below it. */
      dot(...PX(15, kt(15, 180)), "angle", 5) +
        tag(PX(15, kt(15, 180)), [300, 132], `lag 15° · ${Math.round(kt(15, 180))} kt`) +
        mark(BV.CRANK, 180, `crank ${BV.CRANK}° · ${Math.round(kt(BV.CRANK, 180))} kt`, -26) +
        note(g.X(0.28), g.Y(0.06), `15° costs him ${Math.round(kt(0, 180) - kt(15, 180))} kt of closure; 50° costs him ${Math.round(kt(0, 180) - kt(BV.CRANK, 180))}.`),
      line2(90, "threat") +
        chip(g.X(0.2), g.Y(kt(20, 90) / CMAX) - 24, "and now he beams", "threat", { small: true }) +
        mark(BV.CRANK, 90, `both · ${Math.round(kt(BV.CRANK, 90))} kt`, 28, "drag"),
    ],
  });
};

/* ══ intercept-timeline ═══════════════════════════════════════════════════

   A ladder of tasks gated by range, and a clock that nobody stops. The rungs
   below are placed at ranges this figure states as its own premise — real
   commit criteria and shot ranges are briefed per mission and per weapon, and
   this course has no business inventing them. What is not a premise is the
   arithmetic: at 960 knots of closure a nautical mile costs 3.75 seconds, and
   that is what makes the ladder short. */
const IT = (() => {
  const KT = 480, V = KT / KTS;
  const HOT = 2 * V, CRANKED = V * cos(50) + V;      // m/s of closure, before and after
  const secs = (nm, c = HOT) => (nm * 1852) / c;
  /* Where a 9.14 m span first reaches one arcminute, which is what a 20/20 eye
     resolves. Detection of a moving high-contrast dot beats resolution, so this
     is the optimistic end rather than a promise — and it still lands after the
     shot. */
  const seeNm = FIGHTER.b / (Math.PI / (180 * 60)) / 1852;
  return { KT, V, HOT, CRANKED, secs, seeNm };
})();

D["intercept-timeline/timeline"] = () => {
  const NM0 = 40, X0 = 92, X1 = 764, AX = 196;
  const X = (nm) => X0 + ((NM0 - nm) / NM0) * (X1 - X0);
  const rung = (nm, task, why, up) => {
    const x = X(nm), y = AX;
    return line(x, y - 9, x, y + 9, "ref", "axis") +
      chip(x, y - (up ? 46 : -46), task, "friendly", { small: true }) +
      chip(x, y - (up ? 74 : -74), `${nm} nm · ${Math.round(IT.secs(nm))} s`, "circle", { small: true }) +
      note(x, y - (up ? 96 : -100), why);
  };
  const scale = [40, 30, 20, 10, 0].map((nm) =>
    line(X(nm), AX, X(nm), AX + 6, "ref", "axis") + note(X(nm), AX + 26, `${nm}`)).join("");
  return figure({
    vb: "0 0 840 460",
    title: "The ladder, and the clock running down it",
    desc: "A horizontal range scale from 40 nautical miles down to zero, with the tasks of an intercept placed on it as rungs. At 480 knots each and 960 knots of closure, 40 miles is 150 seconds and every mile costs 3.75 seconds. Commit sits at 40 miles and 150 seconds, sort at 30 miles and 113 seconds, the shot at 20 miles and 75 seconds, the crank at 15 miles, and the decision to leave or press at 10 miles and 38 seconds. Cranking stretches the remaining time from 56 seconds to 68. A 9.14 metre wingspan first subtends one arcminute at 17 miles, which is after most of the ladder has been climbed. The rung ranges are the figure's own premise, not a doctrinal claim.",
    captions: [
      "Forty miles at 960 knots of closure is two and a half minutes. That is the whole engagement, and it starts here.",
      "Sort: whose is which. Thirty miles, a hundred and thirteen seconds, and nobody has seen anything.",
      "The shot. Twenty miles, seventy-five seconds — and the missile's problem is now geometry rather than yours.",
      "Crank. The closure falls to 789 knots, which stretches the fifteen miles left from 56 seconds to 68.",
      "And the decision: turn out, or keep going. It is made at ten miles, thirty-eight seconds, and mostly blind.",
    ],
    states: [
      /* The unit rides at the right-hand end of the scale rather than centred
         under it: the middle of the band below the axis belongs to the rungs
         that hang there, and a label placed politely in the centre lands on
         them. */
      line(X0 - 14, AX, X1 + 14, AX, "ref", "axis") + scale +
        note(X1 - 12, AX + 44, "nm to the group") +
        rung(40, "commit", "briefed criteria", true),
      rung(30, "sort", "which one is yours", false),
      rung(20, "shoot", "then it is not yours", true),
      rung(15, "crank", `789 kt · ${Math.round(IT.secs(15, IT.CRANKED))} s, not ${Math.round(IT.secs(15))}`, false),
      rung(10, "decide", "out, or to the merge", true) +
        /* Stops short of the rung captions above it rather than ruling through
           them — the line marks a range on the scale, and a hairline crossing a
           sentence is read as a strikethrough. */
        dashed(X(IT.seeNm), AX - 56, X(IT.seeNm), AX + 96, "ref") +
        chip(X(IT.seeNm) - 4, AX + 116, `${IT.seeNm.toFixed(0)} nm · one arcminute`, "angle", { small: true }) +
        note(X(IT.seeNm) + 108, AX + 140, "everything to the left of this line was flown on somebody's radar."),
    ],
  });
};

D["intercept-timeline/skate-or-banzai"] = () => {
  /* The fork, integrated rather than sketched. Both flows begin at the same shot
     at 20 nm; in one we turn cold at the hardest rate the aeroplane has and run,
     in the other we hold what we were doing. He does the same thing in both,
     which is what makes them comparable. */
  const R0 = 20 * 1852, T = 70, dt = 0.1, V = IT.V;
  const w = turnPerformance(V, FIGHTER).rate;               // rad/s at 480 kt
  /* One integrator, three runs. `from` and `turnTo` are screen degrees; the
     aeroplane rolls out on the commanded heading at the hardest rate it has and
     then flies it. Skate's cold turn therefore costs real seconds and real
     ground, which is the only honest way to draw a decision that is about
     time. */
  const fly = (from, turnTo, x0) => {
    let p = [x0, 0], hdg = R(from);
    const out = [];
    for (let i = 0; i * dt <= T + 1e-9; i++) {
      out.push({ t: i * dt, p: [...p] });
      const err = R(turnTo) - hdg;
      hdg += Math.max(-w * dt, Math.min(w * dt, err));
      p = [p[0] + V * Math.cos(hdg) * dt, p[1] + V * Math.sin(hdg) * dt];
    }
    return out;
  };
  const him = fly(180, 180, R0 / 2);
  /* 160° and not 180°: dead cold draws as a line back along the one it came
     down, and two overlaid tracks are the one thing a comparison plate cannot
     have. Twenty degrees off cold still leaves 15 m/s of closure against 494,
     which is the stalemate the caption claims — the figure measures the end
     range rather than asserting it. */
  const banzai = fly(0, 0, -R0 / 2), skate = fly(0, 160, -R0 / 2);
  const S = 340 / R0, CY = 150;
  const P = ([x, y]) => [420 + x * S, CY + y * S];
  const endOf = (run) => run[run.length - 1].p;
  const nmApart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) / 1852;
  const draw = (run, kind) => trackPath(run.map((q) => P(q.p)), kind);
  const bar = 10 * 1852 * S;
  const shot = P([-R0 / 2, 0]);
  return figure({
    vb: "0 0 840 360",
    title: "Skate and Banzai from the same shot",
    desc: "Both flows begin from one shot taken at 20 nautical miles with both aircraft at 480 knots. Banzai holds the intercept and the range closes to the merge inside 75 seconds. Skate turns cold at the aircraft's hardest rate and runs, and because both aircraft then travel at the same speed in the same direction the range settles and stops falling. The difference between the two is not the shot and not the manoeuvre. It is a decision taken before the shot about what happens after it.",
    captions: [
      "One shot, taken at twenty miles. From here the two flows differ in one decision and nothing else.",
      "Banzai: launch and decide. Hold the intercept, keep the picture, and arrive at the merge inside 75 seconds.",
      "Skate: launch and leave. Turn cold and the closure goes to nothing — a stalemate at range is the point of it.",
    ],
    states: [
      dashed(shot[0], shot[1], ...P([R0 / 2, 0]), "ref") +
        jet(shot[0], shot[1], 0, "friendly") + jet(...P([R0 / 2, 0]), 180, "threat") +
        chip(shot[0] + 34, shot[1] + 32, `us · ${IT.KT} kt`, "friendly", { small: true }) +
        chip(P([R0 / 2, 0])[0] - 34, CY + 32, `him · ${IT.KT} kt`, "threat", { small: true }) +
        chip(420, CY + 60, `shot at ${(R0 / 1852).toFixed(0)} nm`, "ref", { small: true }) +
        draw(him, "threat") +
        line(64, 268, 64 + bar, 268, "ref", "axis") + line(64, 263, 64, 273, "ref", "axis") +
        line(64 + bar, 263, 64 + bar, 273, "ref", "axis") +
        chip(64 + bar / 2, 252, "10 nm", "ref", { small: true }),
      draw(banzai, "track") +
        jet(...P(endOf(banzai)), 0, "friendly") +
        chip(430, 74, `banzai · ${Math.round(R0 / IT.HOT)} s to the merge`, "track", { small: true }),
      draw(skate, "track") +
        jet(...P(endOf(skate)), 160, "friendly") +
        chip(228, 206, `skate · ${nmApart(endOf(skate), endOf(him)).toFixed(1)} nm at ${T} s`,
          "track", { small: true }),
    ],
  });
};

/* ══ tactical-pictures ════════════════════════════════════════════════════

   Seven labels, on one plate. A picture label IS its arrangement — there is no
   physics here to get wrong, only a shape and the word for it — so the whole
   subject is a drawing, and prose is the worst possible way to carry it.

   One plate rather than seven, because the confusion these words cause is a
   confusion BETWEEN them: VIC and CHAMPAGNE are the same three groups with the
   single one at opposite ends, and nobody holds that from two sentences. Side
   by side it is one glance.

   Every mark is `threat`, and that is the argument as much as the drawing. WALL,
   LADDER, BOX and VIC are all words for friendly formations too, and the source
   warns about exactly that collision — so nothing friendly is drawn on this
   plate at all, and the last state says so in as many words.

   A group is drawn as the threat kind's bare open ring and NOT as an aeroplane
   with a nose. Two reasons, and both are about not saying more than the label
   does: a group is however many contacts the grouping criteria treat as one
   thing, so it has no single heading to point; and a picture label carries no
   claim about heading at all. A nose on these would be an invented fact, which
   is the one thing a figure may not contain. §1a then holds for free — there is
   nothing here that could be mistaken for an arrow. */
D["tactical-pictures/labels"] = () => {
  const R1 = 118, R2 = 282;            // the two rows of cells
  const AZ = 46, RG = 30;              // px — the azimuth and the range split in a cell
  const grp = (x, y) => dot(x, y, "threat", 7);
  const cell = (cx, cy, label, at3) =>
    at3.map(([dx, dy]) => grp(cx + dx, cy + dy)).join("") +
    chip(cx, cy + 68, label, "threat", { small: true });
  const says = (cx, cy, t) => chip(cx, cy - 56, t, "angle", { small: true });

  return figure({
    vb: "0 0 860 480",
    title: "The seven picture labels, drawn",
    desc: "Seven arrangements of detected groups, each group drawn as an open ring and each arrangement captioned with the label it earns. Range increases up the plate, so a lower ring is a nearer group; azimuth runs across it. Azimuth is two groups side by side at the same range. Range is two groups one behind the other. Wall is three groups abreast. Ladder is three groups in depth. Vic is one group leading with two trailing it side by side. Champagne is two groups leading side by side with one trailing behind them. Box is two leading and two trailing. Nothing friendly is drawn anywhere on the plate, because a picture label describes contacts and never a friendly formation.",
    captions: [
      "Two groups, and two ways for them to be apart: across your nose, or one behind the other.",
      "Three or more of either, and each gets its own word — abreast is a wall, in depth is a ladder.",
      "Three groups with one of them alone. VIC puts the single group in front; CHAMPAGNE puts it behind.",
      "Four, two and two. And not one of these says how anybody is flying — every ring here is a contact.",
    ],
    states: [
      /* The frame first, because every cell below is read against it, and the
         connectors before their rings so the rings sit on top. */
      note(430, 28, "Range increases up the plate, so the lower ring is the nearer group.") +
        dashed(115 - AZ, R1, 115 + AZ, R1, "ref") +
        dashed(325, R1 - RG, 325, R1 + RG, "ref") +
        cell(115, R1, "AZIMUTH", [[-AZ, 0], [AZ, 0]]) + says(115, R1, "side by side") +
        cell(325, R1, "RANGE", [[0, -RG], [0, RG]]) + says(325, R1, "one behind the other"),
      cell(535, R1, "WALL", [[-58, 0], [0, 0], [58, 0]]) +
        cell(745, R1, "LADDER", [[0, -42], [0, 0], [0, 42]]),
      cell(220, R2, "VIC", [[0, RG], [-AZ, -RG], [AZ, -RG]]) +
        says(220, R2, "the single group leads") +
        cell(430, R2, "CHAMPAGNE", [[-AZ, RG], [AZ, RG], [0, -RG]]) +
        says(430, R2, "the single group trails"),
      cell(640, R2, "BOX", [[-AZ, -RG], [AZ, -RG], [-AZ, RG], [AZ, RG]]) +
        note(430, 400, "These name how CONTACTS are arranged, and nothing about how anybody is flying.") +
        note(430, 422, "WALL is not line abreast, RANGE is not a trail formation, BOX is not a four-ship box."),
    ],
  });
};

export default D;
