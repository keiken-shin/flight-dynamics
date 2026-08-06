/* Credits — a manual's back page, where the sources are listed.
 *
 * The channel list is DERIVED from the shipped video set, not typed here, so a
 * curation pass can never leave somebody uncredited. Everything else is a fixed
 * record of what this project is built out of.
 */

import { VIDEOS } from "../data/videos.js";
import { el, mark } from "./util.js";

/* Owed for material this course could not have been built without. */
const SOURCES = [
  {
    name: "JSBSim",
    who: "The JSBSim team, and Tony Peden for the c172x aircraft definition",
    lic: "LGPL 2.1 · aircraft data GPL",
    url: "https://github.com/JSBSim-Team/jsbsim",
    what:
      "The geometry, inertias and stability derivatives in src/sim/flight-model.js are " +
      "converted to SI from JSBSim's c172x model of a 1982 Cessna 172P. None of the code " +
      "is used — the flight model here is written from scratch and deliberately readable — " +
      "but the numbers it multiplies are theirs, and those numbers are the expensive half. " +
      "Every mode in the sandbox, the Dutch roll and the phugoid included, emerges from " +
      "that measured data rather than from anything authored to look right.",
  },
  {
    name: "NASA and NACA technical reports",
    who: "Public-domain aerodynamic literature via NTRS",
    lic: "Public domain",
    url: "https://ntrs.nasa.gov/",
    what:
      "The stability-derivative conventions, the mode approximations checked against in " +
      "npm run check, and the published aerofoil behaviour the lift curve follows.",
  },
  {
    name: "Three.js",
    who: "mrdoob and contributors",
    lic: "MIT",
    url: "https://threejs.org/",
    what: "Every sandbox. Loaded only when a reader presses Fly it yourself.",
  },
  {
    name: "Archivo, Archivo Narrow, JetBrains Mono",
    who: "Omnibus-Type, and JetBrains",
    lic: "SIL Open Font License 1.1",
    url: "https://fontsource.org/",
    what:
      "The plate's lettering, self-hosted through Fontsource so the course loads no " +
      "third-party font service.",
  },
  {
    name: "gpt-image-2",
    who: "OpenAI, via the gpt-image-bridge skill",
    lic: "Generated asset",
    url: "",
    what:
      "The exploded aircraft plate on the index. Generated imagery is used for " +
      "illustration only — every labelled technical figure in this course is authored " +
      "by hand, because an image model will invent components and mislabel axes.",
  },
];

export function renderCredits(root) {
  root.innerHTML = "";
  document.title = "Sources · Flight Dynamics";

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "Sources";
  const p = el("p", "cards__lede");
  p.textContent =
    "This course is mostly other people's work, rearranged. The measurements that make " +
    "the aircraft fly, and the teaching that explains it better in five minutes of video " +
    "than a page of prose could, are all borrowed. Here is who from.";
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");

  // ── libraries, data, type ──
  body.appendChild(el("h2", "t-h2 cards__h2", "Built on"));
  SOURCES.forEach((s) => {
    const c = el("div", "src");
    c.innerHTML =
      `<div class="src__cap"><span>${s.name}</span><span>${s.lic}</span></div>` +
      `<p class="src__who">${s.who}</p>` +
      `<p class="src__what">${s.what}</p>` +
      (s.url ? `<a class="src__url" href="${s.url}" target="_blank" rel="noopener noreferrer">${s.url}</a>` : "");
    body.appendChild(c);
  });

  /* ── the channels ──
     Counted from the shipped set so this list cannot fall behind curation. */
  const byChannel = new Map();
  for (const list of Object.values(VIDEOS)) {
    for (const v of list) {
      if (!byChannel.has(v.channel)) byChannel.set(v.channel, []);
      byChannel.get(v.channel).push(v);
    }
  }
  const channels = [...byChannel.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const total = channels.reduce((n, [, v]) => n + v.length, 0);

  body.appendChild(el("h2", "t-h2 cards__h2", "The channels"));
  body.appendChild(el("p", "cards__note",
    `${total} videos from ${channels.length} channels, each chosen by hand and each ` +
    `credited to whoever made it. They are embedded and played inside this course rather ` +
    `than linked away, which is a decision about the reader's attention and not about ` +
    `whose work it is — every clip is theirs, hosted on their channel, and their view ` +
    `count is unaffected.`));

  const table = el("table", "index credits__list");
  table.innerHTML = "<thead><tr><th>Channel</th><th>Used for</th><th>Clips</th></tr></thead>";
  const tb = el("tbody");
  channels.forEach(([name, vids]) => {
    const tr = el("tr");
    tr.innerHTML =
      `<td><b>${name}</b></td>` +
      `<td class="c-rem">${vids.map((v) => v.title).join(" · ")}</td>` +
      `<td class="c-item">${vids.length}</td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  body.appendChild(table);

  const foot = el("p", "cards__note credits__foot");
  foot.innerHTML =
    "If you made something listed here and would rather it were not used, say so and it " +
    "comes out of the next curation pass — <code>npm run verify:videos</code> already " +
    "checks every clip monthly for reachability and embedding permission.";
  body.appendChild(foot);

  const home = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`);
  home.href = "#";
  home.style.marginTop = "28px";
  body.appendChild(home);

  wrap.appendChild(body);
  root.appendChild(wrap);
}

/* Sits at the very foot of the index, under the checkride — the last page of
   the manual, which is where a sources list belongs. */
export function creditsStrip() {
  const n = Object.values(VIDEOS).flat().length;
  const ch = new Set(Object.values(VIDEOS).flat().map((v) => v.channel)).size;
  const a = el("a", "catalogue catalogue--src",
    `<span class="catalogue__t">Sources</span>` +
    `<span class="catalogue__n">JSBSim · ${ch} channels · ${n} clips</span>` + mark());
  a.href = "#credits";
  return a;
}
