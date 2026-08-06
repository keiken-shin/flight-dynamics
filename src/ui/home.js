import { LESSONS } from "../data/lessons.js";
import plateUrl from "../../assets/generated/plate-aircraft.png";
import { el, progress } from "./util.js";
import { catalogueStrip } from "./cards.js";
import { checkrideStrip } from "./checkride.js";
import { creditsStrip } from "./credits.js";

/* Balloon stations over the plate, in the raster's own 1536x1024 space.
 * `b` is the balloon, placed in paper the illustration actually left empty;
 * `t` is the point on the airframe its leader touches — every one lands on a
 * real component, read off the shipped PNG rather than guessed.
 *
 * `label` is a SHORT plate name. Full lesson titles are far too long to sit on
 * a drawing without striking through it, and the index table below carries the
 * full title anyway. */
const STATIONS = [
  { b: [178, 108],  t: [470, 205],  label: "FOUR FORCES" },        // wing, outboard left
  { b: [706, 58],   t: [800, 430],  label: "LIFT" },               // cabin structure
  { b: [1462, 58],  t: [1344, 158], label: "ANGLE OF ATTACK" },    // vertical fin
  { b: [1478, 300], t: [1398, 424], label: "DRAG" },               // horizontal stabiliser
  { b: [1454, 566], t: [1186, 498], label: "AXES & CONTROLS" },    // rear fuselage
  { b: [1332, 706], t: [1108, 612], label: "STABILITY" },          // strut
  { b: [1186, 952], t: [962, 892],  label: "PITCH MODES" },        // right main gear
  { b: [704, 962],  t: [652, 812],  label: "LATERAL MODES" },      // left main gear
  { b: [432, 934],  t: [468, 700],  label: "TURNING" },            // cowling
  { b: [252, 946],  t: [302, 722],  label: "ENVELOPE" },           // engine
  { b: [92, 902],   t: [184, 800],  label: "EQUATIONS OF MOTION" },// propeller
  { b: [54, 432],   t: [86, 688],   label: "CONTROL LOOP" },       // spinner
];

const R = 21;

export function renderHome(root) {
  const done = progress();
  root.innerHTML = "";

  const lede = el("div", "home__lede");
  const h = el("h1", "t-display");
  h.textContent = "Flight dynamics, taken apart";
  const p = el("p");
  p.textContent =
    "Twelve ideas in the order they make sense. Every one names the thing you " +
    "probably believe that isn't true, then takes it apart until it is obvious. " +
    "Pick a callout, or start at one.";
  lede.append(h, p);

  // ── the plate ──
  const stage = el("div", "stage");
  const inner = el("div", "stage__inner");   // holds min-width so the plate can scroll on a phone
  const img = el("img");
  img.src = plateUrl;
  img.alt = "";                       // decorative: every balloon is a real link
  inner.appendChild(img);
  stage.appendChild(inner);

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1536 1024");
  svg.setAttribute("aria-hidden", "true");   // the index table below is the a11y path

  LESSONS.forEach((les, i) => {
    const st = STATIONS[i];
    if (!st) return;
    const [bx, by] = st.b, [tx, ty] = st.t;

    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "balloon" + (done[les.id] ? " done" : ""));
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "link");
    g.setAttribute("aria-label", `${i + 1}. ${les.title}`);

    // Leader starts at the balloon's edge, not its centre, so the ring reads clean.
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
    const sx = bx + (dx / len) * R, sy = by + (dy / len) * R;

    const lead = document.createElementNS(NS, "line");
    lead.setAttribute("class", "lead");
    lead.setAttribute("x1", sx); lead.setAttribute("y1", sy);
    lead.setAttribute("x2", tx); lead.setAttribute("y2", ty);
    lead.style.setProperty("--len", Math.round(len - R));

    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("class", "ring");
    ring.setAttribute("cx", bx); ring.setAttribute("cy", by); ring.setAttribute("r", R);

    const num = document.createElementNS(NS, "text");
    num.setAttribute("class", "num");
    num.setAttribute("x", bx); num.setAttribute("y", by);
    num.textContent = String(i + 1);

    // Name sits outboard of the balloon, away from the drawing.
    const name = document.createElementNS(NS, "text");
    name.setAttribute("class", "name");
    /* The label sits on the far side of the balloon from its leader, so it can
       never lie along the line it is labelling — EXCEPT near a frame edge,
       where "away" points off-canvas and the text gets clipped. There, the edge
       decides instead. */
    const awayY = by - dy / len;
    const anchor = bx > 1150 ? "end" : bx < 380 ? "start" : bx - dx / len < bx ? "end" : "start";
    name.setAttribute("text-anchor", anchor);
    name.setAttribute("x", anchor === "end" ? bx - R - 8 : bx + R + 8);
    name.setAttribute("y", awayY < by ? by - 4 : by + 5);
    name.textContent = st.label;

    // Stagger the draw-in so the plate assembles rather than flashing.
    const delay = 120 + i * 46;
    lead.style.animationDelay = `${delay}ms`;
    ring.style.animationDelay = `${delay + 200}ms`;
    name.style.animationDelay = `${delay + 260}ms`;

    g.append(lead, ring, num, name);
    const go = () => { location.hash = les.id; };
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
    svg.appendChild(g);
  });

  inner.appendChild(svg);
  requestAnimationFrame(() => stage.classList.add("enter"));

  // ── the index table: the parts table, carrying real lessons ──
  const table = el("table", "index");
  table.innerHTML =
    "<thead><tr><th>Item</th><th>Lesson</th><th>Remarks</th><th></th></tr></thead>";
  const tb = el("tbody");
  LESSONS.forEach((les, i) => {
    const tr = el("tr", done[les.id] ? "done" : "");
    tr.innerHTML =
      `<td class="c-item">${String(i + 1).padStart(2, "0")}</td>` +
      `<td><a href="#${les.id}">${les.title}</a></td>` +
      `<td class="c-rem">${les.oneLiner}</td>` +
      `<td class="c-st">${done[les.id] ? "complete" : ""}</td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);

  /* Back matter, the way a manual carries it: the parts table, then the index
     of everything worth remembering out of it. */
  root.append(lede, stage, table, catalogueStrip(), checkrideStrip(), creditsStrip());
  document.title = "Flight Dynamics";
}
