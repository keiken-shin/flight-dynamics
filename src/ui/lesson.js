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

  /* ── the bench: one figure at a time, swapped by what you are reading.
     Only on wide screens — a narrow one gets a plate per reference instead. ── */

  const figIds = les.flow.filter((b) => b.t === "fig").map((b) => b.id);
  let activeFig = null;
  let cur = null;      // the bench's controller, on wide screens
  let pinned = false;  // a manual tab click holds until the figure changes

  /* One figure, its step strip, and the controls over both. The bench uses one
     of these; on a narrow screen every figure reference gets its own, because a
     single bench above the reading has scrolled 300px out of sight by the time
     you reach the paragraph that refers to it. */
  function mountFigure(host, figId, plateName) {
    host.innerHTML = `<div class="fig-host">${DIAGRAMS[figId]()}</div><div class="sheets"></div>`;
    const svg = host.querySelector("svg");
    const strip = host.querySelector(".sheets");
    const total = svg.querySelectorAll('g[class^="s"]').length;
    const label = el("span", "sheets__lab", "");
    strip.appendChild(label);
    const btns = [];
    /* The strip has to SAY it is steppable. Driving the build off scroll instead
       looked clever and failed on the content: a chapter is ~330 words, so a
       section passes in a couple of flicks and four steps blur past with no
       chance to read any of them. Clicking is the reader's own clock. */
    const c = { svg, total, label, btns, plate: plateName, at: 0, pinned: false };
    if (total > 1) {
      for (let n = 1; n <= total; n++) {
        const b = el("button", "", String(n));
        b.type = "button";
        b.setAttribute("aria-label", `${plateName}, step ${n} of ${total}`);
        b.onclick = () => { c.pinned = true; pinned = true; setStepOn(c, n); };
        btns.push(b);
        strip.appendChild(b);
      }
    }
    if (total > 1) strip.appendChild(el("span", "sheets__hint", `tap 1 to build it up`));
    /* Opens COMPLETE. The prose right after a figure reference describes the
       finished drawing, so the finished drawing is what has to be there; the
       tabs replay how it got that way. */
    setStepOn(c, total);
    return c;
  }

  function setStepOn(c, n) {
    const v = Math.max(1, Math.min(c.total, n));
    if (v === c.at) return;
    c.at = v;
    c.svg.setAttribute("data-state", String(v));
    c.label.textContent = `${c.plate} · Step ${v} of ${c.total}`;
    c.btns.forEach((x, j) => {
      const n1 = j + 1;
      x.setAttribute("aria-pressed", n1 === v ? "true" : "false");
      x.dataset.at = n1 < v ? "done" : n1 === v ? "now" : "todo";
    });
  }

  /* Setting the step is separate from swapping the figure, because reading
     scroll drives the first and the figure references drive the second.

     "Step", not "sheet". In a real parts catalogue Sheet 2 of 4 is a different
     page carrying different content; these are one drawing at successive stages
     of its own assembly, each keeping everything before it and adding one thing.
     The word promised pagination and delivered a build, and readers reasonably
     concluded they were missing three other figures. */
  const setStep = (n) => cur && setStepOn(cur, n);

  /* The strip names the PLATE, not just the step. Seven of the twelve lessons
     give every figure the same step count, so a strip that only ever read
     "Step 4 of 4" looked frozen while scrolling swapped the drawing beneath it.
     The plate number is also what ties a figure back to its "Fig. 2–1"
     reference in the reading. */
  const plateName = (figId) => `Fig. ${i + 1}–${figIds.indexOf(figId) + 1}`;

  function showFigure(figId) {
    if (figId === activeFig || !DIAGRAMS[figId]) return;
    activeFig = figId;
    pinned = false;
    cur = mountFigure(bench, figId, plateName(figId));
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
  let target = col;          // flow blocks land here until a figure opens a section
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

      /* On a wide screen a figure in the text is a REFERENCE and the plate lives
         on the bench beside it. On a narrow one there is no beside, so the plate
         is rendered here — see the section wrapper below. */
      case "fig": {
        figSeen++;
        node = el("div", "figref");
        node.dataset.fig = b.id;
        node.innerHTML =
          `<div class="figref__line">` +
            `<span class="t-label">Fig. ${i + 1}–${figSeen}</span>` +
            `<span class="figref__rule"></span>` +
            `<span class="figref__hint">shown on the bench ${mark()}</span>` +
          `</div>`;
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
    /* A figure opens a SECTION that runs until the next figure. It exists so the
       inline plate has something to stick inside: `position: sticky` is bounded
       by its parent, and a plate whose parent is only as tall as itself has no
       range at all — it read as sticky and behaved as static, sliding straight
       off the top. The section is that range, and it ends exactly where the
       figure stops being what you are reading about. */
    if (b.t === "fig") {
      target = el("div", "fig-section");
      target.dataset.fig = b.id;
      col.appendChild(target);
      target.appendChild(node);
      target.appendChild(el("div", "figref__plate"));
      return;
    }
    if (node) target.appendChild(node);
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

  /* ── after the chapter ──────────────────────────────────────────────────
     The apply surface and the footer nav sit OUTSIDE the two-column grid, as
     plain blocks beneath it. That placement is the whole fix.

     Inside the grid they were a third row under a sticky element, and a sticky
     element overhangs the row after it rather than stopping at it — so the
     launch control was drawn straight across the figure's caption. Painting it
     over the bench made the collision opaque instead of removing it. Out here
     the grid has ended, the bench has nowhere left to reach, and both can have
     the full width honestly.

     Order matters too: read the chapter, fly it, then leave. The footer nav used
     to sit above the sandbox inside the reading column, which put "next chapter"
     before the thing the chapter was building toward. */
  const apply = el("div", "apply");
  const after = el("div", "after");
  after.append(apply, foot);
  wrap.append(head, col, benchWrap);
  root.append(wrap, after);

  showFigure(figIds[0]);

  if (hasTask(les.id)) {
    const launch = el("button", "launch", `<span>Fly it yourself</span>${mark()}`);
    launch.type = "button";
    launch.onclick = async () => {
      launch.disabled = true;
      launch.firstChild.textContent = "Loading…";
      // Dynamic import: Three.js is fetched here and nowhere else.
      const { mountSandbox } = await import("../sim/sandbox.js");
      launch.disabled = false;
      launch.firstChild.textContent = "Fly it yourself";

      /* The same <dialog> takeover the clip gets, for the same reason: flying is
         a different mode from reading. Grown in place it pushed the footer a
         screen down and left the reader scrolling between a sim and a chapter
         that were both live; here the page behind goes inert, Escape works
         without us, and closing puts the reader back exactly where they were.
         Modal also gets the sim off the half-width column it was inheriting —
         it wants the widest box on the screen, and the reading column is the
         narrowest thing on the page. */
      const dlg = el("dialog", "vp vp--sim");
      dlg.setAttribute("aria-label", `Sandbox: ${les.title}`);
      dlg.innerHTML =
        `<div class="vp__bar">` +
          `<span class="vp__ch">Fly it yourself</span>` +
          `<span class="vp__dur">${les.title}</span>` +
          `<button class="vp__x" type="button" aria-label="Close sandbox">` +
            `<span>Close</span>` +
            `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11"/></svg>` +
          `</button>` +
        `</div>`;
      const host = el("div", "sandbox");
      dlg.appendChild(host);
      document.body.appendChild(dlg);
      document.documentElement.style.overflow = "hidden";
      /* Shown before mounting: a closed dialog is display:none, so the canvas
         would size itself against a zero-width host and start out wrong. */
      dlg.showModal();

      let stop = null, shut = false;
      const close = () => {
        if (shut) return;          // dlg.close() re-enters this through "close"
        shut = true;
        stop?.();
        dlg.close();
        dlg.remove();
        document.documentElement.style.overflow = "";
        launch.focus();
      };
      dlg.querySelector(".vp__x").onclick = close;
      dlg.addEventListener("close", close);            // Escape
      /* No backdrop-click close, unlike the clip. The sim is dragged, not
         watched, and a slider drag that ends outside the plate would dismiss a
         flight in progress. Escape, Close, and the HUD's own exit are enough. */
      stop = mountSandbox(host, close, les.id);

      const prev = teardown;
      teardown = () => { close(); prev?.(); };
    };
    apply.appendChild(launch);
  }

  /* Scroll's only remaining job is deciding WHICH figure the bench holds on a
     wide screen. Stepping belongs to the reader.

     Driving the build off scroll read well as an idea and failed on the content.
     A chapter is about 330 words, so a figure's own section passes in a couple
     of flicks and four steps blur past unread. The strip opens complete, says
     what it is, and waits to be tapped. */
  const sections = [...col.querySelectorAll(".fig-section")];
  if (sections.length) {
    const NARROW = matchMedia("(max-width: 1020px)");

    /* Narrow screens have no bench, so every section carries its own plate.
       Mounted on first narrow use, not up front: on a wide screen these are
       display:none, and rendering SVGs nobody will see is work for nothing. */
    const inline = [];
    const mountInline = () => {
      if (inline.length) return;
      sections.forEach((s) => inline.push(
        mountFigure(s.querySelector(".figref__plate"), s.dataset.fig, plateName(s.dataset.fig))));
    };

    const track = () => {
      if (NARROW.matches) return mountInline();
      const line = scrollY + innerHeight * 0.34;
      const tops = sections.map((s) => s.getBoundingClientRect().top + scrollY);
      let k = 0;
      for (let n = 0; n < tops.length; n++) if (tops[n] <= line) k = n;
      showFigure(sections[k].dataset.fig);
    };
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
