/* Every authored figure in the project. Each builder returns a complete SVG.
   Colour is never named here — only semantic kinds — so §1 holds by construction. */

import {
  line, arrow, component, moment, arc, path, dashed, poly, blob, dot,
  chip, note, aircraft, cgMark, airfoil, frame, curve, figure,
} from "./svg.js";

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
        chip(X(best), Y(0) + 26, "best L/D", "angle", { small: true }) +
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
      note(400, 116, "wing seen from behind"),
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
      f.s + line(X(0), Y2(0), X(1), Y2(0), "ref", "dash") + chip(X(0) - 30, Y2(0), "0", "ref", { small: true }),
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
        chip(CX, CY + 196, "roll · pitch · yaw", "ref", { small: true }),
      ring(CX, CY, 112, 82, "lift") + arc(CX, CY, 178, 250, 300) +
        chip(CX + 152, CY - 154, "pitching up", "angle", { small: true }),
      ring(CX, CY, 112, 6, "lift") + ring(CX, CY, 74, 6, "moment") +
        chip(CX, CY - 52, "aligned — locked", "drag", { small: true }),
      note(400, 424, "A quaternion carries no preferred axis, so there is no attitude at which it degenerates."),
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

export default D;
