// Helpers for self-contained SVGs. GitHub shows README images through <img>, which blocks
// web fonts and scripts, so text becomes vector paths and motion uses SMIL <animate>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'design', 'fonts');

export function font(file) {
  const buf = fs.readFileSync(path.join(fontsDir, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export const r2 = (n) => Math.round(n * 100) / 100;

// Characters the font has no glyph for (emoji, other scripts) are dropped, not drawn as boxes.
const has = (f, ch) => f.charToGlyphIndex(ch) !== 0;

export function measure(f, text, size, ls = 0) {
  let w = 0, n = 0;
  for (const ch of text) if (has(f, ch)) { w += (f.charToGlyph(ch).advanceWidth * size) / f.unitsPerEm + ls * size; n++; }
  return n ? w - ls * size : 0;
}

// Glyph outlines are defined once per document and placed with <use>. A repeated letter
// costs one short tag instead of a full outline, which keeps the SVG small.
let glyphs = new Map();
const fontIds = new WeakMap();
let nextFont = 0;
function glyphRef(f, g) {
  if (!fontIds.has(f)) fontIds.set(f, `f${nextFont++}`);
  const id = `${fontIds.get(f)}g${g.index}`;
  if (!glyphs.has(id)) glyphs.set(id, g.getPath(0, 0, f.unitsPerEm).toPathData(0));
  return id;
}

// Text as a group of glyphs. ls is letter-spacing in em. anchor: start | middle | end.
export function text(f, str, x, y, size, fill, { ls = 0, anchor = 'start', upper = false, attrs = '' } = {}) {
  const s = upper ? str.toUpperCase() : str;
  const w = measure(f, s, size, ls);
  let cx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const k = size / f.unitsPerEm;
  let out = '';
  for (const ch of s) {
    if (!has(f, ch)) continue;
    const g = f.charToGlyph(ch);
    if (g.path.commands.length) out += `<use href="#${glyphRef(f, g)}" x="${Math.round(cx / k)}" y="${Math.round(y / k)}"/>`;
    cx += g.advanceWidth * k + ls * size;
  }
  return `<g fill="${fill}" transform="scale(${+k.toFixed(6)})"${attrs}>${out}</g>`;
}

// Every animation starts at t=0 and holds its start value through `delay`, while the element's
// own attributes hold the finished state. Renderers that skip SMIL show the finished chart, not a blank one.
const hold = (delay, dur) => {
  const total = delay + dur;
  const k = r2(delay / total);
  return { dur: `${r2(total)}s`, times: `0;${k};1`, splines: '0 0 1 1;0.2 0.8 0.2 1' };
};
const anim = (attr, from, to, delay, dur) => {
  const h = hold(delay, dur);
  return `<animate attributeName="${attr}" values="${from};${from};${to}" keyTimes="${h.times}" calcMode="spline" keySplines="${h.splines}" dur="${h.dur}" begin="0s" fill="freeze"/>`;
};

// Fade and rise into place.
export const rise = (inner, delay, dy = 10) => {
  const h = hold(delay, 0.7);
  return `<g>${anim('opacity', 0, 1, delay, 0.7)}` +
    `<animateTransform attributeName="transform" type="translate" values="0 ${dy};0 ${dy};0 0" keyTimes="${h.times}" calcMode="spline" keySplines="${h.splines}" dur="${h.dur}" begin="0s" fill="freeze"/>` +
    `${inner}</g>`;
};

// A bar that grows up from a baseline.
export const growBar = (x, base, w, h, fill, delay, extra = '') =>
  `<rect x="${r2(x)}" y="${r2(base - h)}" width="${r2(w)}" height="${r2(h)}" rx="1.5" fill="${fill}"${extra}>` +
  anim('height', 0, r2(h), delay, 0.8) + anim('y', base, r2(base - h), delay, 0.8) + `</rect>`;

export const wipe = (id, x, y, w, h, delay) =>
  `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}">${anim('width', 0, w, delay, 1.2)}</rect></clipPath>`;

export function doc(w, h, label, body) {
  const defs = [...glyphs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
  glyphs = new Map();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><title>${label}</title><defs>${defs}</defs>${body}</svg>\n`;
}
