/* The checkride: the end of the course, flown rather than answered.
 *
 * Seven items, each one a claim the course made that you now have to produce on
 * demand. The model judges every one, so there is nothing to argue with — and
 * item two ("stall it above 60 knots") cannot be reached at all by somebody who
 * still believes a stall is caused by flying too slowly. That is the point of
 * ending here instead of on another page of multiple choice.
 */

import { el, mark, progress } from "./util.js";
import { LESSONS } from "../data/lessons.js";
import { CHECKRIDE } from "../sim/tasks.js";

let teardown = null;

export function stopCheckride() { teardown?.(); teardown = null; }

export function renderCheckride(root) {
  stopCheckride();
  root.innerHTML = "";
  document.title = "Checkride · Flight Dynamics";

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "The checkride";
  const p = el("p", "cards__lede");
  p.textContent =
    "Seven items. Each one asks you to go and produce something the course claimed " +
    "was true — not to recognise it in a list. The aircraft is judged by the same " +
    "model you have been flying all along, and every item starts fresh, so a bad " +
    "one costs you nothing but that item.";
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");
  wrap.appendChild(body);
  root.appendChild(wrap);
  brief();

  function brief() {
    stopCheckride();
    body.innerHTML = "";

    const done = progress();
    const unread = LESSONS.filter((l) => !done[l.id]).length;
    if (unread) {
      const warn = el("p", "cards__note",
        `${unread} of the twelve chapters are still unread. Nothing stops you flying it now, ` +
        `but every item below is drawn from one of them.`);
      body.appendChild(warn);
    }

    const list = el("table", "index exam__list");
    list.innerHTML = "<thead><tr><th>Item</th><th>Task</th><th>From</th></tr></thead>";
    const tb = el("tbody");
    CHECKRIDE.forEach((t, i) => {
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
    const stop = mountSandbox(host, () => { stop(); brief(); }, null, CHECKRIDE, (passed) => {
      stop();
      report(passed);
    });
    teardown = stop;
  }

  function report(passed) {
    body.innerHTML = "";
    try { localStorage.setItem("fd.checkride", String(passed.length)); } catch {}
    const d = el("div", "card card--done");
    d.innerHTML =
      `<div class="card__cap"><span>Result</span><span>${passed.length} of ${CHECKRIDE.length}</span></div>` +
      `<div class="card__q">Checkride complete.</div>` +
      `<div class="card__a">You stalled a wing at speed, found the bottom of the drag curve, let the ` +
      `aircraft right itself twice without touching it, damped a Dutch roll, held forty-five degrees ` +
      `of bank at 1.4 g, and closed a control loop. None of that was a multiple choice question.</div>`;
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

/* The way in, at the foot of the index — after the twelve chapters, where the
   end of a course belongs. */
export function checkrideStrip() {
  let best = 0;
  try { best = Number(localStorage.getItem("fd.checkride")) || 0; } catch {}
  const done = progress();
  const read = LESSONS.filter((l) => done[l.id]).length;
  const a = el("a", "catalogue catalogue--exam",
    `<span class="catalogue__t">The checkride</span>` +
    `<span class="catalogue__n">${CHECKRIDE.length} items, flown · ` +
    (best ? `best ${best} of ${CHECKRIDE.length}` : `${read} of 12 chapters read`) + `</span>` +
    mark());
  a.href = "#checkride";
  return a;
}
