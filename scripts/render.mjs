// Renders every card in design/cards.mjs to assets/<theme>/<id>.webp at 2x, using headless Chrome.
// Cards are saved as lossless WebP when cwebp is installed (brew install webp): same pixels,
// about 60% smaller than PNG. Without it they stay PNG, and the README follows whichever exists.
//   node scripts/render.mjs              all cards, both themes
//   node scripts/render.mjs hero stack   only these cards
// Set CHROME=/path/to/chrome if Chrome is not in the default macOS location.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cards } from '../design/cards.mjs';
import { buildReadme } from './readme.mjs';

const run = promisify(execFile);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outHtml = path.join(root, 'design', '.out');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THEMES = ['dark', 'light'];
const WEBP = (() => { try { execFileSync('cwebp', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

const only = process.argv.slice(2);
const ids = Object.keys(cards).filter((id) => !only.length || only.includes(id));
fs.mkdirSync(outHtml, { recursive: true });

const jobs = ids.flatMap((id) => THEMES.map((theme) => ({ id, theme })));

async function render({ id, theme }, worker) {
  const { W, H, html } = cards[id](theme);
  const file = path.join(outHtml, `${theme}-${id}.html`);
  fs.writeFileSync(file, html);
  const png = path.join(root, 'assets', theme, `${id}.png`);
  const webp = png.replace(/\.png$/, '.webp');
  const shot = WEBP ? path.join(os.tmpdir(), `profile-render-${theme}-${id}.png`) : png;
  fs.mkdirSync(path.dirname(png), { recursive: true });
  await run(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=2', `--window-size=${W},${H}`,
    '--default-background-color=00000000', '--virtual-time-budget=3000',
    `--user-data-dir=${path.join(os.tmpdir(), `profile-render-${worker}`)}`,
    `--screenshot=${shot}`, pathToFileURL(file).href,
  ], { timeout: 60_000 });
  if (WEBP) {
    await run('cwebp', ['-quiet', '-lossless', '-z', '9', shot, '-o', webp]);
    fs.rmSync(shot);
    fs.rmSync(png, { force: true });
  } else fs.rmSync(webp, { force: true });
  console.log(`  ${theme.padEnd(5)} ${id} (${W * 2}x${H * 2})`);
}

const queue = [...jobs];
await Promise.all([0, 1, 2, 3].map(async (w) => {
  while (queue.length) await render(queue.shift(), w);
}));
console.log(`rendered ${jobs.length} images as ${WEBP ? 'lossless WebP' : 'PNG'}`);
if (!only.length) {
  fs.writeFileSync(path.join(root, 'README.md'), buildReadme());
  console.log('wrote README.md');
}
