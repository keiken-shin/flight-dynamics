/* Depiction options, side by side. Not part of the app and not in the build —
 * `explore.html` exists only so a choice about how the aircraft should read can
 * be made by looking at four of them at once, in both plates.
 *
 * Every variant runs the real flight model and the real tokens. What differs is
 * only the treatment, so a difference you see here is a difference you would
 * get. Delete this file and explore.html once a variant is picked.
 */

import * as THREE from "three";
import { AIRCRAFT, G, initialState, step } from "./sim/flight-model.js";
import { aircraft, arrow, chip, figure, cgMark } from "./data/svg.js";
import "./styles/tokens.css";
import "./styles/explore.css";

const css = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

/* ── the four treatments ───────────────────────────────────────────────────
   `body`   fill of the airframe's solid faces
   `edge`   the outline colour
   `ground` the earth's tone, and whether a horizon line is drawn
   `shade`  lit surfaces instead of flat fill                               */
const VARIANTS = [
  {
    key: "A", name: "Before (C is now shipped)",
    note: "Body fill is the sky colour exactly (contrast 1.00) so the aircraft is a hole rather than a "
        + "solid, the ground sits 1.11 against the sky so there is no horizon, and on the negative plate "
        + "the weight arrow is the same ink as the airframe outline. This is the baseline, not a proposal.",
    body: () => css("--paper"), edge: () => css("--ink"),
    ground: () => ({ tone: css("--ink"), alpha: 0.05, horizon: false }),
    shade: false, weight: () => css("--f-weight"),
  },
  {
    key: "B", name: "Solid body, drawn horizon",
    note: "Smallest change that fixes the reading. The airframe fills to paper-sunk so it occludes what is "
        + "behind it, the earth steps to a tone you can actually see, and a hairline horizon is drawn where "
        + "the ground ends. Everything else is untouched.",
    body: () => css("--paper-sunk"), edge: () => css("--ink"),
    ground: () => ({ tone: css("--ink"), alpha: 0.16, horizon: true }),
    shade: false, weight: () => css("--f-weight"),
  },
  {
    key: "C", name: "Airframe recedes",
    note: "The forces are the subject; the aeroplane is the thing they act on. So the outline drops to "
        + "secondary ink and the four arrows become the brightest marks in the scene. This also separates "
        + "the weight arrow from the airframe on the negative plate, where they are currently identical.",
    body: () => css("--paper-sunk"), edge: () => css("--ink-2"),
    ground: () => ({ tone: css("--ink"), alpha: 0.16, horizon: true }),
    shade: false, weight: () => css("--f-weight"),
  },
  {
    key: "D", name: "Shaded solid",
    note: "Lit surfaces instead of flat fill, so the fuselage reads as a round body and the wing has a top "
        + "and an underside. The most legible as an object, and the furthest from the flat-plate world the "
        + "rest of the build commits to — worth seeing before ruling out.",
    body: () => css("--paper-sunk"), edge: () => css("--ink-2"),
    ground: () => ({ tone: css("--ink"), alpha: 0.16, horizon: true }),
    shade: true, weight: () => css("--f-weight"),
  },
];

/* One fixed attitude for every panel: a settled climb, so the only thing that
   differs between panels is the treatment. */
function climbState() {
  let s = initialState();
  const c = { throttle: 1, elevator: 0 };
  for (let t = 0; t < 26; t += 1 / 240) {
    if (t > 12) c.elevator = 0.3;
    s = step(s, c, 1 / 240).state;
  }
  return s;
}

function label(text, color) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.font = "700 40px ui-monospace, monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 34);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false,
  }));
  spr.scale.set(3.4, 1.7, 1);
  spr.renderOrder = 10;
  return spr;
}

const live = [];

function mount(host, V, state, forces) {
  const paper = css("--paper"), sky = new THREE.Color(paper);
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = sky;

  const edge = V.edge(), body = V.body(), gr = V.ground();
  const lineMat = new THREE.LineBasicMaterial({ color: edge });
  const faceMat = V.shade
    ? new THREE.MeshLambertMaterial({ color: body })
    : new THREE.MeshBasicMaterial({ color: body });
  if (V.shade) {
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-3, 6, 8);
    scene.add(key);
  }

  const g = new THREE.Group();
  const add = (geo, x = 0, y = 0, z = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, faceMat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), lineMat);
    m.position.set(x, y, z); m.rotation.z = rz;
    e.position.copy(m.position); e.rotation.copy(m.rotation);
    g.add(m, e);
  };
  add(new THREE.CylinderGeometry(0.42, 0.30, 6.2, 10), 0, 0, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(1.5, 0.14, 10.4), 0.2, 0.46, 0);
  add(new THREE.BoxGeometry(1.0, 0.10, 3.6), -2.7, 0.30, 0);
  add(new THREE.BoxGeometry(0.9, 1.5, 0.10), -2.8, 0.95, 0);
  add(new THREE.BoxGeometry(0.10, 1.7, 0.10), 3.05, 0, 0);
  scene.add(g);

  // earth
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 900),
    new THREE.MeshBasicMaterial({ color: gr.tone, opacity: gr.alpha, transparent: true, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(state.x, 0, 0);
  scene.add(ground);
  if (gr.horizon) {
    const hm = new THREE.LineBasicMaterial({ color: css("--rule"), opacity: 0.9, transparent: true });
    const pts = [new THREE.Vector3(state.x - 3000, 0.02, -450), new THREE.Vector3(state.x + 3000, 0.02, -450)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), hm));
  }
  const stripeMat = new THREE.MeshBasicMaterial({
    color: gr.tone, opacity: Math.min(0.85, gr.alpha * 4), transparent: true, depthWrite: false });
  for (let i = 0; i < 130; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(i * 22 - 60, 0.02, 0);
    scene.add(s);
  }

  // forces
  const W = AIRCRAFT.m * G, SCALE = 4.6 / W;
  const C = { lift: css("--f-lift"), weight: V.weight(), thrust: css("--f-thrust"), drag: css("--f-drag") };
  const CLEAR = { lift: 1.9, weight: 1.5, thrust: 3.4, drag: 3.4 };
  const TXT = { lift: "+L", weight: "−W", thrust: "+T", drag: "−D" };
  const up = new THREE.Vector3(-Math.sin(state.gamma), Math.cos(state.gamma), 0);
  const fwd = new THREE.Vector3(Math.cos(state.gamma - state.theta), Math.sin(state.gamma - state.theta), 0);
  const dirs = {
    lift: up, thrust: fwd, drag: fwd.clone().negate(),
    weight: new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -state.theta),
  };
  const mag = { lift: forces.L, weight: forces.W, thrust: forces.T, drag: forces.D };
  for (const k of ["lift", "weight", "thrust", "drag"]) {
    if (mag[k] <= W * 0.02) continue;
    const len = mag[k] * SCALE;
    const a = new THREE.ArrowHelper(dirs[k], new THREE.Vector3(), len, C[k],
      Math.min(0.9, len * 0.26), Math.min(0.5, len * 0.16));
    g.add(a);
    const perp = new THREE.Vector3(-dirs[k].y, dirs[k].x, 0);
    const l = label(TXT[k], C[k]);
    l.position.copy(dirs[k]).multiplyScalar(Math.min(Math.max(len, CLEAR[k]) + 1.25, 5.6))
      .addScaledVector(perp, 0.85);
    g.add(l);
  }

  g.position.set(state.x, state.h + 0.95, 0);
  g.rotation.z = state.theta;

  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 900);
  camera.position.set(state.x - 7, state.h + 2.4, 15);
  camera.lookAt(state.x, state.h + 1.1, 0);

  /* Measured by observer, not once at construction: the grid has not settled
     while the panels are being appended, so a one-shot read gives the first two
     panels a full-width buffer and the rest a column-width one. */
  function size() {
    const w = host.clientWidth;
    if (!w) return;
    const h = Math.round(w * 0.56);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(size);
  ro.observe(host);
  live.push({ size, ro, renderer });
  return size;
}

/* ── 2D: the same question for the authored plate ─────────────────────────── */
const FIG = {
  A: () => figure({
    title: "As shipped", desc: "",
    vb: "0 0 700 460",
    states: [aircraft({ cx: 350, cy: 230, scale: 1.2 }) +
      arrow(350, 230, 350, 60, "lift") + chip(350, 38, "L — lift", "lift") +
      arrow(350, 230, 350, 400, "weight") + chip(350, 422, "W — weight", "weight") +
      arrow(350, 230, 180, 230, "thrust") + chip(130, 204, "T — thrust", "thrust") +
      arrow(350, 230, 520, 230, "drag") + chip(578, 204, "D — drag", "drag")],
  }),
  E: () => figure({
    title: "Airframe recedes", desc: "",
    vb: "0 0 700 460",
    states: [`<g class="dim">${aircraft({ cx: 350, cy: 230, scale: 1.2, cg: false })}</g>` +
      cgMark(350, 230) +
      arrow(350, 230, 350, 60, "lift") + chip(350, 38, "L — lift", "lift") +
      arrow(350, 230, 350, 400, "weight") + chip(350, 422, "W — weight", "weight") +
      arrow(350, 230, 180, 230, "thrust") + chip(130, 204, "T — thrust", "thrust") +
      arrow(350, 230, 520, 230, "drag") + chip(578, 204, "D — drag", "drag")],
  }),
};

/* ── page ─────────────────────────────────────────────────────────────────── */
const s = climbState();
const f = step(s, { throttle: 1, elevator: 0.3 }, 1 / 240).forces;

const root = document.getElementById("x");
root.innerHTML = `
  <header>
    <h1>Depiction options</h1>
    <p>Same aircraft, same climb, same model. Only the treatment differs.
       Toggle the plate and compare — nothing here is in the app.</p>
    <button id="t" type="button">Flip to negative plate</button>
  </header>
  <section class="grid" id="g3"></section>
  <h2>The authored plate</h2>
  <p class="lede">On the negative plate the weight arrow and the airframe outline are both drawn in ink,
     so they are the same colour. The right-hand option drops the airframe to secondary ink.</p>
  <section class="grid two" id="g2"></section>`;

const g3 = document.getElementById("g3");

/* Append every panel first, THEN size them: a panel measured while its siblings
   are still being appended reads the grid's single-column width. The observer
   handles later resizes; it cannot be relied on for the first paint. */
function build() {
  const sizers = VARIANTS.map((V) => {
    const card = document.createElement("figure");
    card.innerHTML = `<figcaption><b>${V.key} · ${V.name}</b><span>${V.note}</span></figcaption>`;
    const host = document.createElement("div");
    host.className = "cv";
    card.prepend(host);
    g3.appendChild(card);
    return mount(host, V, s, f);
  });
  sizers.forEach((fn) => fn());
}
build();

const g2 = document.getElementById("g2");
[["A · As shipped", FIG.A()], ["E · Airframe recedes", FIG.E()]].forEach(([n, svg]) => {
  const card = document.createElement("figure");
  card.innerHTML = svg + `<figcaption><b>${n}</b></figcaption>`;
  g2.appendChild(card);
});

document.getElementById("t").onclick = (e) => {
  const neg = document.documentElement.getAttribute("data-plate") === "negative";
  document.documentElement.setAttribute("data-plate", neg ? "positive" : "negative");
  e.target.textContent = neg ? "Flip to negative plate" : "Flip to positive plate";
  // Tokens changed, so every scene has to be rebuilt against the new palette.
  live.forEach((l) => { l.ro.disconnect(); l.renderer.dispose(); });
  live.length = 0;
  g3.innerHTML = "";
  build();
};

