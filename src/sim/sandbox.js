/* The apply-it surface. The same four arrows the lesson drew as a figure, now
 * attached to an aircraft you fly, sized every frame by src/sim/flight-model.js.
 *
 * Which aeroplane it flies is the task's to say. Anything that describes the
 * airframe rather than the exercise — the silhouette, the arrow scale, the stall
 * speed, the control throws, the stall warning — is read off `task.ac`, which
 * defaults to the Cessna, so every Part I chapter is untouched by the second
 * aircraft existing. */

import * as THREE from "three";
import { AIRCRAFT, FIGHTER, G, initialState, step, stallSpeed } from "./flight-model.js";
import { TASKS, relative } from "./tasks.js";
import { mark } from "../ui/util.js";

const css = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/* Built geometry, not a downloaded model: it keeps the line-drawing character
 * of the plates and costs nothing in bundle size.
 *
 * The airframe is drawn to RECEDE. The forces are the subject and the aeroplane
 * is the thing they act on, so the outline sits at secondary ink and the four
 * arrows are the brightest marks in the scene. On the negative plate this also
 * separates the weight arrow from the outline, which are otherwise the same
 * colour exactly — `--f-weight` and `--ink` are one value there.
 *
 * The body fills to paper-sunk rather than paper: filling it with the scene
 * background gave the aircraft a contrast of 1.00 against the sky, so it read
 * as a hole punched in the picture instead of a solid that occludes the ground.
 *
 * `edge` is the outline ink, and the only thing that separates us from them: the
 * bandit is the same drawing in `--r-threat`, the token the figures already use
 * for the other aeroplane. The default is the receding ink the aircraft you fly
 * has always had, so nothing in Part I moves.
 */
function airframe(edge = css("--ink-2", "#454b55")) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: edge });
  const solid = new THREE.MeshBasicMaterial({ color: css("--paper-sunk", "#eceae5") });

  const add = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, solid);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), mat);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation);
    g.add(mesh, edges);
  };
  return { g, add };
}

function buildCessna(edge) {
  const { g, add } = airframe(edge);
  add(new THREE.CylinderGeometry(0.42, 0.30, 6.2, 10), 0, 0, 0, 0, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(1.5, 0.14, 10.4), 0.2, 0.46, 0);        // high wing
  add(new THREE.BoxGeometry(1.0, 0.10, 3.6), -2.7, 0.30, 0);        // tailplane
  add(new THREE.BoxGeometry(0.9, 1.5, 0.10), -2.8, 0.95, 0);        // fin
  add(new THREE.BoxGeometry(0.10, 1.7, 0.10), 3.05, 0, 0);          // prop disc edge
  add(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 8), 0.5, -0.72, 1.0, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 8), 0.5, -0.72, -1.0, 0, 0, Math.PI / 2);
  return g;
}

/* A swept planform given thickness, rather than a box: the sweep IS the
   difference between the two silhouettes, and a box cannot hold one. Drawn in
   the aircraft's own x (aft-negative) and span, then laid flat by the caller.
   Same helper for the wing and the stabilators — one is the other, smaller. */
function delta(rootLE, rootChord, halfSpan, sweepDeg, tipChord, thickness) {
  const tipLE = rootLE - halfSpan * Math.tan((sweepDeg * Math.PI) / 180);
  const s = new THREE.Shape();
  s.moveTo(rootLE, 0);
  s.lineTo(tipLE, halfSpan);
  s.lineTo(tipLE - tipChord, halfSpan);
  s.lineTo(rootLE - rootChord, 0);
  s.lineTo(tipLE - tipChord, -halfSpan);
  s.lineTo(tipLE, -halfSpan);
  return new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
}

/* The second silhouette, and the reason it exists: Part II is about a fighter at
 * nine g, and flying those chapters behind a high-wing strutted single would be
 * a confidently wrong picture — the one thing this project may not ship.
 *
 * Same materials, same edge treatment, same receding ink as the Cessna: it is
 * the same KIND of drawing, not a model. Everything that reads as "not a light
 * single" is here and nothing else is — cropped-delta wing low on the body,
 * bubble canopy, chin intake, one fin, all-moving stabilators, a nozzle instead
 * of a propeller, no struts, no fixed gear.
 *
 * Drawn at roughly the Cessna's overall size rather than at the F-16's true 15 m
 * against a 172's 8 m. The camera stand-off and the arrow lengths are fixed in
 * scene units, so a to-scale fighter would arrive twice as big with the same
 * arrows on it. Proportions within the airframe are the real aeroplane's; the
 * overall size is a drawing decision, exactly as the Cessna's already is.
 */
function buildFighter(edge) {
  const { g, add } = airframe(edge);
  const D = Math.PI / 2;

  add(new THREE.CylinderGeometry(0.55, 0.38, 5.2, 10), -0.2, 0, 0, 0, 0, D);   // body
  add(new THREE.ConeGeometry(0.38, 1.1, 10), 2.95, 0, 0, 0, 0, -D);            // radome
  add(new THREE.CylinderGeometry(0.50, 0.42, 0.45, 10), -3.0, 0, 0, 0, 0, D);  // nozzle
  add(new THREE.BoxGeometry(1.5, 0.55, 0.78), 1.45, -0.5, 0);                  // chin intake

  // Bubble canopy: a dome, squashed along its three axes into a canopy.
  const canopy = new THREE.SphereGeometry(0.6, 10, 3, 0, Math.PI * 2, 0, D);
  canopy.scale(2.0, 0.9, 0.78);
  add(canopy, 1.2, 0.40, 0);

  // Low-mounted cropped delta, 40° on the leading edge.
  add(delta(1.4, 3.75, 3.2, 40, 0.9, 0.14), 0, -0.26, 0, -D);
  // All-moving stabilators, on the body centreline.
  add(delta(-2.2, 1.05, 1.9, 30, 0.42, 0.10), 0, -0.05, 0, -D);

  // One fin, swept. Drawn in x/height and extruded across, so no rotation.
  const f = new THREE.Shape();
  f.moveTo(-1.5, 0.35); f.lineTo(-2.62, 2.05); f.lineTo(-3.2, 2.05); f.lineTo(-3.3, 0.35);
  add(new THREE.ExtrudeGeometry(f, { depth: 0.10, bevelEnabled: false }), 0, 0, -0.05);
  return g;
}

/* Frees a subtree's geometries, materials and sprite textures. Used both when a
   checkride item changes aeroplane and at teardown; the swap used to have no
   counterpart at all, which leaked a whole airframe per item. */
function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    // Sprite labels carry a CanvasTexture, which the material does not free.
    mats.forEach((m) => { m.map?.dispose?.(); m.dispose(); });
  });
}

function arrow(color) {
  const a = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, color, 0.9, 0.5,
  );
  a.line.material.linewidth = 2;
  return a;
}

/* Arrow labels, so the 3D reads with the same vocabulary as the plate: the
   figure names its arrows, and an unlabelled arrow in the sandbox is a
   different diagram. Canvas sprites keep it to zero extra dependencies. */
function label(text, color) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.font = "700 40px ui-monospace, 'JetBrains Mono', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  spr.scale.set(3.4, 1.7, 1);
  spr.renderOrder = 10;
  return spr;
}

/**
 * @param sequence  when present, the sandbox runs a checkride: an ordered list
 *                  of tasks, each reset to its own start, advancing on a pass.
 */
export function mountSandbox(host, onExit, lessonId = "four-forces", sequence = null, onDone = null) {
  let stage = 0;
  let task = sequence ? sequence[0] : (TASKS[lessonId] || TASKS["four-forces"]);
  /* The aeroplane rides on the task rather than on this signature: a checkride
     item already carries its own start, controls and arrows, and the airframe is
     one more of those. Omitted means the Cessna, which is every Part I entry. */
  let ac = task.ac ?? AIRCRAFT;
  const passed = [];
  const ink = css("--ink", "#14171c");
  const paper = css("--paper", "#f4f4f1");

  const canvas = document.createElement("canvas");
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(paper);
  scene.fog = new THREE.Fog(paper, 60, 190);

  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 900);

  // Runway: a centreline of dashes marching away, so speed is legible.
  const rw = new THREE.Group();
  const stripeGeo = new THREE.PlaneGeometry(6, 0.5);
  const stripeMat = new THREE.MeshBasicMaterial({ color: ink, opacity: 0.64, transparent: true, depthWrite: false });
  for (let i = 0; i < 130; i++) {
    const s = new THREE.Mesh(stripeGeo, stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(i * 22 - 60, 0.02, 0);
    rw.add(s);
  }
  /* The earth. It must not write depth: the weight arrow points below the wheels
     while the aircraft is still on the runway, and a depth-writing ground
     swallows it. And it is exempt from fog — at 0.05 alpha under a fog that ate
     it before its far edge, this measured 1.11 against the sky, which is to say
     there was no ground and no horizon at all, only haze. Fog still applies to
     the runway stripes, where fading with distance is the point. */
  const GROUND_D = 900;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, GROUND_D),
    new THREE.MeshBasicMaterial({
      color: ink, opacity: 0.16, transparent: true, depthWrite: false, fog: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(1200, 0, 0);
  scene.add(ground);

  // A drawn horizon closing the far edge, so the ground ends at a line rather
  // than dissolving. Also fog-exempt, or it would never be reached.
  const horizon = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1800, 0.03, -GROUND_D / 2),
      new THREE.Vector3(4200, 0.03, -GROUND_D / 2),
    ]),
    // `--rule` would be the obvious pick and is the wrong one: against a ground
    // of ink at 16% it lands on almost the same value (1.06) and vanishes.
    new THREE.LineBasicMaterial({ color: css("--ink-3", "#6b7079"), fog: false }),
  );
  scene.add(horizon);

  /* Runway edges stop where the runway does. Running them to 2800 m left two
     stray diagonals crossing the sky once the aircraft climbed away. */
  const edgeMat = new THREE.LineBasicMaterial({ color: ink, opacity: 0.35, transparent: true });
  for (const z of [-14, 14]) {
    const pts = [new THREE.Vector3(-80, 0.02, z), new THREE.Vector3(1400, 0.02, z)];
    rw.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat));
  }
  scene.add(rw);

  /* A container rather than the airframe itself. The arrows are its children —
     they are drawn in the body frame — so the silhouette underneath can be
     swapped when the aeroplane changes without disturbing them. */
  const plane = new THREE.Group();
  scene.add(plane);
  let body = null;

  const C = {
    lift: css("--f-lift", "#1971c2"), weight: css("--f-weight", "#14171c"),
    thrust: css("--f-thrust", "#2f9e44"), drag: css("--f-drag", "#e03131"),
  };
  /* Only the arrows this chapter is about. Lesson 4 is about drag, and four
     arrows on a plate about drag is three distractions. */
  const arrows = {}, labels = {};
  const TXT = { lift: "+L", weight: "−W", thrust: "+T", drag: "−D" };
  /* On a checkride the task changes but the scene does not, so every arrow any
     item might want is built up front and the ones this item does not name are
     hidden each frame. Building them lazily left arrows from the previous item
     frozen on screen at their last length. */
  const wanted = sequence ? [...new Set(sequence.flatMap((t) => t.arrows))] : task.arrows;
  for (const k of wanted) {
    arrows[k] = arrow(C[k]);
    labels[k] = label(TXT[k], C[k]);
    plane.add(arrows[k], labels[k]);
  }

  /* ── instrument panel ── */
  const panel = document.createElement("div");
  panel.className = "instr";
  /* Only the controls this chapter uses. A rudder pedal on the drag plate is a
     thing to fiddle with, not a thing to learn from. */
  const AXES = {
    throttle: { id: "thr", label: "Throttle", min: 0, lo: "0%", hi: "100%" },
    elevator: { id: "ele", label: "Elevator", min: -100, travel: "dEmax" },
    aileron: { id: "ail", label: "Aileron", min: -100, travel: "dAmax" },
    rudder: { id: "rud", label: "Rudder", min: -100, travel: "dRmax" },
  };
  /* The ends of each scale are this aeroplane's own travel, off the same field
     the readout converts with — they used to be the literals "±23°", "±20°" and
     "±16°", which are a 172's surfaces and would sit under a fighter's
     stabilator claiming it moves 23°. Throttle is a percentage of itself. */
  const ends = (a) => {
    if (!a.travel) return [a.lo, a.hi];
    const d = (ac[a.travel] * 57.2958).toFixed(0);
    return [`−${d}°`, `+${d}°`];
  };
  /* Rebuilt whenever the task changes, which on a checkride is after every
     item. The controls, the readout rows and the brief are all per-task. */
  function buildPanel() {
    const axes = task.controls ?? ["throttle", "elevator"];
    panel.innerHTML =
      (sequence
        ? `<div class="exam__bar"><span>Checkride</span>` +
          `<span>Item ${stage + 1} of ${sequence.length} · Ch ${task.ch}</span>` +
          `<span class="exam__dots">${sequence.map((_, n) =>
            `<i class="${n < stage ? "done" : n === stage ? "now" : ""}"></i>`).join("")}</span></div>` +
          `<p class="exam__name">${task.name}</p>`
        : "") +
      `<p class="brief">${task.brief}</p>` +
      axes.map((k) => {
        const a = AXES[k];
        const [lo, hi] = ends(a);
        return `<div class="ctl">
          <label for="sb-${a.id}">${a.label}</label>
          <div class="scale"><span>${lo}</span>
            <div class="track"><input id="sb-${a.id}" type="range" min="${a.min}" max="100" value="0"></div>
            <span>${hi}</span></div>
          <output id="sb-${a.id}-o">0</output>
        </div>`;
      }).join("") +
      (task.autopilot
        ? `<div class="ctl ctl--ap"><label for="sb-ap">Autopilot</label>
             <div class="scale"><span></span><div class="track">
               <button id="sb-ap" type="button" aria-pressed="false">engage</button>
             </div><span></span></div><output id="sb-ap-o">off</output></div>`
        : "") +
      `<div class="readout">` +
      task.readout.map((r, n) =>
        `<div class="${r.k ? `v-${r.k}` : ""}"><span>${r.label}</span><b id="sb-r${n}">—</b></div>`).join("") +
      `</div>` +
      `<p class="goal" id="sb-goal" hidden></p>`;
    bindPanel();
  }
  host.appendChild(panel);

  const hud = document.createElement("div");
  hud.className = "sandbox__hud";
  hud.innerHTML =
    `<span>IAS <b id="sb-v">0</b> kt</span><span>ALT <b id="sb-h">0</b> ft</span>` +
    `<span>Vs <b id="sb-vs">—</b> kt</span>` +
    `<span id="sb-state">on the ground</span>` +
    `<span style="margin-left:auto"><button id="sb-exit" type="button">` +
    `${mark("left")}<span>back to the plate</span></button></span>`;
  host.appendChild(hud);

  const $ = (id) => host.querySelector("#" + id);
  let thr, ele, ail, rud, apBtn, goalEl;
  function bindPanel() {
    thr = $("sb-thr"); ele = $("sb-ele"); ail = $("sb-ail"); rud = $("sb-rud");
    goalEl = $("sb-goal");
    apBtn = $("sb-ap");
    apOn = false;
    if (apBtn) apBtn.onclick = () => {
      apOn = !apOn;
      apBtn.setAttribute("aria-pressed", String(apOn));
      apBtn.textContent = apOn ? "disengage" : "engage";
      $("sb-ap-o").textContent = apOn ? "holding" : "off";
      ctx.apHeld = 0;
    };
  }
  $("sb-exit").onclick = () => onExit?.();

  /* ── the aeroplane ──
     Everything here is a property of the airframe rather than of the exercise,
     and a checkride item may change it mid-ride, so it is one function rather
     than four constants written once at mount. */
  let W = 0, SCALE = 0;
  function useAircraft(next) {
    ac = next;
    W = ac.m * G;
    /* Arrow lengths are scaled against THIS aeroplane's weight, so "longer than
       weight" is literally what you see — the figure's whole point, made
       physical. A weight arrow of 4.6 units against a 6-unit fuselage keeps the
       pair legible together.

       Per-aircraft, not per-scene: pinned to the Cessna's 9.8 kN the fighter
       would draw its own 1 g weight at 44 units and a 9 g pull at nearly 400,
       which is not a long arrow but a straight line off the top of the picture.
       Divided by its own weight the pull still runs past the frame at the
       limiter — that length IS the measurement, and the label stops at
       LABEL_MAX so it keeps naming the arrow it has left behind. */
    SCALE = 4.6 / W;
    if (body) { plane.remove(body); dispose(body); }
    body = ac === FIGHTER ? buildFighter() : buildCessna();
    plane.add(body);
    $("sb-vs").textContent = (stallSpeed(ac) * 1.944).toFixed(0);
  }
  useAircraft(ac);

  /* ── the bandit ──
     A second state, integrated by the same step() as the aeroplane you fly,
     with the same aircraft data behind it and the same G limiter over it. The
     task says where it starts and what law flies it; nothing here is a path, a
     tween or a replayed table. A task with no `bandit` builds none of it, which
     is every Part I chapter and every checkride item. */
  let foe = null, foeBody = null, bs = null, bf = null, bac = null;
  function useBandit() {
    const b = task.bandit;
    if (foeBody) { foe.remove(foeBody); dispose(foeBody); foeBody = null; }
    bs = null; bf = null; bac = null;
    if (foe) foe.visible = false;
    /* Fog and the clip planes are Part I's, and Part I is a runway and a
       circuit: haze closes at 190 m and the far plane at 900. Two aircraft
       manoeuvring are routinely a mile apart, at which distance the bandit is
       first pure fog colour and then clipped out of existence entirely. Both are
       widened only while a bandit exists — and the near plane goes out with
       them, so the depth buffer keeps roughly the near-to-far ratio it already
       had rather than spending its precision on the first metre of a scene that
       starts three thousand metres up. */
    scene.fog.far = b ? 4000 : 190;
    camera.near = b ? 1 : 0.1;
    camera.far = b ? 12000 : 900;
    camera.updateProjectionMatrix();
    if (!b) return;
    bac = b.ac ?? task.ac ?? AIRCRAFT;
    bs = b.start();
    if (!foe) { foe = new THREE.Group(); scene.add(foe); }
    foe.visible = true;
    /* Them, not us. Same drawing, same edge treatment, in the threat ink the
       figures already use for the other aeroplane; the one you fly keeps the
       receding ink it has always had, because it is the subject and recolouring
       it would change every Part I scene to say something Part I never says. */
    foeBody = (bac === FIGHTER ? buildFighter : buildCessna)(css("--r-threat", "#8f1d1d"));
    foe.add(foeBody);
  }
  useBandit();

  /* ── loop ── */
  let s = task.start ? task.start() : initialState();
  const controls = { throttle: 0, elevator: 0 };
  let raf = 0, last = performance.now(), alive = true;

  /* Context the readouts and the goal are allowed to see beyond the raw state:
     derived numbers, and whatever the chapter's own apparatus is tracking. */
  let ctx = { vs: stallSpeed(ac), target: task.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
  let apOn = false;
  let goalMet = false;
  buildPanel();

  /* Each checkride item starts clean — its own aircraft state, its own context,
     its own controls centred. Failing item six must not cost you items one to
     five, so nothing carries across but the fact that you passed. */
  function loadTask(next) {
    task = next;
    goalMet = false;
    if ((task.ac ?? AIRCRAFT) !== ac) useAircraft(task.ac ?? AIRCRAFT);
    useBandit();
    ctx = { vs: stallSpeed(ac), target: task.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
    s = task.start ? task.start() : initialState();
    buildPanel();
  }

  /* Radius the airframe occupies in each arrow's own direction. Thrust and drag
     run along a 6.2-unit fuselage, so a 1.4-unit drag arrow is entirely inside
     the aeroplane — its label has to clear the nose or tail, not the arrowhead,
     or it lands on the fuselage and reads as nothing.

     LABEL_MAX is what the camera can hold around the aircraft. Arrows are free to
     grow past it — their length IS the measurement, and lift transiently reaches
     1.35 W during rotation — but a label that leaves the panel names nothing, so
     the annotation rides the shaft rather than the arrowhead when it has to.
     PERP nudges each label off its own line so it stays readable there. */
  const LABEL_MAX = 5.6;
  const perp = new THREE.Vector3();

  function setArrow(a, lbl, dir, magnitude, clear) {
    const len = Math.max(0.001, magnitude * SCALE);
    a.setDirection(dir);
    a.setLength(len, Math.min(0.9, len * 0.26), Math.min(0.5, len * 0.16));
    const on = magnitude > W * 0.02;
    a.visible = on;
    lbl.visible = on;
    perp.set(-dir.y, dir.x, 0);
    lbl.position.copy(dir)
      .multiplyScalar(Math.min(Math.max(len, clear) + 1.25, LABEL_MAX))
      .addScaledVector(perp, 0.85);
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    controls.throttle = thr ? thr.value / 100 : 0;
    controls.elevator = ele ? ele.value / 100 : 0;
    controls.aileron = ail ? ail.value / 100 : 0;
    controls.rudder = rud ? rud.value / 100 : 0;

    /* The autopilot is a loop, not a cheat: it reads the same altitude the HUD
       shows, and its only power is to move the same elevator the learner moves.
       Two nested loops, which is exactly the block diagram the chapter draws —
       the outer one turns a height error into a target attitude, the inner one
       flies that attitude. One loop straight onto the elevator cannot work now
       that the elevator commands a moment rather than a rate: it would be
       driving an acceleration with a position error, and it would hunt. */
    if (apOn && !s.onGround) {
      const err = ctx.target - s.h;
      const wantTheta = Math.max(-0.16, Math.min(0.16, err * 0.02));
      controls.elevator = Math.max(-1, Math.min(1, (wantTheta - s.theta) * 4 - s.q * 2.2));
      ele.value = Math.round(controls.elevator * 100);
      ctx.apHeld = Math.abs(err) < 6 ? ctx.apHeld + dt : 0;
    }
    ctx.elevator = controls.elevator;
    ctx.aileron = controls.aileron;
    ctx.rudder = controls.rudder;

    const r = step(s, controls, dt, ac);
    s = r.state;
    const f = r.forces;

    plane.position.set(s.x, s.h + 0.95, s.y);
    // Yaw, then pitch, then roll — the aerospace 3-2-1 sequence.
    plane.rotation.set(s.phi, -s.psi, s.theta, "YZX");
    plane.updateMatrixWorld();

    /* The bandit: the same step(), the same dt, its own aircraft and its own
       law. One aeroplane's physics run twice, not an animation played beside
       one. The law sees the state before the step and the aircraft it is
       flying — never a constant belonging to some other aeroplane. */
    if (bs) {
      const br = step(bs, task.bandit.law(bs, bac, dt), dt, bac);
      bs = br.state; bf = br.forces;
      foe.position.set(bs.x, bs.h + 0.95, bs.y);
      foe.rotation.set(bs.phi, -bs.psi, bs.theta, "YZX");
      // Range, aspect, closure and angle off, from the two states and nothing
      // else. Set before track() and the readouts, both of which may read it.
      ctx.bandit = bs; ctx.banditF = bf; ctx.geo = relative(s, bs);
    }

    // Lift is perpendicular to the flight path; weight is always earth-down.
    const up = new THREE.Vector3(-Math.sin(s.gamma), Math.cos(s.gamma), 0);
    const fwd = new THREE.Vector3(Math.cos(s.gamma - s.theta), Math.sin(s.gamma - s.theta), 0);
    /* Weight is resolved through the aircraft's full attitude rather than pitch
       alone. The arrows are children of the airframe, so once it can bank, a
       weight vector un-rotated by θ only would lean over with the wings — and
       weight is the one force that never does. */
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(
      plane.quaternion.clone().invert());
    const DIR = {
      lift: [up, f.L, 1.9],
      weight: [down, f.W, 1.5],
      thrust: [fwd, f.T, 3.4],
      /* Aerodynamic drag only. Rolling friction also retards the aircraft, but it
         is not one of the four forces the lesson names, and showing 196 N of
         "drag" at zero airspeed would teach the opposite of what lesson 1 says. */
      drag: [fwd.clone().negate(), f.D, 3.4],
    };
    for (const k of wanted) {
      if (task.arrows.includes(k)) setArrow(arrows[k], labels[k], ...DIR[k]);
      else { arrows[k].visible = false; labels[k].visible = false; }
    }

    /* Track altitude one-for-one so the aircraft is always framed, and look at
       the aeroplane rather than below it: the earlier downward bias held the
       runway in shot at the cost of pushing the lift arrow — the one force this
       sandbox exists to demonstrate — off the top of the panel. Once the runway
       has left the frame, altitude is the HUD's job. */
    if (bs) {
      /* Two aeroplanes will not both sit large in one frame and no camera can
         make them: they are six metres long and they fight three hundred metres
         apart, and the only ways to "fix" that are to draw the bandit bigger
         than he is or to shrink the aeroplane you fly to a smudge. Both are
         lies, and the first is the exact lie this project may not tell.

         So the shot is taken from over your own shoulder, along the line of
         sight to him: back off the aeroplane you fly by the same distance Part I
         uses and a little above it, then look down the sightline. Your aircraft
         sits low in the frame at the size it always is; the bandit sits near the
         middle at whatever size his range gives him — an aeroplane at a hundred
         metres, a mark at half a mile, and nothing at two. That last one is not
         a failure of the camera. It is the reason the readout exists, and it is
         what the chapter is teaching: past visual range you fly the numbers.

         It also holds him in frame wherever he goes, which the Part I camera
         cannot — that one watches the aeroplane from the side, so anything
         ahead of the nose is already outside the cone. */
      /* 30 back and 10 up, aiming 60 along. The three numbers are one choice:
         they put your own aircraft about nine degrees below the sightline and
         anything distant about nine above it, which is just enough to keep your
         own wing off the bandit. At 17 m and 5 m — the Part I stand-off, tried
         first — your own airframe subtends twenty degrees and sits squarely on
         top of him. */
      const L = new THREE.Vector3(bs.x - s.x, bs.h - s.h, bs.y - s.y);
      if (L.lengthSq() < 1) L.set(1, 0, 0);
      L.normalize();
      camera.position.set(s.x - L.x * 30, s.h + 10 - L.y * 30, s.y - L.z * 30);
      camera.lookAt(s.x + L.x * 60, s.h + 1.1 + L.y * 60, s.y + L.z * 60);
    } else {
      /* The camera rides in the aircraft's own heading frame, so it stays behind
         and to the side through a turn instead of being left pointing down the
         runway while the aeroplane flies off sideways. */
      const cf = Math.cos(s.psi), sf = Math.sin(s.psi);
      camera.position.set(
        s.x - 7 * cf - 15 * sf,
        s.h + 2.4,
        s.y - 7 * sf + 15 * cf);
      camera.lookAt(s.x, s.h + 1.1, s.y);
    }

    const surf = (v, max) => `${v > 0 ? "+" : ""}${(v * max * 57.2958).toFixed(1)}°`;
    if (thr) $("sb-thr-o").textContent = `${thr.value}%`;
    // Control surfaces read in degrees of actual travel, with their unit.
    if (ele) $("sb-ele-o").textContent = surf(ele.value / 100, ac.dEmax);
    if (ail) $("sb-ail-o").textContent = surf(ail.value / 100, ac.dAmax);
    if (rud) $("sb-rud-o").textContent = surf(rud.value / 100, ac.dRmax);
    // track() runs after the step, so it sees the state the readouts report.
    task.track?.(s, f, ctx, dt);
    task.readout.forEach((r, n) => { $("sb-r" + n).textContent = r.get(s, f, ctx); });
    $("sb-v").textContent = Math.round(s.V * 1.944);
    $("sb-h").textContent = Math.round(s.h * 3.281);

    /* The goal latches. It is a thing you did, not a state you are currently in
       — stalling and recovering still means you found the stall. */
    if (!goalMet && task.goal?.test(s, f, ctx)) {
      goalMet = true;
      goalEl.textContent = task.goal.done;
      goalEl.hidden = false;
      if (sequence) {
        passed.push(task.name);
        const last = stage === sequence.length - 1;
        const go = document.createElement("button");
        go.type = "button";
        go.className = "exam__next";
        go.innerHTML = last
          ? `<span>Finish the checkride</span>`
          : `<span>Pass — next item</span>`;
        go.onclick = () => {
          if (last) return onDone?.(passed, true);
          stage += 1;
          loadTask(sequence[stage]);
        };
        goalEl.after(go);
      }
      /* Banked the moment it is met, in both modes, and after the push so the
         count includes this item. On a lesson it marks the chapter's flying
         step; on a checkride it means quitting at item four of seven keeps the
         four — this used to be written only from the finish button, so anyone
         who left partway through scored nothing. The second argument says
         whether the ride is over, which is the only thing the caller cannot
         work out for itself. */
      onDone?.(passed, false);
    }
    $("sb-state").textContent = s.onGround
      ? (f.L > f.W * 0.9 ? "about to fly" : "on the ground")
      : f.alpha > ac.aStall ? "STALLED" : "flying";

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  /* The panel is deeper than a 16:9 strip on purpose: the four forces are a
     vertical composition, and a letterbox crops the top and bottom arrows first.
     setSize must update the element style too — pinning the height in CSS and
     the buffer here disagreed, and the render came out stretched. */
  function resize() {
    const w = host.clientWidth || 640;
    const h = Math.max(300, Math.min(440, Math.round(w * 0.52)));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  raf = requestAnimationFrame(frame);

  return function teardown() {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    dispose(scene);
    renderer.dispose();
  };
}
