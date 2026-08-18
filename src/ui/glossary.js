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
 */

import TAX from "../../content/taxonomy.json";
import { COURSE } from "../data/lessons.js";
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
  const qLab = el("label", "gl__lab", "Search");
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
      tr.innerHTML =
        `<td class="gl__t"><b>${t.term}</b>` +
        (t.alsoKnownAs?.length
          ? `<span class="gl__aka">also ${t.alsoKnownAs.join(" · ")}</span>` : "") +
        `</td>` +
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
