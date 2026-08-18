import { COURSE } from "../data/lessons.js";
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
    name: "NASA TP-1538, via JSBSim's f16",
    who:
      "Luat T. Nguyen, Marilyn E. Ogburn, William P. Gilbert, Kemper S. Kibler, " +
      "Phillip W. Brown and Perry L. Deal at NASA Langley; Erik Hofman for the JSBSim " +
      "aircraft definition",
    lic: "Report public domain · aircraft data GPL",
    url: "https://ntrs.nasa.gov/citations/19800005879",
    what:
      "The second aircraft — the one Part II turns and fights in — is an F-16A, and its " +
      "numbers come from the wind-tunnel data published in \"Simulator Study of " +
      "Stall/Post-Stall Characteristics of a Fighter Airplane With Relaxed Longitudinal " +
      "Static Stability\" (1979), read through JSBSim's f16 model. Public and unclassified, " +
      "both of them. Used: the geometry and inertias; the lift, drag and moment tables; " +
      "the engine's rated thrust; the control travels; and the two limits the whole of " +
      "chapter 15 rests on — 9 g, and the angle of attack the flight computer will not go " +
      "past — which JSBSim's file states in its own words. Not used: the tables as tables. " +
      "Every derivative here is one constant read at zero angle of attack, so this aeroplane " +
      "is only honest at low alpha, and the departure and deep-stall behaviour that is " +
      "actually the report's subject is not modelled at all. Approximated, and each one " +
      "labelled on its line in the code: the drag polar, which is a single parabola fitted " +
      "to a curve it cannot follow; the loading, which is a choice rather than the report's " +
      "reference weight; a pitch-damping term nobody publishes, carried as zero rather than " +
      "invented. And one number that is not a measurement at all — the pitch stiffness. The " +
      "real F-16 is deliberately close to neutrally stable and is flyable only through its " +
      "flight control system, which this model does not have, so what it carries instead is " +
      "an effective closed-loop value standing in for airframe plus computer. That is said " +
      "out loud here because saying it quietly would make every other number in the block " +
      "less believable. None of this is doctrine and none of it is a training aid.",
  },
  {
    name: "CNATRA P-825 — BFM and All Weather Intercept",
    who: "US Naval Air Training Command",
    lic: "US government work — public domain",
    url: "https://www.cnatra.navy.mil/",
    what:
      "The Navy's own flight training instruction, and the primary source behind Part II's " +
      "geometry: the three pursuit curves and what each does to range, angles and closure; " +
      "corner airspeed and why overstress cannot happen below it; the two kinds of overshoot " +
      "and the criteria under which a defender may reverse on one; and the beam manoeuvre " +
      "defeating a radar lock by exploiting the Doppler notch. Where this document and the " +
      "Air Force's disagree — and on one-circle versus two-circle they genuinely do — both " +
      "are stated rather than one being quietly preferred.",
  },
  {
    name: "Multi-Command Handbook 11-F16, Volume 5",
    who: "United States Air Force",
    lic: "US government work — public domain",
    url: "",
    what:
      "Where the claim this whole part is built on actually comes from: that BFM is not a " +
      "fixed set of manoeuvres but combinations of rolls, turns and accelerations named for " +
      "the sake of discussion. Also the definition of corner velocity, the caution that the " +
      "F-16 has a corner plateau rather than a single speed, and specific excess power as an " +
      "energy rate. This course originally credited that first claim to a more recent Air " +
      "Education and Training Command publication; that attribution was wrong and is " +
      "corrected here — the reachable source is this 1996 handbook.",
  },
  {
    name: "Multi-service brevity codes",
    who: "US Army, Marine Corps, Navy and Air Force",
    lic: "US government work — public domain",
    url: "",
    what:
      "Every word in this course marked as standard brevity. Read this one carefully: " +
      "nobody working on this course has opened the publication itself. It is not reachable " +
      "from here, so the vocabulary was taken from a transcription that cites the January " +
      "2025 edition, and each term names that edition rather than claiming standing in " +
      "general. That matters because these definitions move — SHORT SKATE was once its own " +
      "entry and is now a modifier of SKATE, and NOTCH was Doppler-specific before it became " +
      "a general defensive call. Anything here labelled multi-service should be read as " +
      "“a transcription says so”, not as first-hand. Terms the sources describe in a way " +
      "that claims authority without naming a publication — F-pole, minimum abort range and " +
      "several others — were left out rather than given a status they could not support.",
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
  document.title = `Sources · ${COURSE}`;

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
