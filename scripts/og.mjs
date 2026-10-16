// Build-time OG image generator: designed SVG -> 1200x630 PNG via sharp. Writes public/og/**.
// Design: training-log sheet (ruled paper, code tab, stamped date). Skips files that are already up to date.
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'src/data/site.json'), 'utf8'));
const out = join(root, 'public/og');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text, max) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
function frontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? parse(m[1]) : null;
}

function svg({ code, kicker, title, date }) {
  const lines = wrap(title, 17);
  const rules = Array.from({ length: 19 }, (_, i) => `<line x1="0" y1="${i * 34}" x2="1200" y2="${i * 34}" stroke="#17201c" stroke-opacity="0.06"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f6f4ee"/>${rules}
  <rect x="0" y="0" width="1200" height="96" fill="#fffdf8"/><line x1="0" y1="96" x2="1200" y2="96" stroke="#17201c" stroke-width="4"/>
  <rect x="56" y="26" width="64" height="44" fill="none" stroke="#17201c" stroke-width="3"/>
  <text x="88" y="57" font-family="Consolas, monospace" font-size="22" font-weight="700" fill="#17201c" text-anchor="middle">SD</text>
  <text x="140" y="58" font-family="Malgun Gothic, sans-serif" font-size="28" font-weight="700" fill="#17201c">${esc(site.name)}</text>
  <g transform="rotate(-3 1030 50)"><rect x="900" y="28" width="250" height="44" fill="none" stroke="#a8431a" stroke-width="3"/>
  <text x="1025" y="58" font-family="Consolas, monospace" font-size="20" font-weight="700" fill="#a8431a" text-anchor="middle">${esc(date)}</text></g>
  <rect x="56" y="150" width="120" height="52" fill="#1e6b4f"/>
  <text x="116" y="185" font-family="Consolas, monospace" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(code)}</text>
  <text x="196" y="186" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#56615b">${esc(kicker)}</text>
  ${lines.map((l, i) => `<text x="56" y="${290 + i * 78}" font-family="Malgun Gothic, sans-serif" font-size="62" font-weight="700" fill="#17201c">${esc(l)}</text>`).join('')}
  <rect x="56" y="540" width="30" height="30" fill="none" stroke="#17201c" stroke-width="3"/><path d="M62 554 l7 8 l13 -16" fill="none" stroke="#1e6b4f" stroke-width="4"/>
  <text x="102" y="565" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#3a4540">사기 전에 체크할 항목 · ${esc(site.domain)}</text>
</svg>`;
}

async function render(rel, spec) {
  const file = join(out, rel);
  mkdirSync(dirname(file), { recursive: true });
  const s = svg(spec);
  const stamp = join(root, 'node_modules/.cache/og', rel + '.src');
  mkdirSync(dirname(stamp), { recursive: true });
  if (existsSync(file) && existsSync(stamp) && readFileSync(stamp, 'utf8') === s) return false;
  await sharp(Buffer.from(s)).png({ compressionLevel: 9 }).toFile(file);
  writeFileSync(stamp, s);
  return true;
}

const today = 'SINCE 2026-10';
const jobs = [
  ['home.png', { code: 'LOG', kicker: 'EQUIPMENT LOG', title: '운동 장비, 사기 전에 체크할 항목', date: today }],
  ['guides.png', { code: 'ALL', kicker: '전체 체크리스트', title: '운동 장비 구매 체크리스트 전체 목록', date: today }],
  ...site.categories.map((c) => [`category/${c.slug}.png`, { code: c.code, kicker: 'CATEGORY', title: `${c.name} 장비 고르는 법`, date: today }]),
];
for (const [dir, base] of [['src/content/guides', 'guides'], ['src/content/posts', 'picks']]) {
  const p = join(root, dir);
  if (!existsSync(p)) continue;
  for (const f of readdirSync(p).filter((n) => n.endsWith('.md') && !n.startsWith('_'))) {
    const fm = frontmatter(join(p, f));
    if (!fm) continue;
    const cat = site.categories.find((c) => c.slug === fm.category);
    jobs.push([`${base}/${fm.slug}.png`, { code: cat?.code ?? 'SD', kicker: base === 'guides' ? `${cat?.name ?? ''} 체크리스트` : `${cat?.name ?? ''} 추천`, title: fm.title, date: String(fm.updated).slice(0, 10) }]);
  }
}
let made = 0;
for (const [rel, spec] of jobs) if (await render(rel, spec)) made++;
console.log(`og: ${jobs.length} images (${made} regenerated)`);
