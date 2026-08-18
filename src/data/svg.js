/* SVG primitives that encode content/visual-grammar.md so every figure obeys it
   by construction. Diagrams are built as strings — simpler than DOM here, and the
   output is inspectable. Colour is never passed in; only a semantic `kind`. */

const VB_W = 800, VB_H = 500;

/* §1 — kind → CSS class. A diagram names meaning, never colour. */
const KIND = {
  lift: "k-lift", weight: "k-weight", thrust: "k-thrust", drag: "k-drag",
  other: "k-other", moment: "k-moment", flow: "k-flow", angle: "k-angle",
  ref: "k-ref", ink: "k-ink", low: "k-low", high: "k-high",
  /* Part II — relational, not aerodynamic. A fight is drawn in terms of who
     somebody is and where they have been, which the force kinds cannot say.
     `track` and `circle` are deliberately two kinds and not one: a track is
     where an aircraft has been, a circle is where it is committed to going. */
  friendly: "k-friendly", threat: "k-threat", track: "k-track", circle: "k-circle",
};
const k = (n) => KIND[n] || KIND.ink;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v) => Math.round(v * 100) / 100;

/* ── marks ─────────────────────────────────────────────────────────────── */

function line(x1, y1, x2, y2, kind = "ink", cls = "") {
  return `<line class="stroke ${k(kind)} ${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
}

/* Force arrow — §2: 2.5px, 9px head, flat tail. Trimmed at the origin so it
   never covers the CG marker it radiates from. */
function arrow(x1, y1, x2, y2, kind, { trim = 12, cls = "" } = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const sx = x1 + (dx / len) * trim, sy = y1 + (dy / len) * trim;
  return `<line class="force ${k(kind)} ${cls}" marker-end="url(#head-${kind})"
    x1="${n(sx)}" y1="${n(sy)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
}

/* A resolved component is not an independent force — thin and dashed so the
   reader never counts it as an extra arrow. */
function component(x1, y1, x2, y2, kind, { trim = 12 } = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const sx = x1 + (dx / len) * trim, sy = y1 + (dy / len) * trim;
  return `<line class="component ${k(kind)}" marker-end="url(#head-${kind})"
    x1="${n(sx)}" y1="${n(sy)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
}

/* Moments are always curved — §1. */
function moment(cx, cy, r, a0, a1, { kind = "moment" } = {}) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  return `<path class="force ${k(kind)}" marker-end="url(#head-${kind})" fill="none"
    d="M ${n(x0)} ${n(y0)} A ${r} ${r} 0 ${large} ${sweep} ${n(x1)} ${n(y1)}"/>`;
}

/* `cls` exists so turnCircle can carry its dash through a partial sweep. Without
   it the dash option would silently no-op on every arc that is not a full
   circle, which is most of them in a fight figure. */
function arc(cx, cy, r, a0, a1, kind = "angle", cls = "") {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  return `<path class="hair ${k(kind)} ${cls}" fill="none"
    d="M ${n(x0)} ${n(y0)} A ${r} ${r} 0 ${large} ${sweep} ${n(x1)} ${n(y1)}"/>`;
}

function path(d, kind = "ink", { fill = "none", cls = "" } = {}) {
  return `<path class="stroke ${k(kind)} ${cls}" d="${d}" fill="${fill}"/>`;
}

function dashed(x1, y1, x2, y2, kind = "ref") {
  return `<line class="hair dash ${k(kind)}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
}

function poly(pts, kind = "ink", { cls = "", fill = "none" } = {}) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${n(x)} ${n(y)}`).join(" ");
  return `<path class="stroke ${k(kind)} ${cls}" fill="${fill}" d="${d}"/>`;
}

function blob(pts, kind) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${n(x)} ${n(y)}`).join(" ") + " Z";
  return `<path class="area ${k(kind)}" d="${d}"/>`;
}

function dot(cx, cy, kind = "angle", r = 5) {
  return `<circle class="dot ${k(kind)}" cx="${n(cx)}" cy="${n(cy)}" r="${r}"/>`;
}

/* A turn circle — the path an aircraft at a given speed and G is committed to.
   Drawn as a real circle because it IS one; the radius comes from the flight
   model, never from taste. `from`/`to` are screen degrees: 0 points right, the
   sweep runs clockwise because y grows downward. The option is `dash`, not
   `dashed` — `dashed` is already a function in this module. */
function turnCircle(cx, cy, r, kind = "circle", { from = 0, to = 360, dash = true } = {}) {
  const cls = dash ? "dash" : "";
  if (to - from >= 360) {
    return `<circle class="hair ${k(kind)} ${cls}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none"/>`;
  }
  return arc(cx, cy, r, from, to, kind, cls);
}

/* Where an aircraft has actually been. Distinct from a turn circle by
   construction and not by discipline: a track is a solid drawn line at line
   weight, a circle a dashed hairline locus. The past and the commitment can
   never end up looking the same, whichever kind they are drawn in. */
function trackPath(pts, kind = "track", { cls = "" } = {}) {
  return poly(pts, kind, { cls: `track ${cls}` });
}

/* §3 — labels live in a chip on the figure, never in a legend. */
function chip(cx, cy, text, kind = "ink", { small = false } = {}) {
  const t = esc(text);
  const w = (small ? 7.0 : 8.2) * t.length + 18, h = small ? 24 : 26;
  return `<g class="chip-g"><rect class="chip" x="${n(cx - w / 2)}" y="${n(cy - h / 2)}"
    width="${n(w)}" height="${h}" rx="4"/><text class="chip-t ${small ? "sm " : ""}${k(kind)}"
    x="${n(cx)}" y="${n(cy)}">${t}</text></g>`;
}

function note(cx, cy, text, { anchor = "middle" } = {}) {
  return `<text class="note" text-anchor="${anchor}" x="${n(cx)}" y="${n(cy)}">${esc(text)}</text>`;
}

/* ── the aircraft, reused across the whole project ─────────────────────── */

const AIRFRAME = [
  `M 262 256 C 258 244 266 236 280 232 C 305 224 340 221 380 220 L 468 221
   C 492 221 508 217 522 211 L 566 194 C 574 191 578 196 574 203 L 556 234
   C 548 244 530 250 505 252 L 350 262 C 300 265 268 264 262 256 Z`,
  `M 344 214 L 458 212 L 464 222 L 344 224 Z`,
  `M 420 224 L 356 258`,
  `M 516 213 L 548 168 L 566 170 L 566 196 Z`,
  `M 538 201 L 584 198 L 586 204 L 538 207 Z`,
];

/* Second pass at hairline weight: cockpit glazing, door, panel breaks and the
   gear. Drafting fidelity comes from the detail layer, not from more outline —
   the airframe reads as a drawn plate rather than a whiteboard sketch. Every
   line here is a real seam, break or hinge, because invented detail is noise. */
const DETAIL = [
  `M 330 226 L 352 234`,                                   // windscreen post
  `M 356 231 L 356 250`,                                   // window division
  `M 384 230 L 384 253`,                                   // door forward edge
  `M 384 240 L 414 239`,                                   // door handle line
  `M 414 230 L 414 252`,                                   // door aft edge
  `M 336 232 C 352 228 404 227 436 229 L 438 246 C 400 249 350 250 334 248 Z`, // glazing
  `M 470 227 L 470 251`,                                   // fuselage frame
  `M 506 224 L 506 250`,                                   // fuselage frame
  `M 528 214 L 552 190`,                                   // fin leading-edge break
  `M 546 200 L 562 198`,                                   // rudder hinge
  `M 556 202 L 558 216`,                                   // rudder line
  /* Skin seams: the plate reads as built sheet metal, not one closed outline. */
  `M 288 236 L 292 258`,                                   // cowling aft break
  `M 296 233 C 310 229 320 228 330 227`,                   // cowl top seam
  `M 302 256 L 468 253`,                                   // belly stringer
  `M 396 214 L 396 223`,                                   // wing rib station
  `M 424 213 L 424 223`,                                   // aileron division
  `M 424 223 L 372 251`,                                   // aft lift strut
  `M 566 199 L 566 206`,                                   // elevator hinge
  `M 576 199 L 576 205`,                                   // trim tab
  `M 534 210 L 556 186`,                                   // fin rib
  /* Landing gear: two legs and a fairing each, not a single stick. */
  `M 372 260 L 366 282`,                                   // main gear forward leg
  `M 378 259 L 370 282`,                                   // main gear aft leg
  `M 300 258 L 296 276`,                                   // nose gear forward leg
  `M 306 257 L 300 276`,                                   // nose gear aft leg
];

/* Drawn nose-left with its CG at (400,250). Positive `rot` pitches the nose UP:
   SVG rotates clockwise on screen because y grows downward. */
function aircraft({ cx = 400, cy = 250, rot = 0, scale = 1, cg = true } = {}) {
  const inner = AIRFRAME.map((d) => path(d)).join("") +
    DETAIL.map((d) => `<path class="hair ${k("ink")}" d="${d}" fill="none"/>`).join("") +
    // Tyres carry a hub, so a wheel is a wheel and not a dot on a stick.
    `<circle class="hair ${k("ink")}" cx="368" cy="288" r="7.5" fill="none"/>` +
    `<circle class="hair ${k("ink")}" cx="368" cy="288" r="2.8" fill="none"/>` +
    `<circle class="hair ${k("ink")}" cx="298" cy="281" r="6" fill="none"/>` +
    `<circle class="hair ${k("ink")}" cx="298" cy="281" r="2.2" fill="none"/>` +
    // Propeller: the disc seen edge-on, plus the spinner it turns on.
    `<ellipse class="stroke ${k("ink")}" cx="260" cy="244" rx="4" ry="26" fill="none"/>` +
    `<path class="stroke ${k("ink")}" d="M 250 244 L 266 235 L 266 253 Z" fill="none"/>`;
  const t = [
    `translate(${n(cx - 400)} ${n(cy - 250)})`,
    `rotate(${rot} 400 250)`,
    scale !== 1 ? `translate(400 250) scale(${scale}) translate(-400 -250)` : "",
  ].filter(Boolean).join(" ");
  /* `airframe` drops the whole aeroplane to secondary ink. The forces are the
     subject of these plates and the aeroplane is the thing they act on, so it
     is drawn as the quieter mark. It also resolves a collision: on the negative
     plate `--f-weight` and `--ink` are the same value, so a full-ink airframe
     and the weight arrow were literally the same colour. The CG mark stays at
     full ink — it is a datum, not the body. */
  return `<g class="airframe" transform="${t}">${inner}</g>` + (cg ? cgMark(cx, cy) : "");
}

/* Standard quartered centre-of-gravity symbol. */
function cgMark(cx, cy, r = 9) {
  return `<g class="cg"><circle class="cg-ring" cx="${n(cx)}" cy="${n(cy)}" r="${r}"/>
    <path class="cg-fill" d="M ${n(cx)} ${n(cy)} L ${n(cx)} ${n(cy - r)} A ${r} ${r} 0 0 1 ${n(cx + r)} ${n(cy)} Z"/>
    <path class="cg-fill" d="M ${n(cx)} ${n(cy)} L ${n(cx)} ${n(cy + r)} A ${r} ${r} 0 0 1 ${n(cx - r)} ${n(cy)} Z"/></g>`;
}

/* A simple airfoil section, nose-left, chord `c`, pitched by `aoa` degrees. */
function airfoil({ cx = 400, cy = 250, c = 200, aoa = 0, kind = "ink", fill = false } = {}) {
  const s = c / 200;
  const d = `M -100 6 C -96 -4 -76 -12 -40 -14 C 0 -16 50 -12 100 -2
             C 60 4 0 10 -46 12 C -78 13 -96 11 -100 6 Z`;
  return `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${-aoa}) scale(${n(s)})">
    <path class="stroke ${k(kind)}" fill="${fill ? "currentColor" : "none"}" d="${d}"/></g>`;
}

/* ── plot frame ────────────────────────────────────────────────────────── */

/* Returns pixel mappers plus the axis furniture. Data space is 0..1 in both
   directions; each diagram normalises its own numbers. */
function frame({ x = 120, y = 66, w = 550, h = 296, xLabel = "", yLabel = "", ticks = true } = {}) {
  const X = (v) => x + v * w, Y = (v) => y + h - v * h;
  let s = line(x, y + h, x + w + 14, y + h, "ref", "axis") + line(x, y + h, x, y - 14, "ref", "axis");
  if (ticks) for (let i = 1; i <= 4; i++) {
    s += line(X(i / 5), y + h, X(i / 5), y + h + 5, "ref", "axis");
    s += line(x - 5, Y(i / 5), x, Y(i / 5), "ref", "axis");
  }
  if (xLabel) s += note(x + w / 2, y + h + 34, xLabel);
  if (yLabel) s += `<text class="note" text-anchor="middle" transform="rotate(-90 ${x - 44} ${y + h / 2})"
    x="${x - 44}" y="${y + h / 2}">${esc(yLabel)}</text>`;
  return { s, X, Y, x, y, w, h };
}

/* Sample fn over 0..1 and return a polyline in pixel space. */
function curve(F, X, Y, kind, { from = 0, to = 1, steps = 80, cls = "" } = {}) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    pts.push([X(t), Y(F(t))]);
  }
  return poly(pts, kind, { cls });
}

/* ── document wrapper ──────────────────────────────────────────────────── */

/* Every kind that can carry an arrowhead needs a marker generated here, or
   `marker-end` points at an id that does not exist and the head vanishes with
   no error at all. The relational kinds carry velocity, closure and pursuit
   arrows, so all four are listed. */
const HEADS = ["lift", "weight", "thrust", "drag", "other", "moment", "flow", "angle", "ink", "ref",
  "friendly", "threat", "track", "circle"];

function defs() {
  return `<defs>${HEADS.map((h) => `<marker id="head-${h}" viewBox="0 0 10 10" refX="8.5" refY="5"
    markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="fill-${h}"/></marker>`).join("")}</defs>`;
}

/* Progressive build (§4.2): all states share one viewBox and one set of
   positions; later states only add. */
function figure({ title, desc, states = [], captions = [], vb = `0 0 ${VB_W} ${VB_H}` }) {
  // Captions sit on the box the figure actually uses, not on a hardcoded 800x500.
  const [, , vw, vh] = vb.split(/\s+/).map(Number);
  const body = states.map((sBody, i) => `<g class="s${i + 1}">${sBody}</g>`).join("");
  const caps = captions.map((c, i) =>
    `<text class="cap cap${i + 1}" x="${n(vw / 2)}" y="${n(vh - 30)}">${esc(c)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="figure" data-state="${states.length}"
    role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(desc)}</desc>
    ${defs()}${body}<g class="caption">${caps}</g></svg>`;
}

export {
  line, arrow, component, moment, arc, path, dashed, poly, blob, dot, chip, note,
  turnCircle, trackPath,
  aircraft, cgMark, airfoil, frame, curve, figure, n, esc,
};
