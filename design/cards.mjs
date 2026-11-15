// Card templates. Each card is a small HTML page that scripts/render.mjs screenshots
// at 2x into assets/<theme>/<id>. Copy and colors come from profile.config.mjs.
//
// The system: every section is one sheet from a drawing set. Drafting grid, registration
// marks, a header strip with the sheet number, serif display type, mono annotations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { person, themes, products, more, stack, contacts, sheets } from '../profile.config.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sheetNo = (n) => `Sheet ${pad(n)} / ${pad(sheets.total)}`;

const arrow = (size = 14) =>
  `<svg class="arrow" width="${size}" height="${size}" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M3 11L11 3M4.5 3H11v6.5"/></svg>`;

// Registration marks in the four corners.
const marks = () => ['tl', 'tr', 'bl', 'br'].map((c) => `<i class="reg ${c}"></i>`).join('');

function base(theme, w, h, css, body) {
  const t = themes[theme];
  const vars = Object.entries(t).map(([k, v]) => `--${k}:${v};`).join('');
  const pvars = products.map((p) => `--${p.id}:${p.color[theme]};`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Instrument Serif';src:url(../fonts/instrument-serif-latin-400-normal.woff);font-style:normal}
@font-face{font-family:'Instrument Serif';src:url(../fonts/instrument-serif-latin-400-italic.woff);font-style:italic}
@font-face{font-family:Geist;src:url(../fonts/geist-latin-400-normal.woff);font-weight:400}
@font-face{font-family:Geist;src:url(../fonts/geist-latin-500-normal.woff);font-weight:500}
@font-face{font-family:'Geist Mono';src:url(../fonts/geist-mono-latin-500-normal.woff);font-weight:500}
:root{${vars}${pvars}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:var(--bg)}
body{-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.card{position:relative;width:${w}px;height:${h}px;overflow:hidden;color:var(--text);font-family:Geist,sans-serif;
  border:1px solid var(--lineStrong);background-color:var(--bg);
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:24px 24px;background-position:-1px -1px}
.label{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.display{font-family:'Instrument Serif',serif;font-weight:400;letter-spacing:-.01em;line-height:.9}
.it{font-style:italic}
.sq{display:inline-block;width:8px;height:8px;margin-right:10px}
.strip{position:absolute;z-index:1;left:0;right:0;top:0;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;border-bottom:1px solid var(--line);background:var(--bg)}
.strip b{font-weight:500}
.reg{position:absolute;z-index:2;width:11px;height:11px}
.reg::before,.reg::after{content:'';position:absolute;background:var(--faint)}
.reg::before{left:5px;top:0;width:1px;height:11px}
.reg::after{top:5px;left:0;height:1px;width:11px}
.reg.tl{left:12px;top:12px}.reg.tr{right:12px;top:12px}.reg.bl{left:12px;bottom:12px}.reg.br{right:12px;bottom:12px}
.arrow{flex:none}
${css}
</style></head><body>${body}</body></html>`;
}

// ---------------------------------------------------------------- hero
// Name on the left, a system diagram on the right: each product wired into Stellar.
function hero(theme) {
  const W = 960, H = 560;
  const NODE_H = 56, GAP = 14, TOP = 30, NODE_W = 248, BUS = 300;
  const baseY = TOP + products.length * (NODE_H + GAP) + 10;
  const nodes = products.map((p, i) => {
    const y = TOP + i * (NODE_H + GAP);
    return `<div class="node" style="top:${y}px">
      <div class="nrow"><span class="nname"><i class="sq" style="background:var(--${p.id})"></i>${esc(p.name)}</span><span class="label nnum">${pad(i + 1)}</span></div>
      <span class="label nrole">${esc(p.index)}</span>
    </div>`;
  }).join('');
  const midY = (i) => TOP + i * (NODE_H + GAP) + NODE_H / 2;
  const wires = products.map((p, i) =>
    `<path d="M${NODE_W} ${midY(i)}H${BUS}"/><circle cx="${BUS}" cy="${midY(i)}" r="3" class="dot"/><rect x="${NODE_W - 3}" y="${midY(i) - 3}" width="6" height="6" style="fill:var(--${p.id});stroke:none"/>`).join('');
  const svg = `<svg class="wires" width="330" height="${baseY + 60}" viewBox="0 0 330 ${baseY + 60}">
    ${wires}<path d="M${BUS} ${midY(0)}V${baseY - 7}"/><path d="M${BUS - 5} ${baseY - 9}L${BUS} ${baseY - 1}L${BUS + 5} ${baseY - 9}Z" class="dot"/></svg>`;

  const cells = [
    ['Role', person.role],
    ['Discipline', person.discipline],
    ['Based in', person.location],
    ['Sheet', `${pad(sheets.hero)} of ${pad(sheets.total)}`],
  ];
  const [a, b] = person.line.split(/(?<=Stellar\.)\s/);
  const css = `
.name{position:absolute;left:38px;top:86px;font-size:128px;display:flex;flex-direction:column}
.line{position:absolute;left:40px;top:350px;width:440px;font-size:18px;line-height:1.5;color:var(--muted)}
.line b{color:var(--text);font-weight:500}
.diagram{position:absolute;left:590px;top:98px;width:330px;height:340px}
.diagram>.label{position:absolute;left:0;top:0}
.node{position:absolute;left:0;width:${NODE_W}px;height:${NODE_H}px;padding:10px 14px;border:1px solid var(--lineStrong);background:var(--panel)}
.nrow{display:flex;justify-content:space-between;align-items:center}
.nname{font-size:16.5px;font-weight:500;letter-spacing:-.01em;display:flex;align-items:center}
.nnum{color:var(--faint)}
.nrole{display:block;margin-top:7px;font-size:9.5px;padding-left:18px}
.wires{position:absolute;left:0;top:0;fill:none;stroke:var(--lineStrong);stroke-width:1}
.wires .dot{fill:var(--text);stroke:none}
.base{position:absolute;left:0;width:330px;top:${baseY}px;height:54px;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.base .display{font-size:30px;line-height:1}
.base .label{color:var(--bg);opacity:.7}
.tblock{position:absolute;left:0;right:0;bottom:0;height:72px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--lineStrong);background:var(--bg)}
.tblock div{padding:15px 22px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.tblock div:first-child{border-left:0;padding-left:40px}
.tblock b{font-weight:500;font-size:15.5px;letter-spacing:-.005em}
`;
  const body = `<div class="card">
  ${marks()}
  <div class="strip"><span class="label"><i class="sq" style="background:var(--text)"></i>0xdevcollins &nbsp;/&nbsp; Profile</span><span class="label">${esc(person.strapline)}</span></div>
  <h1 class="display name"><span>${esc(person.first)}</span><span class="it">${esc(person.last)}</span></h1>
  <p class="line"><b>${esc(a)}</b> ${esc(b ?? '')}</p>
  <div class="diagram">
    <span class="label">Now shipping</span>
    ${svg}${nodes}
    <div class="base"><span class="display it">Stellar</span><span class="label">Network</span></div>
  </div>
  <div class="tblock">${cells.map(([k, v]) => `<div><span class="label">${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
</div>`;
  return { W, H, html: base(theme, W, H, css, body) };
}

// ---------------------------------------------------------------- product sheet
// Text on one side, the live site on a tinted panel on the other. Sides alternate.
function productSheet(p, i, theme) {
  const W = 960, H = p.rows ? 560 : 420;
  const flip = i % 2 === 1;
  const shotFile = path.join(root, 'assets', 'shots', p.shot);
  const taken = fs.statSync(shotFile).mtime;
  const caption = `${p.host} · captured ${MONTHS[taken.getMonth()]} ${taken.getFullYear()}`;
  const rows = (p.rows || []).map(([k, v], j) =>
    `<div class="mrow"><span class="label">${String.fromCharCode(65 + j)}</span><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
  const css = `
.card{--accent:var(--${p.id})}
.strip .fig{color:var(--accent)}
.text{position:absolute;top:48px;bottom:0;${flip ? 'right' : 'left'}:0;width:470px;padding:34px 40px}
.title{font-size:84px}
.body{margin-top:16px;font-size:16px;line-height:1.55;color:var(--muted);max-width:390px}
.mods{margin-top:22px;border-top:1px solid var(--lineStrong)}
.mrow{display:grid;grid-template-columns:26px 130px 1fr;align-items:center;height:34px;border-bottom:1px solid var(--line)}
.mrow .label{color:var(--faint)}
.mrow b{font-weight:500;font-size:14.5px}
.mrow span:last-child{font-size:14px;color:var(--muted);text-align:right}
.spec{position:absolute;left:40px;right:40px;bottom:36px;border:1px solid var(--lineStrong);background:var(--bg)}
.spec div{display:grid;grid-template-columns:70px 1fr;align-items:center;height:42px;padding:0 14px}
.spec div+div{border-top:1px solid var(--line)}
.spec .v{font-size:14px}
.spec .go{display:flex;align-items:center;justify-content:space-between;font-family:'Geist Mono',monospace;font-size:13px;letter-spacing:.02em;color:var(--accent)}
.spec .link{box-shadow:inset 3px 0 0 var(--accent)}
.panel{position:absolute;top:48px;bottom:0;${flip ? 'left' : 'right'}:0;width:490px;${flip ? 'border-right' : 'border-left'}:1px solid var(--line);
  background-color:color-mix(in srgb,var(--accent) 9%,var(--bg));
  background-image:linear-gradient(color-mix(in srgb,var(--accent) 16%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--accent) 16%,transparent) 1px,transparent 1px);
  background-size:24px 24px;background-position:-1px -1px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px}
.shot{position:relative;width:404px;margin-left:-10px}
.shot img{display:block;width:100%;border:1px solid color-mix(in srgb,var(--accent) 45%,#000);box-shadow:10px 10px 0 var(--accent)}
.crop{position:absolute;width:12px;height:12px;border-color:var(--text);border-style:solid;border-width:0;opacity:.55}
.crop.tl{left:-9px;top:-9px;border-left-width:1px;border-top-width:1px}
.crop.tr{right:-9px;top:-9px;border-right-width:1px;border-top-width:1px}
.crop.bl{left:-9px;bottom:-9px;border-left-width:1px;border-bottom-width:1px}
.crop.br{right:-9px;bottom:-9px;border-right-width:1px;border-bottom-width:1px}
.panel .label{color:var(--text);opacity:.7}
`;
  const body = `<div class="card">
  ${marks()}
  <div class="strip"><span class="label"><i class="sq" style="background:var(--accent)"></i><b class="fig">Fig. ${pad(i + 1)}</b> &nbsp; ${esc(p.kicker)}</span><span class="label">${sheetNo(sheets[p.id])}</span></div>
  <div class="text">
    <h2 class="display title">${esc(p.name)}</h2>
    <p class="body">${esc(p.body)}</p>
    ${rows ? `<div class="mods">${rows}</div>` : ''}
    <div class="spec">
      <div><span class="label">Stack</span><span class="v">${p.tags.map(esc).join(' · ')}</span></div>
      <div class="link"><span class="label">Visit</span><span class="go">${esc(p.host)} ${arrow(13)}</span></div>
    </div>
  </div>
  <div class="panel">
    <div class="shot"><img src="../../assets/shots/${p.shot}" alt="">${['tl', 'tr', 'bl', 'br'].map((c) => `<i class="crop ${c}"></i>`).join('')}</div>
    <span class="label">${esc(caption)}</span>
  </div>
</div>`;
  return { W, H, html: base(theme, W, H, css, body) };
}

// ---------------------------------------------------------------- small sheets
function mini(m, j, theme) {
  const W = 474, H = 210;
  const lab = m.label === 'Lab';
  const css = `
.card{padding:26px 30px}
.head{display:flex;justify-content:space-between;align-items:center}
.head .sq{border:1.5px solid var(--text);background:${lab ? 'transparent' : 'var(--text)'}}
.head .r{display:flex;align-items:center;gap:10px;color:var(--muted)}
.title{font-size:44px;margin:18px 0 10px}
.body{font-size:14.5px;line-height:1.5;color:var(--muted);max-width:405px}
.tags{position:absolute;left:30px;bottom:24px;color:var(--faint)}
`;
  const body = `<div class="card">
  ${marks()}
  <div class="head"><span class="label"><i class="sq"></i>${esc(lab ? 'Lab build' : 'Thirtn product')}</span><span class="r"><span class="label">${pad(sheets.more)}.${j + 1}</span>${arrow(14)}</span></div>
  <h3 class="display title">${esc(m.name)}</h3>
  <p class="body">${esc(m.body)}</p>
  <span class="label tags">${m.tags.map(esc).join(' &nbsp;/&nbsp; ')}</span>
</div>`;
  return { W, H, html: base(theme, W, H, css, body) };
}

// ---------------------------------------------------------------- bill of materials
// Which projects use each layer of the stack, read from the project tags.
const ALIASES = { Stellar: ['Soroban'] };
export function usedIn(parts) {
  const want = new Set(parts.flatMap((x) => [x, ...(ALIASES[x] ?? [])]).map((x) => x.toLowerCase()));
  return [...products, ...more].filter((it) => it.tags.some((t) => want.has(t.toLowerCase())));
}

function stackCard(theme) {
  const W = 960, H = 440;
  const rows = stack.map(([layer, parts], i) => {
    const users = usedIn(parts).map((it) => {
      const isProduct = products.includes(it);
      return `<span class="u"><i class="sq" style="${isProduct ? `background:var(--${it.id})` : 'border:1.5px solid var(--muted)'}"></i>${esc(it.name)}</span>`;
    }).join('');
    return `<div class="row"><span class="label n">${pad(i + 1)}</span><b>${esc(layer)}</b><span class="parts">${parts.map(esc).join(', ')}</span><span class="users">${users || '<span class="label">Lab</span>'}</span></div>`;
  }).join('');
  const css = `
.title{position:absolute;left:38px;top:76px;font-size:48px}
.table{position:absolute;left:40px;right:40px;top:146px}
.row{display:grid;grid-template-columns:44px 120px 1fr 300px;gap:0 18px;align-items:center;min-height:54px;padding:10px 0;border-bottom:1px solid var(--line)}
.head{min-height:30px;padding:0;border-bottom:1px solid var(--lineStrong)}
.n{color:var(--faint)}
.row b{font-weight:500;font-size:15px}
.parts{font-size:15px;line-height:1.5}
.users{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px;color:var(--muted)}
.u{display:inline-flex;align-items:center}
.u .sq{margin-right:7px;width:7px;height:7px}
`;
  const body = `<div class="card">
  ${marks()}
  <div class="strip"><span class="label"><i class="sq" style="background:var(--text)"></i>Stack</span><span class="label">${sheetNo(sheets.stack)}</span></div>
  <h2 class="display title">Bill of <span class="it">materials</span></h2>
  <div class="table">
    <div class="row head"><span class="label">No.</span><span class="label">Layer</span><span class="label">Parts</span><span class="label">Used in</span></div>
    ${rows}
  </div>
</div>`;
  return { W, H, html: base(theme, W, H, css, body) };
}

// ---------------------------------------------------------------- contacts
function contact(c, theme) {
  const W = 312, H = 76;
  const css = `
.card{padding:0 22px;display:flex;align-items:center;justify-content:space-between}
.label{display:block;font-size:10px;margin-bottom:7px}
b{font-weight:500;font-size:17px;letter-spacing:-.01em}
.arrow{color:var(--muted)}
`;
  const body = `<div class="card"><div><span class="label">${esc(c.label)}</span><b>${esc(c.handle)}</b></div>${arrow(16)}</div>`;
  return { W, H, html: base(theme, W, H, css, body) };
}

// Every card the renderer produces: id -> (theme) => { W, H, html }
export const cards = {
  hero,
  ...Object.fromEntries(products.map((p, i) => [p.id, (t) => productSheet(p, i, t)])),
  ...Object.fromEntries(more.map((m, j) => [`more-${m.id}`, (t) => mini(m, j, t)])),
  stack: stackCard,
  ...Object.fromEntries(contacts.map((c) => [`c-${c.id}`, (t) => contact(c, t)])),
};
