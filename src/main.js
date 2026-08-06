import "./styles/app.css";
import { LESSONS } from "./data/lessons.js";
import { renderHome } from "./ui/home.js";
import { renderLesson } from "./ui/lesson.js";
import { renderCards } from "./ui/cards.js";
import { renderCheckride, stopCheckride } from "./ui/checkride.js";
import { renderCredits } from "./ui/credits.js";
import { el, applyPlate, currentPlate, cyclePlate } from "./ui/util.js";

const app = document.getElementById("app");

/* The zone grid: letters down the sides, numbers across. Generated, because a
   hand-placed index is the kind of thing that rots the first time the layout
   changes. */
function zoneRails() {
  const cols = "1 2 3 4 5 6 7 8 9 10 11 12".split(" ");
  const rows = "A B C D E F G H".split(" ");
  const make = (cls, items) => {
    const z = el("div", `zone ${cls}`);
    items.forEach((t) => z.appendChild(el("i", "", t)));
    return z;
  };
  document.body.append(
    make("zone--top", cols), make("zone--bottom", cols),
    make("zone--left", rows), make("zone--right", rows),
  );
}

function header() {
  const bar = el("header", "bar");
  const home = el("a", "bar__title", "Flight Dynamics");
  home.href = "#";
  const meta = el("span", "bar__meta");
  const spacer = el("span", "bar__spacer");
  /* An explicit way out of a chapter. The wordmark has always linked home, but
     a wordmark reads as a title rather than a control, so mid-lesson there was
     no visible way back to the index. */
  const index = el("a", "bar__ix", "Index");
  index.href = "#";
  /* Labelled light / dark / auto, not positive / negative. The plate metaphor is
     right for the design system and wrong for a control: nobody can tell which
     way round it goes without pressing it, and it reads as inverted about half
     the time. The internal names stay positive/negative. */
  const plate = el("button", "", "");
  plate.type = "button";
  plate.title = "Light plate, negative plate, or follow the system";
  const setLabel = (m) => {
    plate.textContent = m === "auto" ? "plate: auto" : m === "positive" ? "plate: light" : "plate: dark";
  };
  setLabel(currentPlate());
  plate.onclick = () => setLabel(cyclePlate());
  bar.append(home, spacer, meta, index, plate);
  return { bar, meta, index };
}

function route({ meta, index }) {
  const id = location.hash.replace(/^#/, "");
  const i = LESSONS.findIndex((l) => l.id === id);
  index.hidden = id === "";           // nothing to go back to from the index itself
  stopCheckride();                    // never leave a checkride running offscreen
  if (id === "cards") {
    meta.textContent = "Revision";
    renderCards(app);
  } else if (id === "checkride") {
    meta.textContent = "Final test";
    renderCheckride(app);
  } else if (id === "credits") {
    meta.textContent = "Sources";
    renderCredits(app);
  } else if (i === -1) {
    meta.textContent = `${LESSONS.length} chapters`;
    renderHome(app);
  } else {
    meta.textContent = `Chapter ${String(i + 1).padStart(2, "0")} of ${LESSONS.length}`;
    renderLesson(app, id);
  }
}

applyPlate(currentPlate());
zoneRails();
const h = header();
document.querySelector(".plate-frame").prepend(h.bar);
addEventListener("hashchange", () => route(h));
route(h);
