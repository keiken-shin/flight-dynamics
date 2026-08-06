import { LESSONS } from "../data/lessons.js";
import { VIDEOS } from "../data/videos.js";
import DIAGRAMS from "../data/diagrams.js";
import { el, markDone, mark } from "./util.js";
import { openPlayer, closePlayer } from "./player.js";

/* `tasks.js` is pure data with no Three.js in it, so asking whether a chapter
   has a sandbox costs nothing — the 3D engine still arrives only when somebody
   presses the button. */
import { hasTask } from "../sim/tasks.js";

/* Drawn, like every other mark here. A tick and a cross as stroked paths hold
   their contrast against paper in either plate, where a coloured letter on a
   coloured fill would fail it in one of them. */
const TICK = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M1 7 L5.5 11.5 L14 1.5"/></svg>`;
const CROSS = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M2.5 1.5 L12.5 11.5 M12.5 1.5 L2.5 11.5"/></svg>`;

let teardown = null;

export function renderLesson(root, id) {
  teardown?.();
  teardown = null;
  // Navigating away while a clip is open must not leave it playing offscreen.
  closePlayer();

  const i = LESSONS.findIndex((l) => l.id === id);
  const les = LESSONS[i];
  root.innerHTML = "";

  const wrap = el("div", "lesson");
  const col = el("div", "col");
  const benchWrap = el("div", "bench-wrap");
  const bench = el("div", "bench");
  benchWrap.appendChild(bench);

  /* ── the bench: one figure at a time, swapped by what you are reading ── */
  const figHost = el("div", "bench__fig");
  const sheets = el("div", "sheets");
  bench.append(figHost, sheets);

  const figIds = les.flow.filter((b) => b.t === "fig").map((b) => b.id);
  let activeFig = null;
  let cur = null;      // { svg, total, label, btns, plate }
  let pinned = false;  // a manual tab click holds until the figure changes

  /* Setting the step is separate from swapping the figure, because reading
     scroll drives the first and the figure references drive the second.

     "Step", not "sheet". In a real parts catalogue Sheet 2 of 4 is a different
     page carrying different content; these are one drawing at successive stages
     of its own assembly, each keeping everything before it and adding one thing.
     The word promised pagination and delivered a build, and readers reasonably
     concluded they were missing three other figures. */
  function setStep(n) {
    if (!cur) return;
    const v = Math.max(1, Math.min(cur.total, n));
    if (v === cur.at) return;
    cur.at = v;
    cur.svg.setAttribute("data-state", String(v));
    cur.label.textContent = `${cur.plate} · Step ${v} of ${cur.total}`;
    // Passed / current / ahead, so the strip reads as a build rather than as
    // four interchangeable pages.
    cur.btns.forEach((x, j) => {
      const n1 = j + 1;
      x.setAttribute("aria-pressed", n1 === v ? "true" : "false");
      x.dataset.at = n1 < v ? "done" : n1 === v ? "now" : "todo";
    });
  }

  function showFigure(figId) {
    if (figId === activeFig || !DIAGRAMS[figId]) return;
    activeFig = figId;
    pinned = false;
    figHost.innerHTML = DIAGRAMS[figId]();
    const svg = figHost.querySelector("svg");
    const total = svg.querySelectorAll('g[class^="s"]').length;

    /* The strip names the PLATE, not just the step. Seven of the twelve lessons
       give every figure the same step count, so a strip that only ever read
       "Step 4 of 4" looked frozen while scrolling swapped the drawing beneath
       it. The plate number is also what ties the bench back to the "Fig. 2–1"
       reference in the reading. */
    const plate = `Fig. ${i + 1}–${figIds.indexOf(figId) + 1}`;
    sheets.innerHTML = "";
    const label = el("span", "sheets__lab", "");
    sheets.appendChild(label);
    const btns = [];
    if (total > 1) {
      for (let n = 1; n <= total; n++) {
        const b = el("button", "", String(n));
        b.type = "button";
        b.setAttribute("aria-label", `${plate}, step ${n} of ${total}`);
        b.onclick = () => { pinned = true; setStep(n); };
        btns.push(b);
        sheets.appendChild(b);
      }
    }
    /* Open on step 1 — the drawing has not been explained yet, so it has not
       been drawn yet. `track` builds it from here. */
    cur = { svg, total, label, btns, plate, at: 0 };
    setStep(1);
  }

  /* ── title block ──
     Its own element, not the first two children of the reading column, so that
     on a phone the bench can sit between the title and the reading. Inside the
     column the bench could only go above everything, and the first viewport
     then named no lesson. */
  const head = el("div", "lesson__head");
  const title = el("h1", "t-display lesson__title");
  title.textContent = les.title;
  const sub = el("p", "lesson__sub");
  sub.textContent = les.oneLiner;
  head.append(title, sub);

  let figSeen = 0;
  les.flow.forEach((b) => {
    let node = null;
    switch (b.t) {
      case "p": node = el("p", "", b.text); break;
      case "concrete": node = el("p", "concrete", b.text); break;
      case "aside": node = el("p", "aside", b.text); break;

      /* No kicker label above the claim — the craft floor bans it outright. The
         flag is carried by a drawn revision triangle, which is this world's own
         mark for "this has been changed / do not trust the previous issue". */
      case "myth":
        node = el("div", "myth");
        node.innerHTML =
          `<div class="myth__b"><p class="myth__claim">` +
          `<svg class="revmark" viewBox="0 0 14 12" aria-hidden="true"><path d="M7 0 L14 12 L0 12 Z"/></svg>` +
          `<span>“${b.claim}”</span></p>` +
          `<p class="myth__truth">${b.truth}</p></div>`;
        break;

      /* A figure in the text is a REFERENCE, not the figure — the plate itself
         lives on the bench and stays on screen. This is the mechanic that makes
         the lesson feel like working at a bench rather than reading a page. */
      case "fig": {
        figSeen++;
        node = el("div", "figref");
        node.dataset.fig = b.id;
        node.innerHTML =
          `<span class="t-label">Fig. ${i + 1}–${figSeen}</span>` +
          `<span class="figref__rule"></span>` +
          `<span class="figref__hint">shown on the bench ${mark()}</span>`;
        break;
      }

      case "formula":
        node = el("div", "formula plate");
        node.innerHTML =
          `<div class="formula__eq" role="math" aria-label="${b.plain}">${b.html}</div>` +
          (b.terms?.length
            ? `<dl>${b.terms.map(([s, m]) => `<dt>${s}</dt><dd>${m}</dd>`).join("")}</dl>`
            : "");
        break;

      /* Videos play HERE, not on youtube.com. Sending a reader to the sidebar
         is how you lose them; the clip is part of the lesson, so it opens on a
         plate like everything else. Each card is a button, and nothing is
         requested from Google until one is pressed. */
      case "videos": {
        const list = VIDEOS[les.id] || [];
        if (!list.length) break;
        node = el("div", "vids");
        node.appendChild(el("h2", "t-h2", "Watch"));
        list.forEach((v) => {
          const b = el("button", "vid");
          b.type = "button";
          b.innerHTML =
            `<span class="vid__play" aria-hidden="true"><svg viewBox="0 0 12 14"><path d="M1 1 L11 7 L1 13 Z"/></svg></span>` +
            `<span class="vid__t"><b>${v.title}</b>` +
            `<span class="m">${v.channel} · ${v.duration}</span>` +
            (v.note ? `<span class="n">${v.note}</span>` : "") + `</span>`;
          b.onclick = () => openPlayer(v, list);
          node.appendChild(b);
        });
        break;
      }

      /* An answer key: keyed rows, and a drawn mark for the result.
         The strip on top is a plate caption, not a kicker — it carries an
         identifier and a reference number, the way a manual heads an inspection
         block. "Checkride" is the ride an examiner sits in on; it names the
         thing rather than describing it, which is the difference. */
      case "check": {
        node = el("div", "check");
        /* "Stage check" is the periodic progress test during training; the
           checkride is the final practical test with an examiner. Reserving the
           second word for the finale is both correct and worth the anticipation. */
        node.appendChild(el("div", "check__cap",
          `<span>Stage Check</span><span>Ch ${String(i + 1).padStart(2, "0")} · ${b.options.length} options</span>`));
        node.appendChild(el("p", "check__q", b.q));   // the question is the heading
        const why = el("p", "check__why", `<strong>Why:</strong> ${b.why}`);
        why.hidden = true;
        const btns = [];
        b.options.forEach((opt, oi) => {
          const btn = el("button", "",
            `<span class="check__k" aria-hidden="true">${String.fromCharCode(65 + oi)}</span>` +
            `<span class="check__o">${opt}</span>`);
          btn.type = "button";
          btn.onclick = () => {
            btns.forEach((x, j) => {
              x.disabled = true;
              const key = x.querySelector(".check__k");
              if (j === b.answer) { x.classList.add("right"); key.innerHTML = TICK; }
              else if (j === oi) { x.classList.add("wrong"); key.innerHTML = CROSS; }
            });
            why.hidden = false;
            markDone(les.id);
          };
          btns.push(btn);
          node.appendChild(btn);
        });
        node.appendChild(why);
        break;
      }
    }
    if (node) col.appendChild(node);
  });

  // footer
  const foot = el("div", "foot");
  foot.appendChild(i > 0
    ? Object.assign(el("a", "", `${mark("left")}<span>${LESSONS[i - 1].title}</span>`), { href: "#" + LESSONS[i - 1].id })
    : Object.assign(el("a", "", `${mark("left")}<span>Index</span>`), { href: "#" }));
  // The middle of the footer was an empty spacer. It is the natural place to
  // leave the chapter, so it carries the way back to the index.
  const toIndex = Object.assign(el("a", "foot__ix", "<span>All 12 chapters</span>"), { href: "#" });
  foot.appendChild(toIndex);
  if (i < LESSONS.length - 1)
    foot.appendChild(Object.assign(el("a", "", `<span>${LESSONS[i + 1].title}</span>${mark()}`),
      { href: "#" + LESSONS[i + 1].id }));
  col.appendChild(foot);

  wrap.append(head, col, benchWrap);
  root.appendChild(wrap);

  showFigure(figIds[0]);

  /* ── the sandbox: apply what you just read ── */
  if (hasTask(les.id)) {
    const launch = el("button", "launch", `<span>Fly it yourself</span>${mark()}`);
    launch.type = "button";
    launch.onclick = async () => {
      launch.disabled = true;
      launch.firstChild.textContent = "Loading…";
      // Dynamic import: Three.js is fetched here and nowhere else.
      const { mountSandbox } = await import("../sim/sandbox.js");
      launch.remove();
      launch.disabled = false;
      launch.firstChild.textContent = "Fly it yourself";
      // The sandbox REPLACES the plate on the bench rather than stacking under
      // it — two aircraft on one bench is twice the height and half the point.
      figHost.hidden = true;
      sheets.hidden = true;
      const host = el("div", "sandbox");
      bench.appendChild(host);
      const stop = mountSandbox(host, () => {
        // Returning to the plate restores the reading bench.
        stop();
        host.remove();
        figHost.hidden = false;
        sheets.hidden = false;
        bench.appendChild(launch);
      }, les.id);
      const prev = teardown;
      teardown = () => { stop(); prev?.(); };
      host.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    bench.appendChild(launch);
  }

  /* The bench follows the reading, and the plate BUILDS as you read it.
     An IntersectionObserver could say which figure is current but not how far
     through its own approach it is, so the step never advanced and the strip sat
     on the last tab forever. Reading position gives both: which figure, and how
     close you are to reaching it. The drawing assembles in step with the
     paragraphs that explain it — which is what the progressive states and their
     per-step captions were built for. */
  const refs = [...col.querySelectorAll(".figref")];
  if (refs.length) {
    /* A figure assembles on the APPROACH to its own reference, and is finished
       by the time the reference reaches the reading line.

       Building it *after* the reference — the obvious reading of "the plate
       builds as you read" — was wrong twice over. It made the bench show the
       finished drawing on arrival and then rewind to a bare outline once you
       scrolled, so the step numbers appeared to run backwards; and it put step 1
       beside the paragraph that describes all four arrows, because that
       paragraph immediately follows the reference.

       Assembling on approach fixes both. Scrolling down only ever moves a build
       forward, and the prose that describes a finished figure is read in front
       of a finished figure. */
    const BASE = () => Math.max(320, innerHeight * 0.72);
    const track = () => {
      const line = scrollY + innerHeight * 0.28;    // the reading line
      const tops = refs.map((r) => r.getBoundingClientRect().top + scrollY);

      /* Each figure's approach is capped to the room it actually has. A fixed
         reach is longer than the gap between two references in a tight chapter,
         and the next figure then starts building ABOVE the current one's own
         reference — stealing the bench before its prose has been read. Here the
         references sit 492px apart against a 518px reach, so Fig 1-2 took over
         26px before you reached Fig 1-1. */
      const reach = (n) => (n === 0
        ? BASE()
        : Math.max(160, Math.min(BASE(), (tops[n] - tops[n - 1]) * 0.55)));

      // Active figure: the furthest-along one that has begun approaching.
      let k = -1, prog = 0;
      for (let n = 0; n < tops.length; n++) {
        const r = reach(n);
        const p = (line - (tops[n] - r)) / r;
        if (p > 0) { k = n; prog = Math.min(1, p); }
      }
      if (k === -1) { showFigure(refs[0].dataset.fig); if (!pinned) setStep(1); return; }

      showFigure(refs[k].dataset.fig);
      if (pinned || !cur) return;
      setStep(1 + Math.floor(prog * (cur.total - 0.001)));
    };
    // Called directly rather than rAF-throttled: three rects and an early-out on
    // an unchanged sheet is cheaper than the bookkeeping to defer it.
    addEventListener("scroll", track, { passive: true });
    addEventListener("resize", track, { passive: true });
    track();
    const prev = teardown;
    teardown = () => {
      removeEventListener("scroll", track);
      removeEventListener("resize", track);
      prev?.();
    };
  }

  document.title = `${les.title} · Flight Dynamics`;
  window.scrollTo(0, 0);
}
