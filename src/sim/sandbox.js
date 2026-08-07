/* The apply-it surface. The same four arrows the lesson drew as a figure, now
 * attached to an aircraft you fly, sized every frame by src/sim/flight-model.js.
 *
 * Only lesson 1 ships one this pass — deliberately, so the pattern's real cost
 * is known before it is committed to twelve times. */

import * as THREE from "three";
import { AIRCRAFT, G, initialState, step, forces, stallSpeed } from "./flight-model.js";
import { TASKS } from "./tasks.js";
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
 */
function buildAircraft() {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: css("--ink-2", "#454b55") });
  const solid = new THREE.MeshBasicMaterial({ color: css("--paper-sunk", "#eceae5") });

  const add = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, solid);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), mat);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation);
    g.add(mesh, edges);
  };

  add(new THREE.CylinderGeometry(0.42, 0.30, 6.2, 10), 0, 0, 0, 0, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(1.5, 0.14, 10.4), 0.2, 0.46, 0);        // high wing
  add(new THREE.BoxGeometry(1.0, 0.10, 3.6), -2.7, 0.30, 0);        // tailplane
  add(new THREE.BoxGeometry(0.9, 1.5, 0.10), -2.8, 0.95, 0);        // fin
  add(new THREE.BoxGeometry(0.10, 1.7, 0.10), 3.05, 0, 0);          // prop disc edge
  add(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 8), 0.5, -0.72, 1.0, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 8), 0.5, -0.72, -1.0, 0, 0, Math.PI / 2);
  return g;
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

  const plane = buildAircraft();
  scene.add(plane);

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
    elevator: { id: "ele", label: "Elevator", min: -100, lo: "−23°", hi: "+23°" },
    aileron: { id: "ail", label: "Aileron", min: -100, lo: "−20°", hi: "+20°" },
    rudder: { id: "rud", label: "Rudder", min: -100, lo: "−16°", hi: "+16°" },
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
        return `<div class="ctl">
          <label for="sb-${a.id}">${a.label}</label>
          <div class="scale"><span>${a.lo}</span>
            <div class="track"><input id="sb-${a.id}" type="range" min="${a.min}" max="100" value="0"></div>
            <span>${a.hi}</span></div>
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
    `<span>Vs <b>${(stallSpeed() * 1.944).toFixed(0)}</b> kt</span>` +
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

  /* ── loop ── */
  let s = task.start ? task.start() : initialState();
  const controls = { throttle: 0, elevator: 0 };
  let raf = 0, last = performance.now(), alive = true;

  /* Context the readouts and the goal are allowed to see beyond the raw state:
     derived numbers, and whatever the chapter's own apparatus is tracking. */
  let ctx = { vs: stallSpeed(), target: task.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
  let apOn = false;
  let goalMet = false;
  buildPanel();

  /* Each checkride item starts clean — its own aircraft state, its own context,
     its own controls centred. Failing item six must not cost you items one to
     five, so nothing carries across but the fact that you passed. */
  function loadTask(next) {
    task = next;
    goalMet = false;
    ctx = { vs: stallSpeed(), target: task.autopilot?.target ?? 0, elevator: 0, apHeld: 0 };
    s = task.start ? task.start() : initialState();
    buildPanel();
  }

  const W = AIRCRAFT.m * G;
  /* Arrow lengths are scaled against weight, so "longer than weight" is literally
     what you see — the figure's whole point, made physical. A weight arrow of 4.6
     units against a 6.2-unit fuselage keeps the pair legible together; longer and
     the lift arrow and its label leave the top of the panel. */
  const SCALE = 4.6 / W;

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

    const r = step(s, controls, dt);
    s = r.state;
    const f = r.forces;

    plane.position.set(s.x, s.h + 0.95, s.y);
    // Yaw, then pitch, then roll — the aerospace 3-2-1 sequence.
    plane.rotation.set(s.phi, -s.psi, s.theta, "YZX");
    plane.updateMatrixWorld();

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
    /* The camera rides in the aircraft's own heading frame, so it stays behind
       and to the side through a turn instead of being left pointing down the
       runway while the aeroplane flies off sideways. */
    const cf = Math.cos(s.psi), sf = Math.sin(s.psi);
    camera.position.set(
      s.x - 7 * cf - 15 * sf,
      s.h + 2.4,
      s.y - 7 * sf + 15 * cf);
    camera.lookAt(s.x, s.h + 1.1, s.y);

    const surf = (v, max) => `${v > 0 ? "+" : ""}${(v * max * 57.2958).toFixed(1)}°`;
    if (thr) $("sb-thr-o").textContent = `${thr.value}%`;
    // Control surfaces read in degrees of actual travel, with their unit.
    if (ele) $("sb-ele-o").textContent = surf(ele.value / 100, AIRCRAFT.dEmax);
    if (ail) $("sb-ail-o").textContent = surf(ail.value / 100, AIRCRAFT.dAmax);
    if (rud) $("sb-rud-o").textContent = surf(rud.value / 100, AIRCRAFT.dRmax);
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
      : f.alpha > AIRCRAFT.aStall ? "STALLED" : "flying";

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
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      // Sprite labels carry a CanvasTexture, which the material does not free.
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose(); });
    });
    renderer.dispose();
  };
}
