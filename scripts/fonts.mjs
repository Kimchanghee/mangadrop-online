// Build-time Gowun Batang 700 subset (SIL OFL 1.1, src/fonts/OFL-GowunBatang.txt).
// The serif face is used only for brand, H1, H2, card names and a few labels, so the subset holds
// the glyphs of every such string on the site plus ASCII. Output is gitignored and rebuilt each build.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/fonts/GowunBatang-Bold.subset.woff2');
const chars = new Set();
const add = (s) => { for (const c of String(s ?? '')) chars.add(c); };
for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
add('·–—‘’“”…→↗−○●');
function walk(dir, ext, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, ext, acc); else if (ext.some((e) => n.endsWith(e))) acc.push(p); }
  return acc;
}
// Static UI strings (templates, site data) are short; include them whole.
for (const f of [...walk(join(root, 'src/pages'), ['.astro']), ...walk(join(root, 'src/layouts'), ['.astro']), ...walk(join(root, 'src/components'), ['.astro']), join(root, 'src/data/site.json')]) add(readFileSync(f, 'utf8').replace(/[^\u3131-\uD7A3\u00B7]/g, ''));
// Content: only the strings the templates set in the serif face.
const mdFiles = [...walk(join(root, 'src/content'), ['.md']), ...walk(join(root, 'ops/queue'), ['.md'])].filter((f) => !/[\\/]_|[\\/]evidence[\\/]/.test(f));
for (const f of mdFiles) {
  const text = readFileSync(f, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) continue;
  let fm; try { fm = parse(m[1]); } catch { continue; }
  add(fm.title); add(fm.product?.name); add(fm.product?.box?.label);
  for (const s of fm.product?.box?.ranges ?? []) add(s.name);
  for (const c of fm.checklist ?? []) add(typeof c === 'string' ? '' : c.label);
  for (const h of m[2].matchAll(/^#{2,3}\s+(.+)$/gm)) add(h[1]);
  for (const h of m[2].matchAll(/<caption>([^<]+)<\/caption>/g)) add(h[1]);
}
const text = [...chars].sort().join('');
const stamp = join(root, 'node_modules/.cache/fonts/gowun.txt');
if (existsSync(out) && existsSync(stamp) && readFileSync(stamp, 'utf8') === text) { console.log(`fonts: Gowun Batang subset up to date (${chars.size} glyphs)`); process.exit(0); }
const buf = await subsetFont(readFileSync(join(root, 'src/fonts/GowunBatang-Bold.ttf')), text, { targetFormat: 'woff2' });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
mkdirSync(dirname(stamp), { recursive: true });
writeFileSync(stamp, text);
console.log(`fonts: Gowun Batang subset ${chars.size} glyphs, ${buf.length} bytes`);