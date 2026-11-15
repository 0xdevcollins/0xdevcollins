// Every word, link and color on the profile lives here.
// Edit this file, then run `npm run render` to rebuild the images.
// Voice rules: plain, short sentences, no em dashes, no invented numbers.

export const person = {
  first: 'Collins',
  last: 'Ikechukwu',
  role: 'Founder, Thirtn',
  discipline: 'Full-stack + Web3',
  location: 'Nigeria',
  strapline: 'Building on Stellar',
  line: 'I build funding rails and builder infrastructure on Stellar. Rust on-chain. TypeScript everywhere else.',
  github: 'https://github.com/0xdevcollins',
};

// Theme tokens. Dark sits close to GitHub's own dark page so the sheets feel native there.
// `grid` is the drafting grid behind every sheet. Product colors have a light-mode variant
// with enough contrast for text.
export const themes = {
  dark: {
    bg: '#0c0e11', panel: '#111418', grid: '#161a20', line: '#232931', lineStrong: '#343c47',
    text: '#eef0f2', muted: '#98a0aa', faint: '#5e6672',
  },
  light: {
    bg: '#f6f5f1', panel: '#fbfaf8', grid: '#e8e6df', line: '#dcd9d0', lineStrong: '#c4c0b5',
    text: '#15171a', muted: '#5b5f66', faint: '#96978f',
  },
};

// Featured products, in the order they appear. `shot` is a file in assets/shots.
export const products = [
  {
    id: 'boundless',
    name: 'Boundless',
    kicker: 'Hackathons, bounties and grants on Stellar',
    index: 'Builder platform',
    color: { dark: '#2fe0a6', light: '#0b8f63' },
    url: 'https://boundlessfi.xyz',
    host: 'boundlessfi.xyz',
    shot: 'boundless.png',
    body: 'Where builders find hackathons, bounties and grants, and where ideas get crowdfunded. Built on Stellar, with Soroban contracts in Rust.',
    rows: [
      ['Opportunities', 'Find one, or host one'],
      ['Crowdfunding', 'Ideas get funded'],
      ['Builders', 'Who ships on Stellar'],
      ['Build Day', 'Guides, contracts, starter'],
    ],
    tags: ['Next.js', 'NestJS', 'Rust', 'Soroban'],
  },
  {
    id: 'useroutr',
    name: 'Useroutr',
    kicker: 'Application funding',
    index: 'Funding rails',
    color: { dark: '#ff7a3d', light: '#c2501a' },
    url: 'https://www.useroutr.com',
    host: 'useroutr.com',
    shot: 'useroutr.png',
    body: 'Users fund your app with bank, card or crypto. Useroutr quotes, routes, settles on Stellar and credits your ledger exactly once.',
    tags: ['Fastify', 'Prisma', 'Soroban'],
  },
  {
    id: 'lumenstat',
    name: 'Lumenstat',
    kicker: 'Analytics for Stellar',
    index: 'Proof of usage',
    color: { dark: '#a38ff7', light: '#6447d6' },
    url: 'https://lumenstat-site.vercel.app',
    host: 'lumenstat-site.vercel.app',
    shot: 'lumenstat.png',
    body: 'Privacy-first web and API analytics for Stellar projects. No cookies. Bot traffic is flagged, not counted.',
    tags: ['TypeScript', 'EU hosted'],
  },
];

// Smaller cards: other products and lab builds.
export const more = [
  {
    id: 'sumasrms', name: 'SumaSRMS', label: 'Thirtn', url: 'https://github.com/sumasrms',
    body: 'University results, digitized. Lecturer to senate approvals, payments and transcripts.',
    tags: ['Next.js', 'NestJS', 'Prisma'],
  },
  {
    id: 'threadify', name: 'Threadify', label: 'Thirtn', url: 'https://github.com/Threadify-me',
    body: 'Online stores for creators. Set up, sell and manage in one place.',
    tags: ['Next.js', 'Express', 'MongoDB'],
  },
  {
    id: 'stellar-dvn', name: 'stellar-dvn', label: 'Lab', url: 'https://github.com/0xdevcollins/stellar-dvn',
    body: 'An independent LayerZero V2 DVN for Stellar. Soroban contract plus off-chain verifier, end to end on testnet.',
    tags: ['Rust', 'Soroban', 'LayerZero'],
  },
  {
    id: 'moat', name: 'moat', label: 'Lab', url: 'https://github.com/0xdevcollins/moat',
    body: 'Threat model as code. A STRIDE register from a versioned moat.yaml, diffable in PRs, enforced in CI.',
    tags: ['TypeScript', 'CI'],
  },
];

// Rendered as a bill of materials. "Used in" is worked out from the tags above,
// so keep tag names and part names spelled the same. Only list what you actually ship with.
export const stack = [
  ['Web', ['Next.js', 'React', 'TypeScript', 'Tailwind', 'React Query', 'Zustand']],
  ['Backend', ['NestJS', 'Fastify', 'Express', 'PostgreSQL', 'Prisma', 'MongoDB', 'Redis']],
  ['On-chain', ['Soroban', 'Rust', 'Cairo', 'Solidity']],
  ['Ecosystem', ['Stellar', 'LayerZero']],
];

export const contacts = [
  { id: 'github', label: 'GitHub', handle: '@0xdevcollins', url: 'https://github.com/0xdevcollins' },
  { id: 'x', label: 'X', handle: '@0xdevcollins', url: 'https://x.com/0xdevcollins' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'Collins Ikechukwu', url: 'https://www.linkedin.com/in/collins-chikangwu/' },
];

// Every section is drawn as a numbered sheet, in README order. Derived, not typed.
const n = products.length;
export const sheets = {
  hero: 1,
  ...Object.fromEntries(products.map((p, i) => [p.id, i + 2])),
  more: n + 2,
  stack: n + 3,
  stats: n + 4,
  total: n + 4,
};
