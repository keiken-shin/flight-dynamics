/* The checkride: the end of a part, flown rather than answered.
 *
 * Every item is a claim the course made that you now have to produce on demand.
 * The model judges every one, so there is nothing to argue with — and each ride
 * carries one item that cannot be reached at all by somebody who still holds
 * the misconception it was built on. Part I's is item two, "stall it above 60
 * knots", closed to anybody who still thinks a stall is caused by flying too
 * slowly; Part II's is item three, "twenty-five degrees a second", closed to
 * anybody who still thinks a faster aeroplane turns better. That is the point
 * of ending here instead of on another page of multiple choice.
 *
 * Two rides, one renderer. They differ in exactly three things — which items,
 * which chapters count as unread, and which score slot is written — so they are
 * a parameter rather than a second file, and Part I's route, items and scoring
 * are what they were.
 */

import { el, mark } from "./util.js";
import { chapterDone } from "./steps.js";
import { LESSONS, COURSE } from "../data/lessons.js";
import { CHECKRIDE, CHECKRIDE_II } from "../sim/tasks.js";

/* Per part, because one slot for two rides means passing five of five in Part
   II would quietly overwrite a seven of seven in Part I with a smaller number.
   Part I keeps the key it has always had, so nobody loses a score they earned
   before Part II existed. */
const RIDES = {
  /* `tab` is separate from `title` for one reason: Part I's tab has said
     "Checkride" since it shipped, and a reader's history and open tabs are
     allowed to keep saying it. */
  1: { items: CHECKRIDE, key: "fd.checkride", title: "The checkride", tab: "Checkride" },
  2: { items: CHECKRIDE_II, key: "fd.checkride2", title: "The second checkride", tab: "Checkride II" },
};

const best = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
/* Your best run, not your last — a second attempt that goes worse should not
   erase the first. Written on every pass, so leaving partway through still
   counts for what you actually flew. */
const bank = (key, n) => {
  try { if (n > best(key)) localStorage.setItem(key, String(n)); } catch {}
};

let teardown = null;

export function stopCheckride() { teardown?.(); teardown = null; }

const COUNT = ["no", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve"];

export function renderCheckride(root, part = 1) {
  const ride = RIDES[part] ?? RIDES[1];
  const { items, key } = ride;
  const chapters = LESSONS.filter((l) => (l.part ?? 1) === part);

  stopCheckride();
  root.innerHTML = "";
  document.title = `${ride.tab} · ${COURSE}`;

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = ride.title;
  const p = el("p", "cards__lede");
  p.textContent =
    `${COUNT[items.length] ?? items.length} items. Each one asks you to go and produce something the course claimed ` +
    "was true — not to recognise it in a list. The aircraft is judged by the same " +
    "model you have been flying all along, and every item starts fresh, so a bad " +
    "one costs you nothing but that item." +
    (part === 2 ? " All of it is flown in the fighter, and half of it against somebody." : "");
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");
  wrap.appendChild(body);
  root.appendChild(wrap);
  brief();

  function brief() {
    stopCheckride();
    body.innerHTML = "";

    /* This part's chapters, not the course's. Iterating all of LESSONS was
       right when there were twelve of them and one ride; with twenty it warns
       you about eight chapters this ride does not test, which is both wrong and
       the kind of wrong that makes a reader distrust the rest of the page. And
       the count is counted rather than spelled, because "the twelve chapters"
       stopped being true the moment there were twenty. */
    const unread = chapters.filter((l) => !chapterDone(l.id)).length;
    if (unread) {
      const warn = el("p", "cards__note",
        `${unread} of this part's ${chapters.length} chapters are not complete yet. Nothing stops you ` +
        `flying it now, but every item below is drawn from one of them.`);
      body.appendChild(warn);
    }

    const list = el("table", "index exam__list");
    list.innerHTML = "<thead><tr><th>Item</th><th>Task</th><th>From</th></tr></thead>";
    const tb = el("tbody");
    items.forEach((t, i) => {
      const tr = el("tr");
      tr.innerHTML =
        `<td class="c-item">${String(i + 1).padStart(2, "0")}</td>` +
        `<td>${t.name}</td>` +
        `<td class="c-rem">Chapter ${String(t.ch).padStart(2, "0")} · ${LESSONS[t.ch - 1].title}</td>`;
      tb.appendChild(tr);
    });
    list.appendChild(tb);
    body.appendChild(list);

    const go = el("button", "cards__go", `<span>Begin the checkride</span>${mark()}`);
    go.type = "button";
    go.style.marginTop = "26px";
    go.onclick = fly;
    body.appendChild(go);
  }

  async function fly() {
    body.innerHTML = "";
    const loading = el("p", "cards__note", "Starting the aircraft…");
    body.appendChild(loading);

    const { mountSandbox } = await import("../sim/sandbox.js");
    loading.remove();

    const host = el("div", "sandbox sandbox--exam");
    body.appendChild(host);
    const stop = mountSandbox(host, () => { stop(); brief(); }, null, items, (passed, finished) => {
      bank(key, passed.length);       // every pass, not just a finished ride
      if (!finished) return;
      stop();
      report(passed);
    });
    teardown = stop;
  }

  function report(passed) {
    body.innerHTML = "";
    const d = el("div", "card card--done");
    d.innerHTML =
      `<div class="card__cap"><span>Result</span><span>${passed.length} of ${items.length}</span></div>` +
      `<div class="card__q">Checkride complete.</div>` +
      `<div class="card__a">${part === 2
        ? `You stopped a range with the throttle, held a rear quarter against somebody who did not ` +
          `want you there, found the one speed where the nose comes round fastest, made the energy ` +
          `fall at full afterburner, and cranked away twelve seconds of a merge. None of that was a ` +
          `multiple choice question.`
        : `You stalled a wing at speed, found the bottom of the drag curve, let the ` +
          `aircraft right itself twice without touching it, damped a Dutch roll, held forty-five degrees ` +
          `of bank at 1.4 g, and closed a control loop. None of that was a multiple choice question.`}</div>`;
    body.appendChild(d);
    const again = el("button", "cards__go2", `<span>Fly it again</span>${mark()}`);
    again.type = "button";
    again.onclick = brief;
    const home = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`);
    home.href = "#";
    const row = el("div", "cards__acts");
    row.append(home, again);
    body.appendChild(row);
  }
}

/* The way in, at the foot of the index — after a part's chapters, where the end
   of one belongs. Takes the part so the index can carry both; the default is
   Part I, which is what home.js has always asked for. */
export function checkrideStrip(part = 1) {
  const ride = RIDES[part] ?? RIDES[1];
  /* One slot, one meaning. This used to fall back to the chapters-read count
     whenever no score was stored, so a reader who had just passed an item and
     quit read "0 of 12 chapters" as their checkride result. A score slot now
     only ever holds a score, and says plainly when there isn't one. */
  const n = best(ride.key);
  const a = el("a", "catalogue catalogue--exam",
    `<span class="catalogue__t">${ride.title}</span>` +
    `<span class="catalogue__n">${ride.items.length} items, flown · ` +
    (n ? `best ${n} of ${ride.items.length}` : "not yet flown") + `</span>` +
    mark());
  a.href = part === 2 ? "#checkride-2" : "#checkride";
  return a;
}
