#!/usr/bin/env node
/* Does the bandit obey the same physics the player does?
 *
 * The sandbox's governing rule is that it may never mime physics it is not
 * computing. A second aeroplane is exactly where that rule is easiest to break
 * and hardest to notice: a scripted path looks completely convincing right up
 * until a reader asks it to do something impossible and it obliges.
 *
 * So these assert the things a fake could not do. They are cheap, they run in
 * `npm run check`, and if one ever fails the honest response is to fix the
 * bandit rather than the threshold.
 */

import { AIRCRAFT, FIGHTER, G, step, trim } from "../src/sim/flight-model.js";
import { holdTurn } from "../src/sim/tasks.js";
import { forces } from "../src/sim/flight-model.js";

const DT = 1 / 120;
const deg = (r) => (r * 180) / Math.PI;

/* Fly a bank command and report what the aeroplane actually did with it. */
function fly(bankDeg, ac, { V = 200, h = 4000, secs = 25 } = {}) {
  const law = holdTurn(bankDeg, V);
  let s = { ...trim(V, ac).state, h };
  let peakN = 0, peakPhi = 0;
  const h0 = s.h;
  for (let i = 0; i < secs / DT; i++) {
    const c = law(s, ac, DT);
    s = step(s, c, DT, ac).state;
    const f = forces(s, c, ac);
    if (i > 4 / DT) {                       // let it settle before measuring
      peakN = Math.max(peakN, f.n);
      peakPhi = Math.max(peakPhi, Math.abs(s.phi));
    }
  }
  return { n: peakN, phi: deg(peakPhi), dh: s.h - h0, V: s.V };
}

let failed = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "  pass  " : "  FAIL  "}${label}${detail ? `   ${detail}` : ""}`);
  if (!ok) failed++;
};

console.log("bandit — flown, not scripted");

/* 1. Ask for more than the airframe allows and the AIRFRAME answers, not the
      command. 87° of bank in a level turn wants about 19 g; the placard is 9. */
const hard = fly(87, FIGHTER);
check("fighter refuses a bank it cannot hold",
  hard.n <= FIGHTER.nMax + 0.05,
  `commanded 87° (≈19 g), got ${hard.n.toFixed(2)} g against a ${FIGHTER.nMax} g limit`);

/* 2. And it PAYS for it. A scripted opponent holds its height by definition;
      a computed one at the limiter cannot, because drag there beats thrust. */
check("and loses height doing it",
  hard.dh < -50,
  `${Math.round(hard.dh)} m in ${25} s`);

/* 3. A bank it CAN hold lands on the textbook load factor without anyone
      typing that number anywhere. */
const easy = fly(78, FIGHTER);
const want = 1 / Math.cos((78 * Math.PI) / 180);
check("a bank it can hold pulls 1/cos φ",
  Math.abs(easy.n - want) < 0.15,
  `${easy.n.toFixed(2)} g against 1/cos 78° = ${want.toFixed(2)} g`);

/* 4. The same law in a different aeroplane gets that aeroplane's answer. The
      Cessna has no nMax at all, so what stops it is its own bank clamp. */
const cessna = fly(87, AIRCRAFT, { V: 45, h: 1000 });
check("the Cessna is stopped by its own clamp, not the fighter's limiter",
  Math.abs(cessna.phi - deg(AIRCRAFT.phiMax)) < 1.5 && cessna.n < 4,
  `bank held at ${cessna.phi.toFixed(1)}° (clamp ${deg(AIRCRAFT.phiMax).toFixed(1)}°) at ${cessna.n.toFixed(2)} g`);

/* 5. Straight and level stays straight and level — the law is not secretly
      dragging the aeroplane somewhere. */
const level = fly(0, FIGHTER);
check("bank 0 flies straight and level",
  Math.abs(level.dh) < 60 && level.phi < 1,
  `${Math.round(level.dh)} m, bank ${level.phi.toFixed(2)}°`);

console.log(failed ? `\n${failed} bandit check(s) FAILED` : "\nbandit obeys the model");
process.exit(failed ? 1 : 0);
