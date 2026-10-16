// Prints the publish-relevant facts of one post as JSON (used by scripts/publish.ps1).
// usage: node scripts/post-info.mjs <path-to-post.md>
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'src/data/site.json'), 'utf8'));
const providers = JSON.parse(readFileSync(join(root, 'src/data/providers.json'), 'utf8'));
const text = readFileSync(process.argv[2], 'utf8');
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!m) { console.error('no frontmatter'); process.exit(1); }
const fm = parse(m[1]);
const p = fm.product ?? {};
console.log(JSON.stringify({
  slug: fm.slug, title: fm.title, published: fm.published,
  productUrl: p.url ?? '', provider: p.provider ?? '',
  disclosure: fm.disclosure || providers[p.provider]?.disclosure || '',
  siteUrl: String(site.url).replace(/\/$/, ''), path: `/${site.postBase ?? 'picks'}/${fm.slug}/`,
}));