/* The mark: a plan-view aircraft strung down a dash-dot assembly axis — an
 * exploded parts drawing, reduced until only the convention is left.
 *
 * The subject of this course is not really aerodynamics, it is a method: the
 * index headline is "Flight dynamics, taken apart", the home page IS an exploded
 * drawing, and the whole world is an illustrated parts catalogue. A wing section
 * or a centre-of-gravity roundel says "aviation" and stops there; parts hung off
 * a centreline say taken apart, which is the thing being sold.
 *
 * The dash-dot line is doing the work. It is the drafting convention for an
 * assembly axis, and it is what stops four rectangles reading as a bar chart.
 *
 * Square corners, because every other container in this system has them. Drawn
 * from geometry so it inherits ink, survives the negative plate, and costs
 * nothing at any size.
 */

const PARTS = [
  { x: 10.9, y: 2.6, w: 2.2, h: 2.6 },     // nose
  { x: 2.5, y: 7.4, w: 19, h: 2.5 },       // wing
  { x: 10.4, y: 12.2, w: 3.2, h: 4.2 },    // fuselage
  { x: 6.8, y: 18.7, w: 10.4, h: 2 },      // tailplane
];
const rects = (p) => p.map((r) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="currentColor"/>`).join("");

/** @param {{size?:number, cls?:string}} opts */
export function logoSvg({ size = 22, cls = "logo" } = {}) {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" aria-hidden="true" focusable="false">
    <line x1="12" y1="0.8" x2="12" y2="23.2" stroke="currentColor" stroke-width="1"
      stroke-dasharray="3.6 1.5 0.9 1.5" opacity=".65"/>
    ${rects(PARTS)}
  </svg>`;
}

/* A favicon renders outside the page, so currentColor has nothing to inherit —
   it carries explicit fills and its own prefers-color-scheme block. The nose and
   the dashes are dropped and the remaining parts thickened: at 16px a 2.2px
   block and a dash-dot pattern both close up into mush. */
export function faviconDataUri() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<style>` +
    `.m{fill:#14171c;stroke:#14171c}` +
    `@media(prefers-color-scheme:dark){.m{fill:#eceae5;stroke:#eceae5}}` +
    `</style>` +
    `<line class="m" x1="12" y1="2" x2="12" y2="22" stroke-width="1.3" opacity=".55"/>` +
    `<rect class="m" stroke="none" x="2" y="7" width="20" height="3"/>` +
    `<rect class="m" stroke="none" x="10.1" y="12.4" width="3.8" height="4.4"/>` +
    `<rect class="m" stroke="none" x="6.4" y="19" width="11.2" height="2.4"/>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
