// Builds assets/stats-dark.svg and assets/stats-light.svg from live GitHub data.
//   GH_TOKEN=... node scripts/stats.mjs     live (the workflow runs this every 6 hours)
//   node scripts/stats.mjs --sample         offline, from scripts/sample-stats.json
//   node scripts/stats.mjs --save-sample    live, and also refresh the sample file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, products, sheets } from '../profile.config.mjs';
import { font, text, measure, rise, growBar, wipe, doc, r2 } from './lib/svg.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const USER = process.env.GH_USER || '0xdevcollins';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
// Docs and notebooks skew the byte counts without saying much about the code. Edit freely.
const IGNORE_LANGS = new Set(['MDX', 'Jupyter Notebook']);
// Languages are measured over repos pushed to within this window.
const ACTIVE_DAYS = 730;
const sampleFile = path.join(here, 'sample-stats.json');

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors || !json.data) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

const CAL = 'contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}';

async function fetchLive() {
  if (!TOKEN) throw new Error('Set GH_TOKEN (for example: GH_TOKEN=$(gh auth token) npm run stats)');
  const { user } = await gql(
    `query($l:String!){user(login:$l){createdAt contributionsCollection{totalPullRequestContributions ${CAL}}}}`,
    { l: USER },
  );
  const year = user.contributionsCollection;
  const weeks = year.contributionCalendar.weeks.map((w) => ({
    start: w.contributionDays[0].date,
    count: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
  }));

  // Every day since the account was created, for all-time streaks.
  const byDate = new Map();
  const created = new Date(user.createdAt);
  const now = new Date();
  for (let y = created.getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
    const from = new Date(Math.max(created, Date.UTC(y, 0, 1))).toISOString();
    const to = new Date(Math.min(now, Date.UTC(y, 11, 31, 23, 59, 59))).toISOString();
    const d = await gql(`query($l:String!,$f:DateTime!,$t:DateTime!){user(login:$l){contributionsCollection(from:$f,to:$t){${CAL}}}}`, { l: USER, f: from, t: to });
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const day of w.contributionDays) byDate.set(day.date, Math.max(byDate.get(day.date) ?? 0, day.contributionCount));
  }

  const langs = new Map();
  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 864e5);
  for (let after = null; ;) {
    const r = await gql(
      'query($l:String!,$a:String){user(login:$l){repositories(first:100,after:$a,ownerAffiliations:OWNER,isFork:false){pageInfo{hasNextPage endCursor} nodes{pushedAt languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}}}',
      { l: USER, a: after },
    );
    const repos = r.user.repositories;
    // Each active repo counts once, split by its own language mix. Raw byte totals let one
    // repo with vendored CSS outweigh fifty TypeScript repos.
    for (const n of repos.nodes) {
      if (new Date(n.pushedAt) < activeSince) continue;
      const edges = n.languages.edges.filter((e) => !IGNORE_LANGS.has(e.node.name));
      const repoBytes = edges.reduce((s, e) => s + e.size, 0);
      for (const e of edges) {
        const cur = langs.get(e.node.name) ?? { size: 0, color: e.node.color };
        cur.size += e.size / repoBytes;
        langs.set(e.node.name, cur);
      }
    }
    if (!repos.pageInfo.hasNextPage) break;
    after = repos.pageInfo.endCursor;
  }
  const sorted = [...langs].sort((a, b) => b[1].size - a[1].size);
  const total = sorted.reduce((s, [, v]) => s + v.size, 0) || 1;
  const top = sorted.slice(0, 5).map(([name, v]) => ({ name, color: v.color || '#8b949e', pct: (v.size / total) * 100 }));
  const rest = 100 - top.reduce((s, l) => s + l.pct, 0);
  if (rest > 0.05) top.push({ name: 'Other', color: null, pct: rest });

  const merged = await fetchMerged();

  return {
    updated: new Date().toISOString(),
    year: year.contributionCalendar.totalContributions,
    prs: year.totalPullRequestContributions,
    ...streaks([...byDate].map(([date, count]) => ({ date, count }))),
    weeks,
    langs: top,
    merged,
  };
}

// Conventional-commit prefixes become a short type tag. Merge-only PRs (release
// promotions like "merge to prod") are skipped. Private repos never show.
const TYPES = new Set(['feat', 'fix', 'docs', 'chore', 'test', 'refactor', 'perf', 'ci', 'build', 'style', 'revert']);
const TRIVIAL = /^(m+|mer|merg|merge\b.*|.*\bmerge (dev|staging|main) (in)?to\b.*|.*\b(in)?to (prod|production)\b.*)$/i;
const PER_REPO = 2, SHOW = 5;

async function fetchMerged() {
  const { user } = await gql(
    'query($l:String!){user(login:$l){pullRequests(states:MERGED,first:100,orderBy:{field:CREATED_AT,direction:DESC}){nodes{title number mergedAt repository{nameWithOwner isPrivate}}}}}',
    { l: USER },
  );
  const perRepo = new Map();
  const out = [];
  const nodes = user.pullRequests.nodes
    .filter((n) => !n.repository.isPrivate && n.title.trim().length > 7 && !TRIVIAL.test(n.title.trim()))
    .sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : -1));
  for (const n of nodes) {
    const repo = n.repository.nameWithOwner;
    if ((perRepo.get(repo) ?? 0) >= PER_REPO) continue;
    perRepo.set(repo, (perRepo.get(repo) ?? 0) + 1);
    const m = n.title.trim().match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/);
    const typed = m && TYPES.has(m[1].toLowerCase());
    const title = typed ? m[3] : n.title.trim();
    out.push({
      type: typed ? m[1].toUpperCase() : 'PR',
      title: title[0].toUpperCase() + title.slice(1),
      repo, number: n.number, date: n.mergedAt,
    });
    if (out.length === SHOW) break;
  }
  return out;
}

// Current streak survives a quiet today if yesterday had activity.
export function streaks(days) {
  const s = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  let longest = 0, run = 0;
  for (const d of s) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = s.length - 1, current = 0;
  if (i >= 0 && s[i].count === 0) i--;
  while (i >= 0 && s[i].count > 0) { current++; i--; }
  return { current, longest };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

export function build(data, theme) {
  const t = themes[theme];
  const accent = products[0].color[theme];
  const serif = font('instrument-serif-latin-400-normal.woff');
  const sans = font('geist-latin-400-normal.woff');
  const sansMid = font('geist-latin-500-normal.woff');
  const mono = font('geist-mono-latin-500-normal.woff');
  const label = (s, x, y, fill = t.muted, anchor = 'start', size = 10.5) => text(mono, s, x, y, size, fill, { ls: 0.14, upper: true, anchor });
  const fmt = (n) => n.toLocaleString('en-US');

  const W = 960, H = 452, L = 40, R = 920;
  // Sheet: drafting grid, frame, header strip, registration marks.
  let b = `<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${t.grid}"/></pattern></defs>`;
  b += `<rect width="${W}" height="${H}" fill="${t.bg}"/><rect width="${W}" height="${H}" fill="url(#grid)"/>`;
  b += `<rect y="0" width="${W}" height="48" fill="${t.bg}"/><rect y="48" width="${W}" height="1" fill="${t.line}"/>`;
  b += `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${t.lineStrong}"/>`;
  for (const [x, y] of [[17.5, 17.5], [W - 17.5, 17.5], [17.5, H - 17.5], [W - 17.5, H - 17.5]])
    b += `<path d="M${x - 5.5} ${y}H${x + 5.5}M${x} ${y - 5.5}V${y + 5.5}" stroke="${t.faint}"/>`;
  b += `<rect x="${L}" y="20" width="8" height="8" fill="${t.text}"/>` + label('GitHub activity', L + 18, 28);
  b += label(`Updated ${day(data.updated ?? new Date().toISOString())} ${new Date(data.updated ?? Date.now()).getUTCFullYear()}  ·  Sheet ${String(sheets.stats).padStart(2, '0')} / ${String(sheets.total).padStart(2, '0')}`, R, 28, t.muted, 'end');

  // Metrics: one wide cell with a weekly sparkline, then three cells.
  const MX = L, MW = 440, top = 78, CH = 124;
  const cell = (x, y, w, h) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${t.bg}" stroke="${t.line}"/>`;
  b += cell(MX, top, MW, CH);
  const third = MW / 3;
  for (let i = 0; i < 3; i++) b += cell(MX + i * third, top + CH - 1, third + (i < 2 ? 1 : 0), CH);

  const metric = (x, y, k, v, cap, delay, live = false) => {
    let g = '';
    if (live) g += `<rect x="${x}" y="${y + 18}" width="7" height="7" fill="${accent}"/>`;
    g += label(k, x + (live ? 14 : 0), y + 26, t.muted, 'start', 10);
    g += text(serif, v, x - 2, y + 84, 52, t.text);
    g += label(cap, x, y + 106, t.faint, 'start', 9.5);
    return rise(g, delay);
  };
  b += metric(MX + 18, top, 'Contributions', fmt(data.year), 'Last 12 months', 0.15);
  b += metric(MX + 18, top + CH - 1, 'Pull requests', fmt(data.prs), 'Last 12 months', 0.25);
  b += metric(MX + third + 18, top + CH - 1, 'Streak', String(data.current), data.current === 1 ? 'Day, current' : 'Days, current', 0.35, true);
  b += metric(MX + 2 * third + 18, top + CH - 1, 'Best streak', String(data.longest), 'Days, all time', 0.45);

  // Weekly sparkline inside the contributions cell
  const weeks = data.weeks;
  const sx = MX + 214, sw = MW - 214 - 18, base = top + 104, area = 58;
  const max = Math.max(...weeks.map((w) => w.count), 1);
  const step = sw / weeks.length;
  const best = weeks.reduce((bi, w, i) => (w.count > weeks[bi].count ? i : bi), 0);
  b += `<rect x="${sx}" y="${base}" width="${r2(sw)}" height="1" fill="${t.lineStrong}"/>`;
  weeks.forEach((w, i) => {
    const h = w.count ? Math.max(2, (w.count / max) * area) : 0;
    if (h) b += growBar(sx + i * step + 0.6, base, step - 1.2, h, i === best ? accent : t.muted, 0.5 + i * 0.01, i === best ? '' : ' fill-opacity=".55"');
  });
  b += rise(label(`Best week · ${fmt(weeks[best].count)}`, sx + sw, top + 26, accent, 'end', 9.5), 1.1, 6);

  // Recently merged: public pull requests, newest first.
  const RX = MX + MW + 36;
  b += label('Recently merged', RX, top + 12);
  b += label('Public repos', R, top + 12, t.faint, 'end', 9.5);
  b += `<rect x="${RX}" y="${top + 24}" width="${R - RX}" height="1" fill="${t.lineStrong}"/>`;
  const ROW = 44;
  const merged = data.merged ?? [];
  if (!merged.length) b += text(sans, 'Nothing public merged lately.', RX, top + 56, 13.5, t.muted);
  merged.forEach((m, i) => {
    const y = top + 25 + i * ROW;
    let g = label(m.type, RX, y + 19, m.type === 'FEAT' ? accent : t.muted, 'start', 9.5);
    g += text(sansMid, fit(sansMid, m.title, 13.5, R - RX - 112), RX + 50, y + 19, 13.5, t.text);
    g += text(mono, `${m.repo} #${m.number}`, RX + 50, y + 35, 10, t.faint, { ls: 0.02 });
    g += label(day(m.date), R, y + 19, t.faint, 'end', 9.5);
    b += rise(g, 0.55 + i * 0.09, 6);
    b += `<rect x="${RX}" y="${y + ROW - 1}" width="${R - RX}" height="1" fill="${t.line}"/>`;
  });

  // Languages
  const ly = 368;
  b += label('Languages · share of repos active in the last 2 years', L, ly);
  b += wipe('langwipe', L, ly + 12, R - L, 8, 0.9);
  let x = L;
  b += `<g clip-path="url(#langwipe)">`;
  data.langs.forEach((l, i) => {
    const w = (l.pct / 100) * (R - L);
    b += `<rect x="${r2(x)}" y="${ly + 12}" width="${r2(Math.max(w - (i < data.langs.length - 1 ? 2 : 0), 1))}" height="8" fill="${l.color ?? t.lineStrong}"/>`;
    x += w;
  });
  b += `</g>`;
  data.langs.forEach((l, i) => {
    const lx = L + i * 147, y = ly + 46;
    b += `<rect x="${lx}" y="${y - 9}" width="9" height="9" fill="${l.color ?? t.lineStrong}"/>`;
    b += text(sansMid, l.name, lx + 16, y, 13, t.text);
    b += text(sans, `${l.pct.toFixed(1)}%`, lx + 16 + measure(sansMid, l.name, 13) + 7, y, 13, t.muted);
  });

  const alt = `GitHub activity for ${USER}: ${fmt(data.year)} contributions and ${fmt(data.prs)} pull requests in the last 12 months, ${data.current} day current streak, ${data.longest} day longest streak. ` +
    (merged.length ? `Recently merged: ${merged.map((m) => `${m.title} (${m.repo})`).join('; ')}. ` : '') +
    `Top languages: ${data.langs.filter((l) => l.name !== 'Other').map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(', ')}.`;
  return doc(W, H, alt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), b);
}

// Trims a string with an ellipsis until it fits maxW at this size.
function fit(f, s, size, maxW) {
  if (measure(f, s, size) <= maxW) return s;
  let out = s;
  while (out.length > 1 && measure(f, out + '…', size) > maxW) out = out.slice(0, -1);
  return out.replace(/[\s,.:;-]+$/, '') + '…';
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const data = process.argv.includes('--sample') ? JSON.parse(fs.readFileSync(sampleFile, 'utf8')) : await fetchLive();
  if (process.argv.includes('--save-sample')) fs.writeFileSync(sampleFile, JSON.stringify(data, null, 1) + '\n');
  for (const theme of ['dark', 'light']) fs.writeFileSync(path.join(root, 'assets', `stats-${theme}.svg`), build(data, theme));
  console.log(`stats: ${data.year} contributions, ${data.prs} PRs, streak ${data.current}, longest ${data.longest}, langs ${data.langs.map((l) => l.name).join('/')}`);
}
