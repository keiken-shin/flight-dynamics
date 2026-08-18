import { LESSONS, PARTS, lessonsIn, COURSE } from "../data/lessons.js";
import plateAircraftUrl from "../../assets/generated/plate-aircraft.png";
import plateCombatUrl from "../../assets/generated/plate-combat.png";
import { el } from "./util.js";
import { chapterDone, doneCount, stepsFor } from "./steps.js";
import { catalogueStrip } from "./cards.js";
import { checkrideStrip } from "./checkride.js";
import { glossaryStrip } from "./glossary.js";
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

/* The same job over the combat plate. That drawing is an exploded view, so the
 * assemblies float apart and the gaps between them are the empty paper — which
 * is why these balloons sit inside the frame rather than ringing its edge the
 * way the aircraft plate's do. Coordinates read off the shipped PNG. */
const STATIONS_II = [
  { b: [150, 96],   t: [470, 236],  label: "THREE NUMBERS" },      // canopy, lower frame rail
  { b: [770, 74],   t: [852, 264],  label: "PURSUIT" },            // port wing, internal ribs
  { b: [1330, 96],  t: [1104, 176], label: "RATE & RADIUS" },      // vertical fin
  { b: [1468, 214], t: [1308, 324], label: "ONE OR TWO CIRCLE" },  // stabilator
  { b: [1490, 662], t: [1432, 500], label: "ENERGY" },             // exhaust nozzle ring
  { b: [1180, 930], t: [952, 748],  label: "OVERSHOOTS" },         // missile body
  { b: [730, 950],  t: [644, 792],  label: "BVR GEOMETRY" },       // nose gear strut
  { b: [150, 930],  t: [380, 806],  label: "INTERCEPT" },          // intake duct, lower lip
];

/* A part draws itself from the plate it names. Keyed by that name rather than
   by part number, so a part whose plate has not been drawn yet has no entry
   here and is skipped instead of asking for an image that does not exist. */
const PLATES = {
  aircraft: { url: plateAircraftUrl, stations: STATIONS },
  combat:   { url: plateCombatUrl,   stations: STATIONS_II },
};

const R = 21;

/* Chapter numbers belong to the course, not to the part: Part II opens at 13
   and the index runs 01–20 unbroken. The lesson array is the only place that
   ordering lives, so it is asked rather than copied. */
const chapterNo = (les) => LESSONS.indexOf(les) + 1;

/* One plate and its balloons. Everything that differs between the two parts
   arrives as an argument, so a second plate is data rather than a second copy
   of this function. */
function plateStage(part, lessons, stations, plateUrl) {
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

  lessons.forEach((les, i) => {
    const st = stations[i];
    if (!st) return;
    const [bx, by] = st.b, [tx, ty] = st.t;
    const ch = chapterNo(les);

    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "balloon" + (chapterDone(les.id) ? " done" : ""));
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "link");
    g.setAttribute("aria-label", `${ch}. ${les.title}`);

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
    num.textContent = String(ch);

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

    /* Stagger the draw-in so the plate assembles rather than flashing. Counted
       within the part, not across the course — the second plate is a screen
       away and should not wait out the first one's twelve. */
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
  return stage;
}

export function renderHome(root) {
  root.innerHTML = "";

  PARTS.forEach((part) => {
    const lessons = lessonsIn(part.n);
    const plate = PLATES[part.plate];
    /* A part with no chapters yet is not drawn at all. An empty plate with no
       balloons on it would be a promise the course cannot keep, and the page
       has to be right both before and after those chapters land. */
    if (!lessons.length || !plate) return;

    const lede = el("div", "home__lede");
    /* One h1 for the page, the rest h2 — the part heading is a section of this
       document, not a second document. */
    const h = el(part.n === 1 ? "h1" : "h2", "t-display");
    h.textContent = `${part.title}, taken apart`;
    const p = el("p");
    p.textContent = part.lede;
    lede.append(h, p);

    root.append(lede, plateStage(part, lessons, plate.stations, plate.url));

    /* Each part's chapters sit directly beneath its own plate, so the drawing
       and the list of what it points at are one object. They were briefly a
       single table below both plates: the numbering ran 01–20 down one column,
       which read as one course, and cost the reader any association between a
       plate and the twelve rows it was actually about. The numbering still runs
       straight through — chapterNo() is course-level, not per-part — so the
       claim survives without buying it with the association.

       No part heading row, either: the display heading directly above already
       says which part this is, and saying it twice in two type sizes is chrome. */
    const table = el("table", "index");
    table.innerHTML =
      "<thead><tr><th>Item</th><th>Lesson</th><th>Remarks</th><th></th></tr></thead>";
    const tb = el("tbody");

    lessons.forEach((les) => {
      /* Partial progress is shown, not hidden. A chapter takes three specific
         things; "2 of 3" tells a reader there is something left and is worth
         coming back for, where a blank cell reads as "you did nothing". */
      const complete = chapterDone(les.id);
      const n = doneCount(les.id), of = stepsFor(les.id).length;
      const tr = el("tr", complete ? "done" : "");
      tr.innerHTML =
        `<td class="c-item">${String(chapterNo(les)).padStart(2, "0")}</td>` +
        `<td><a href="#${les.id}">${les.title}</a></td>` +
        `<td class="c-rem">${les.oneLiner}</td>` +
        `<td class="c-st">${complete ? "complete" : n ? `${n} of ${of}` : ""}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    root.append(table);
  });

  /* Back matter, the way a manual carries it: the parts table, then the index
     of everything worth remembering out of it, then the vocabulary you look
     words up in, then who it all came from. It belongs to the course, not to
     either part, so it sits below both. */
  /* One checkride strip per part that has one, because each is flown in a
     different aeroplane and scored separately — a single strip would have made
     the Part II ride reachable by typing its URL and no other way. Derived from
     PARTS rather than listed, so a third part would not need this line changed. */
  const rides = PARTS.filter((p) => lessonsIn(p.n).length).map((p) => checkrideStrip(p.n));
  root.append(catalogueStrip(), ...rides, glossaryStrip(), creditsStrip());
  document.title = COURSE;
}
