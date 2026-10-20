// Build-time OG image generator: designed SVG -> 1200x630 PNG via sharp. Writes public/og/**.
// Design: collector's bookshop card (warm paper, double rule, serif title, volume ticks). Skips up-to-date files.
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
  // Collector's bookshop card: warm paper, double rule, oxblood accent, serif title, CSS-like volume ticks.
  const lines = wrap(title, 16);
  const serif = "'Gowun Batang', 'Batang', 'Noto Serif KR', serif";
  const sans = "'Pretendard', 'Malgun Gothic', sans-serif";
  const ticks = Array.from({ length: 17 }, (_, i) => `<rect x="${806 + i * 20}" y="472" width="16" height="74" fill="${i === 0 || i === 16 ? '#f2d9cf' : '#fbf8f2'}" stroke="${i === 0 || i === 16 ? '#8a2f22' : '#bfae92'}" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4efe5"/>
  <text x="64" y="78" font-family="${serif}" font-size="38" font-weight="700" fill="#231e18">${esc(site.name)}</text>
  <text x="232" y="76" font-family="${sans}" font-size="22" fill="#6e6457">${esc(site.tagline)}</text>
  <line x1="0" y1="106" x2="1200" y2="106" stroke="#2b241d" stroke-width="2"/><line x1="0" y1="112" x2="1200" y2="112" stroke="#2b241d" stroke-width="2"/>
  <text x="64" y="180" font-family="${sans}" font-size="26" font-weight="700" fill="#8a2f22">${esc(kicker)}</text>
  ${lines.map((l, i) => `<text x="64" y="${270 + i * 76}" font-family="${serif}" font-size="60" font-weight="700" fill="#231e18">${esc(l)}</text>`).join('')}
  <rect x="790" y="430" width="362" height="150" fill="#e9e1d2" stroke="#cdbfa8" stroke-width="2"/>${ticks}
  <text x="806" y="460" font-family="${serif}" font-size="22" font-weight="700" fill="#231e18">${esc(code)}</text>
  <rect x="64" y="520" width="28" height="28" fill="#fbf8f2" stroke="#231e18" stroke-width="3"/>
  <text x="108" y="544" font-family="${sans}" font-size="24" fill="#4a4239">사기 전에 확인할 것 · ${esc(site.domain)} · ${esc(date)}</text>
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
  ['home.png', { code: '서가', kicker: '수집 서가', title: '만화책과 독서 용품, 사기 전에 체크할 항목', date: today }],
  ['guides.png', { code: '체크리스트', kicker: '전체 체크리스트', title: '만화책과 독서 용품 구매 체크리스트 전체 목록', date: today }],
  ...site.categories.map((c) => [`category/${c.slug}.png`, { code: c.name, kicker: '서가 분류', title: `${c.name}, 무엇부터 확인할까`, date: today }]),
];
for (const [dir, base] of [['src/content/guides', 'guides'], ['src/content/posts', 'picks']]) {
  const p = join(root, dir);
  if (!existsSync(p)) continue;
  for (const f of readdirSync(p).filter((n) => n.endsWith('.md') && !n.startsWith('_'))) {
    const fm = frontmatter(join(p, f));
    if (!fm) continue;
    const cat = site.categories.find((c) => c.slug === fm.category);
    jobs.push([`${base}/${fm.slug}.png`, { code: cat?.name ?? '망가드롭', kicker: base === 'guides' ? `${cat?.name ?? ''} 체크리스트` : `${cat?.name ?? ''} 추천`, title: fm.title, date: String(fm.updated).slice(0, 10) }]);
  }
}
let made = 0;
for (const [rel, spec] of jobs) if (await render(rel, spec)) made++;
console.log(`og: ${jobs.length} images (${made} regenerated)`);
