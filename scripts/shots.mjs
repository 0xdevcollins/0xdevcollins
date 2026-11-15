// Refreshes the product screenshots in assets/shots from the live sites, then you run `npm run render`.
//   node scripts/shots.mjs              every product in profile.config.mjs
//   node scripts/shots.mjs useroutr     just one
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { products } from '../profile.config.mjs';

const run = promisify(execFile);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const only = process.argv.slice(2);

for (const p of products.filter((p) => !only.length || only.includes(p.id))) {
  await run(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=2', '--window-size=1440,900', '--virtual-time-budget=8000',
    `--user-data-dir=${path.join(os.tmpdir(), 'profile-shots')}`,
    `--screenshot=${path.join(root, 'assets', 'shots', p.shot)}`, p.url,
  ], { timeout: 90_000 });
  console.log('captured', p.id, p.url);
}
