/* The vocabulary — a lookup, not a lesson.
 *
 * This is back matter: an appendix you come to when a word turns up, not a
 * chapter you work through. It is not numbered, it is not in the progression,
 * and the deck never sees it — deck.js derives every card from LESSONS alone,
 * so nothing here can leak into revision by existing.
 *
 * It exists because Part II teaches doctrine rather than physics. A published
 * brevity code, one service's training language, a word that was current in
 * 1972, and something a simulator community agreed on all look identical once
 * they are typed on a page, and readers repeat what they read. So every row
 * says how much weight its word carries, in the same achromatic grammar the
 * term card in a chapter uses — a stamped badge, a boxed one, a hairline one,
 * and a dashed one that was never issued. Deliberately the same grammar: a word
 * may not change rank between the chapter that taught it and the appendix that
 * lists it, and a second ladder would be a second opinion.
 *
 * A row also opens. The table is a scan; the plate behind a row is the whole
 * entry — the badge and the publication, the confusion line, the authored figure
 * where one exists, and a way into the chapter that teaches it. That last is
 * derived from LESSONS rather than written down here, for the reason given at
 * chapterFor. Ctrl+K, or a bare slash, puts the cursor in the search box.
 */

import TAX from "../../content/taxonomy.json";
import { COURSE, LESSONS } from "../data/lessons.js";
import DIAGRAMS from "../data/diagrams.js";
import { el, mark } from "./util.js";

/* The four rungs, spelled exactly as lesson.js spells them, most authoritative
   first. This object's order IS the ladder: the key prints in it, the filter
   offers standings in it, and nothing else decides rank anywhere on the page. */
const STATUS = {
  "multi-service": "multi-service standard",
  service: "service training",
  historical: "historical",
  sim: "simulator usage",
};
const RANK = Object.keys(STATUS);

/* ── which chapter teaches a word ─────────────────────────────────────────
   Derived, never mapped. A hand-kept table of term → chapter would be wrong the
   first time a chapter was renamed or moved and nobody would notice, which is
   the same reason deck.js derives its cards and the cross-reference block reads
   its title out of LESSONS instead of repeating it.

   Two passes, in order of how much they prove. A `term` block naming the word is
   the chapter TEACHING it and settles the question. Failing that, prose that
   uses the word is worth something — but only for a word that could not be
   anything else, because half this vocabulary is ordinary English. "Range" as a
   picture label is not what chapter 13 means when it writes the word, and a
   pointer to the wrong sense of a word is worse than no pointer at all. So the
   fallback trusts a match only on a multi-word term or on a brevity call written
   in the capitals brevity is written in. A term the course never uses simply
   gets no link. */
const SKIP = new Set(["t", "id", "status", "src", "html"]);
const PROSE = LESSONS.map((l) => [
  l.title, l.oneLiner,
  ...l.flow.flatMap((b) => Object.entries(b)
    .filter(([k, v]) => typeof v === "string" && !SKIP.has(k)).map(([, v]) => v)),
].join(" "));

const unmistakable = (w) => /\s|-/.test(w) || w === w.toUpperCase();
const wholeWord = (w) =>
  new RegExp(`(^|[^A-Za-z0-9-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9-])`);

function chapterFor(t) {
  const names = [t.term, ...(t.alsoKnownAs || [])].map((w) => w.toLowerCase());
  let i = LESSONS.findIndex((l) => l.flow.some(
    (b) => b.t === "term" && names.includes(b.word.toLowerCase())));
  if (i >= 0) return { i, les: LESSONS[i], why: "Where the course teaches it." };
  if (!unmistakable(t.term)) return null;
  i = PROSE.findIndex((p) => wholeWord(t.term).test(p));
  return i >= 0 ? { i, les: LESSONS[i], why: "Where the course uses it." } : null;
}

export function renderGlossary(root) {
  root.innerHTML = "";
  document.title = `Vocabulary · ${COURSE}`;

  /* The same admission rule as the term block in a chapter. A row that cannot
     say where it stands, or that claims a standard without naming the
     publication and edition, is dropped LOUDLY — an unlabelled word in a
     reference is worse than a missing one, because it gets quoted.
     Every number on this page is then counted off what survived this, never off
     the file, so the page can never overstate what it is actually showing. */
  const terms = TAX.terms.filter((t) => {
    if (!STATUS[t.status]) {
      console.error("taxonomy row without a valid status:", t);
      return false;
    }
    if (!t.src && (t.status === "multi-service" || t.status === "service")) {
      console.error("taxonomy row claims standing but names no publication:", t);
      return false;
    }
    return true;
  });
  const tally = (s) => terms.filter((t) => t.status === s).length;
  const groupsIn = TAX.categories.filter((c) => terms.some((t) => t.category === c.id));

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "The vocabulary";
  /* The one line that says what this is, on its own face, before anything else
     on the page can be mistaken for a chapter. */
  const lede = el("p", "cards__lede");
  lede.textContent =
    `Reference, not a lesson: ${terms.length} words in ${groupsIn.length} groups, ` +
    `unnumbered, outside the progression and never examined — look a word up when ` +
    `you meet one, and put it back.`;
  head.append(h, lede);
  wrap.appendChild(head);

  const body = el("div", "cards__body gl__body");

  /* Where these rows came from, said out loud and above the fold. The rows below
     are only as good as this paragraph, and a reader who quotes a "multi-service
     standard" badge without knowing it was transcribed rather than read has been
     misled by this page rather than informed by it. Set in the same furniture the
     Sources page uses for a source note, because that is what it is. */
  const prov = el("div", "src gl__prov");
  prov.innerHTML =
    `<div class="src__cap"><span>Provenance</span><span>read before quoting any of it</span></div>` +
    `<p class="src__what">${TAX.$provenance}</p>`;
  body.appendChild(prov);

  /* The key to the ladder. Each rung is an <li> carrying the chapter's own
     term--<status> class, so these are four miniature specimen cards drawn by
     the same rules as the rows and the chapters — it cannot drift from either. */
  const why = el("p", "gl__why");
  why.textContent =
    "Half of this vocabulary is standardised and half of it never was, and on a page " +
    "they look the same. Every row is stamped with how much authority its word carries, " +
    "heaviest first. A dashed row is not doctrine and never was.";
  const key = el("ul", "gl__rungs");
  key.innerHTML = RANK.map((s) =>
    `<li class="term--${s}"><span class="term__s">${STATUS[s]}</span>` +
    `<span class="gl__n">${tally(s)}</span></li>`).join("");
  body.append(why, key);

  /* Two native controls, both labelled. A text box and a select do this whole
     job with no state of their own, nothing to get out of step with the table,
     and keyboard behaviour nobody has to re-implement. */
  const bar = el("div", "gl__filter");
  /* The shortcut is said out loud, beside the thing it operates, in the same
     mono caption every other identifier on the plate is set in. A keystroke
     nobody is told about is folklore, and folklore is not a feature. */
  const qLab = el("label", "gl__lab",
    `Search <kbd>Ctrl</kbd><kbd>K</kbd> <span>or</span> <kbd>/</kbd>`);
  qLab.htmlFor = "gl-q";
  const q = el("input", "gl__q");
  q.id = "gl-q";
  q.type = "search";
  q.placeholder = "term, meaning, or the word it gets confused with";
  q.autocomplete = "off";
  const sLab = el("label", "gl__lab", "Standing");
  sLab.htmlFor = "gl-standing";
  const pick = el("select", "cards__pick gl__pick");
  pick.id = "gl-standing";
  pick.innerHTML =
    `<option value="">Any standing — ${terms.length}</option>` +
    RANK.map((s) => `<option value="${s}">${STATUS[s]} — ${tally(s)}</option>`).join("");
  bar.append(qLab, q, sLab, pick);
  body.appendChild(bar);

  /* Filtering changes the page under a reader who is looking at a text box, so
     the result is announced rather than only drawn. */
  const count = el("p", "gl__tally");
  count.setAttribute("role", "status");
  const none = el("p", "cards__note gl__none",
    "Nothing here uses that word. Try the other name for it, or clear the standing filter — " +
    "a term you half-remember is often the one another term warns you not to confuse it with.");
  none.hidden = true;
  body.append(count, none);

  // ── the table: the index's furniture, carrying words instead of chapters ──
  const table = el("table", "index gl");
  table.innerHTML =
    "<thead><tr><th>Term</th><th>Means</th><th>Standing</th></tr></thead>";

  /* Grouped in the file's order, which is the source's order — regimes, then the
     intercept, then the merge, then the knife fight. Alphabetising it would throw
     away the one piece of teaching a reference can carry for free. */
  const groups = groupsIn.map((c) => {
    const tb = el("tbody");
    tb.innerHTML =
      `<tr class="gl__cat"><th colspan="3"><b>${c.title}</b><span>${c.note}</span></th></tr>`;

    const items = terms.filter((t) => t.category === c.id).map((t) => {
      const tr = el("tr", `term--${t.status}`);
      /* The headword is a real <button>, so Enter, Space, the focus ring and
         the announced role all come from the platform rather than from a
         hand-rolled row widget. The whole row is clickable too — the click
         lands on the same handler either way, because the button's own click
         bubbles to it. */
      tr.innerHTML =
        `<td class="gl__t"><button type="button" class="gl__open"><b>${t.term}</b>` +
        (t.alsoKnownAs?.length
          ? `<span class="gl__aka">also ${t.alsoKnownAs.join(" · ")}</span>` : "") +
        `</button></td>` +
        /* confusedWith is not a footnote here. The project's rule is that an
           approximate synonym is never presented as an equivalent, and this line
           is the only place that distinction lives — so it sits in the same cell
           as the definition, under the same hairline the chapter draws it under,
           and it is searched. */
        `<td class="gl__d"><p class="term__m">${t.means}</p>` +
        `<p class="term__n">Not the same as ${t.confusedWith}.</p></td>` +
        `<td class="gl__st"><span class="term__s">${STATUS[t.status]}</span>` +
        (t.src ? `<p class="term__src">${t.src}</p>` : "") +
        `</td>`;
      tr.addEventListener("click", () => openTerm(t, tr.querySelector(".gl__open")));
      tb.appendChild(tr);
      /* Searched over the word, its other names, what it means AND what it is
         not: somebody who half-remembers a word usually half-remembers the wrong
         one, and the wrong one is named on the confusion line. */
      return {
        tr,
        status: t.status,
        hay: [t.term, ...(t.alsoKnownAs || []), t.means, t.confusedWith].join(" ").toLowerCase(),
      };
    });

    table.appendChild(tb);
    return { tb, items };
  });
  body.appendChild(table);

  function apply() {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const want = pick.value;
    let shown = 0;
    groups.forEach((g) => {
      let live = 0;
      g.items.forEach((it) => {
        const ok = (!want || it.status === want) && words.every((w) => it.hay.includes(w));
        it.tr.hidden = !ok;                 // [hidden] is !important in the reset, so this holds
        if (ok) live++;
      });
      g.tb.hidden = !live;                  // a heading with nothing under it lies about what is left
      shown += live;
    });
    count.textContent = `${shown} of ${terms.length} terms`;
    none.hidden = shown > 0;
    table.hidden = shown === 0;
  }
  q.addEventListener("input", apply);
  pick.addEventListener("change", apply);
  apply();

  /* ── the term plate ──
     One <dialog>, built once and refilled, opened with showModal(). Native
     because everything a modal has to get right — the page behind going inert,
     the focus trap, Escape, the backdrop — is already correct in the platform
     and is only ever re-implemented worse. The player made the same call for the
     same reason, so this borrows its furniture too: turning to a word is turning
     to another plate, and it should look like one. */
  const dlg = el("dialog", "vp vp--term");
  dlg.innerHTML =
    `<div class="vp__bar"><span>Vocabulary</span><span class="vp__dur"></span>` +
      `<button class="vp__x" type="button" aria-label="Close">` +
        `<span>Close</span>` +
        `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11"/></svg>` +
      `</button></div><div class="gl__plate"></div>`;
  const dCat = dlg.querySelector(".vp__dur");
  const dPlate = dlg.querySelector(".gl__plate");
  dlg.querySelector(".vp__x").onclick = () => dlg.close();
  // Clicking the surround closes; clicking the plate itself must not.
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  /* Whatever opened it gets the focus back, including when the reader clicked a
     cell rather than the headword — a <td> takes no focus, so the platform's own
     restore would drop them at the top of the document. */
  let opener = null;
  dlg.addEventListener("close", () => opener?.focus());
  body.appendChild(dlg);

  function openTerm(t, from) {
    opener = from;
    dCat.textContent = TAX.categories.find((c) => c.id === t.category)?.title || "";
    dlg.setAttribute("aria-label", `${t.term} — ${STATUS[t.status]}`);
    const ch = chapterFor(t);
    /* A figure key that names nothing is a silent blank on the plate, so it is
       reported the same way a row without a standing is: loudly, here, rather
       than being noticed by a reader. */
    if (t.figure && !DIAGRAMS[t.figure]) {
      console.error("taxonomy row names a figure that does not exist:", t);
    }
    const fig = t.figure && DIAGRAMS[t.figure];
    dPlate.innerHTML =
      /* The chapter's own term card, not a copy of it. The rung classes are the
         chapter's, so a word cannot carry one weight of authority in a lesson
         and another in the appendix that lists it. */
      `<div class="term term--${t.status}">` +
        `<p class="term__w">${t.term}` +
        (t.alsoKnownAs?.length
          ? `<span class="gl__aka">also ${t.alsoKnownAs.join(" · ")}</span>` : "") +
        `<span class="term__s">${STATUS[t.status]}</span></p>` +
        `<p class="term__m">${t.means}</p>` +
        /* Still not a footnote. This is the line that stops an approximate
           synonym being read as an equivalent, and it is the reason most people
           open one of these at all. */
        `<p class="term__n">Not the same as ${t.confusedWith}.</p>` +
        (t.src ? `<p class="term__src">${t.src}</p>` : "") +
      `</div>` +
      /* Complete, not stepped. A lesson builds a drawing up because the reader is
         being taught it; a lookup is not being taught anything and wants the
         finished plate. figure() already writes data-state at the last state. */
      (fig ? `<div class="fig-host">${fig()}</div>` : "") +
      (ch
        ? `<div class="xref"><a href="#${ch.les.id}">` +
          `<span class="xref__n">Chapter ${String(ch.i + 1).padStart(2, "0")}</span>` +
          `<span class="xref__t">${ch.les.title}</span></a>` +
          `<p class="xref__y">${ch.why}</p></div>`
        : "") +
      (t.seeAlso
        ? `<div class="src gl__see">` +
          `<div class="src__cap"><span>See also</span><span>not doctrine</span></div>` +
          `<p class="src__what">${t.seeAlso.label}</p>` +
          `<a class="src__url" href="${t.seeAlso.url}" target="_blank" rel="noopener noreferrer">` +
          `${t.seeAlso.url}</a></div>`
        : "");
    dPlate.scrollTop = 0;
    dlg.showModal();
  }

  /* ── the keyboard ──
     Ctrl+K and / are what a reference page is expected to bind, so binding
     anything else would be the surprise. Never while somebody is typing: a
     slash in the search box is a character, not a command, and the event target
     is the only thing that can tell those apart.

     The listener is on the document and this page does not own the document, so
     it has to be able to give it back. main.js renders the next route over the
     top of this one without telling anybody, and a keydown handler left behind
     would go on stealing / and Ctrl+K on every other page in the course. One
     AbortController, dropped on the first hashchange, takes back the listener
     and shuts the plate at the same time. */
  const leaving = new AbortController();
  addEventListener("keydown", (e) => {
    if (dlg.open) return;                       // the plate owns Escape while it is up
    const tag = e.target?.tagName;
    if (e.key === "Escape" && e.target === q) { q.value = ""; apply(); q.blur(); return; }
    if (e.altKey || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.target?.isContentEditable) return;
    const hit = (e.ctrlKey || e.metaKey) ? e.key.toLowerCase() === "k" : e.key === "/";
    if (!hit) return;
    e.preventDefault();
    q.focus();
    q.select();
  }, { signal: leaving.signal });
  addEventListener("hashchange", () => { dlg.close(); leaving.abort(); }, { once: true });

  const home = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`);
  home.href = "#";
  home.style.marginTop = "28px";
  body.appendChild(home);

  wrap.appendChild(body);
  root.appendChild(wrap);
}

/* In the back matter with the deck, the checkride and the sources — above the
   sources, because a glossary comes before the bibliography in every manual
   that has both. */
export function glossaryStrip() {
  const a = el("a", "catalogue catalogue--gloss",
    `<span class="catalogue__t">The vocabulary</span>` +
    `<span class="catalogue__n">${TAX.terms.length} terms · ${TAX.categories.length} groups · ` +
    `reference, not a chapter</span>` + mark());
  a.href = "#glossary";
  return a;
}
