#!/usr/bin/env node
// Publish gate = CONTRACT §4 SEO/AEO gate + SHOPPING.md commerce gate.
//
//   node scripts/gate.mjs                 full gate: every guide/post source + every built page in dist/
//   node scripts/gate.mjs --slug <slug>   full site gate, but fail-fast report focused on one post
//   node scripts/gate.mjs --source <md>   source-only gate for one markdown file (no build needed)
//   options: --json (machine output), --log <publish-log.jsonl>, --now <ISO> (duplicate window clock)
//
// Exit code 0 = pass, 1 = fail, 2 = usage/setup error.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'src/data/site.json'), 'utf8'));
const providers = JSON.parse(readFileSync(join(root, 'src/data/providers.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const flag = (k) => args.includes(k);
const KO = site.lang === 'ko';

// ---------- rules ----------
export const RULES = {
  bodyMinNonSpaceKo: 1400,
  bodyMinWordsEn: 700,
  minQuestionH2: 4,
  minInternalLinksSource: 1,
  minInternalLinksPage: 2,
  titleMaxPostKo: 40,
  pageTitle: KO ? [15, 60] : [30, 60],
  description: KO ? [60, 160] : [120, 160],
  answerChars: KO ? [20, 220] : [60, 320],
  duplicateWindowDays: 30,
};
export const BANNED_FIRST_HAND = [
  /직접\s?써\s?보니/, /직접\s?사용해\s?보니/, /제가\s?(직접\s?)?(사용|써)\s?(해\s?)?보니/, /사용해\s?본\s?결과/, /써\s?본\s?결과/,
  /내돈내산/, /실사용\s?후기/, /한\s?달\s?(동안\s?)?써\s?보/, /I tested/i, /in my experience/i, /we tested/i, /hands-on review/i,
  /★/, /별점\s?\d/, /평점\s?\d/, /\d(\.\d)?\s?점\s?만점/, /\d+\s?명이?\s?구매/, /리뷰\s?\d[\d,]*\s?개/,
];
export const PLACEHOLDER = [/lorem ipsum/i, /\bTODO\b/, /\bTBD\b/, /\{\{/, /PLACEHOLDER/i, /\bXXX\b/, /예시\s?텍스트/, /여기에\s?(내용|입력)/];
const QUESTION_H2 = /(\?|？)\s*$|무엇|어떻게|어떤|왜|언제|얼마|몇|어디|누가|할까|나요|인가|일까|은가|는가|해야/;

const providerHosts = Object.fromEntries(Object.entries(providers).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, v.hosts]));
const allAffHosts = new Set(Object.values(providerHosts).flat());

// ---------- helpers ----------
function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: text };
  return { fm: parseYaml(m[1]), body: m[2] };
}
const nonSpaceLen = (s) => s.replace(/\s+/g, '').length;
function plainBody(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/[|#>*_`]/g, ' ');
}
const mdLinks = (md) => [...md.matchAll(/(?<!!)\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ text: m[1], href: m[2] }));
const h2s = (md) => [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ text: m[1].trim(), index: m.index }));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const stripTags = (h) => decode(h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function attr(tag, name) { const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')); return m ? decode(m[2] ?? m[3]) : undefined; }

function readLog(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l, i) => {
    try { return JSON.parse(l); } catch { throw new Error(`publish log line ${i + 1} is not valid JSON`); }
  });
}

// ---------- source gate ----------
export function gateSource(file, { kind, logEntries = [], now = new Date(), knownPaths = null } = {}) {
  const errors = [];
  const warnings = [];
  const text = readFileSync(file, 'utf8');
  const { fm, body } = splitFrontmatter(text);
  const e = (m) => errors.push(m);
  if (!fm) return { file, errors: ['missing frontmatter'], warnings };
  kind ??= fm.product ? 'post' : 'guide';
  for (const k of ['title', 'slug', 'question', 'answer', 'description', 'published', 'updated', 'category', 'primaryKeyword', 'sources']) if (fm[k] === undefined || fm[k] === '' || fm[k] === null) e(`frontmatter.${k} missing`);
  if (kind === 'guide' && !fm.data_asof) e('frontmatter.data_asof missing');
  const title = String(fm.title ?? '');
  if (KO && kind === 'post' && title.length > RULES.titleMaxPostKo) e(`title ${title.length}자 > ${RULES.titleMaxPostKo}자 (KO post guideline)`);
  if (KO && kind === 'guide' && title.length > RULES.titleMaxPostKo) warnings.push(`title ${title.length}자 > ${RULES.titleMaxPostKo}자`);
  const d = String(fm.description ?? '');
  if (d.length < RULES.description[0] || d.length > RULES.description[1]) e(`description length ${d.length} not in ${RULES.description.join('–')}`);
  const a = String(fm.answer ?? '');
  if (a.length < RULES.answerChars[0] || a.length > RULES.answerChars[1]) e(`answer length ${a.length} not in ${RULES.answerChars.join('–')}`);
  if (!/^[a-z0-9-]+$/.test(String(fm.slug ?? ''))) e('slug must be lowercase a-z0-9-');
  if (!site.categories.some((c) => c.slug === fm.category)) e(`unknown category ${fm.category}`);
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
  for (const k of ['published', 'updated']) if (fm[k] && !iso.test(String(fm[k]))) e(`${k} must be ISO datetime with explicit zone`);
  if (fm.updated && fm.published && String(fm.updated) < String(fm.published)) e('updated earlier than published');
  if (!Array.isArray(fm.sources) || fm.sources.length === 0) e('sources[] empty');
  else for (const s of fm.sources) if (!/^https:\/\//.test(String(s?.url ?? '')) || !s?.title) e(`bad source ${JSON.stringify(s)}`);
  if (fm.faq && !Array.isArray(fm.faq)) e('faq must be a list');

  // body checks
  const plain = plainBody(body);
  const len = nonSpaceLen(plain);
  if (KO && len < RULES.bodyMinNonSpaceKo) e(`body ${len} non-space chars < ${RULES.bodyMinNonSpaceKo}`);
  if (!KO) { const w = plain.split(/\s+/).filter(Boolean).length; if (w < RULES.bodyMinWordsEn) e(`body ${w} words < ${RULES.bodyMinWordsEn}`); }
  const heads = h2s(body);
  const qHeads = heads.filter((h) => QUESTION_H2.test(h.text));
  if (qHeads.length < RULES.minQuestionH2) e(`${qHeads.length} question-shaped H2 < ${RULES.minQuestionH2}`);
  for (const h of qHeads) {
    const after = body.slice(h.index).split(/\r?\n/).slice(1).find((l) => l.trim() !== '');
    if (!after || /^#{1,6}\s/.test(after)) e(`H2 "${h.text}" has no answer paragraph`);
  }
  const fullText = `${title}\n${a}\n${body}\n${(fm.faq ?? []).map((f) => `${f.q} ${f.a}`).join('\n')}`;
  for (const re of BANNED_FIRST_HAND) if (re.test(fullText)) e(`fabricated first-hand/review phrase matched ${re}`);
  for (const re of PLACEHOLDER) if (re.test(fullText)) e(`placeholder text matched ${re}`);
  const links = mdLinks(body);
  const internal = links.filter((l) => l.href.startsWith('/'));
  if (internal.length < RULES.minInternalLinksSource) e(`internal links in body ${internal.length} < ${RULES.minInternalLinksSource}`);
  if (knownPaths) for (const l of internal) { const p = l.href.split('#')[0]; if (!knownPaths.has(p.endsWith('/') ? p : p + '/')) e(`internal link to unknown page ${l.href}`); }
  for (const l of links) if (/^https?:/.test(l.href)) { try { new URL(l.href); } catch { e(`bad url ${l.href}`); } }

  // commerce checks
  if (kind === 'post') {
    const p = fm.product ?? {};
    for (const k of ['name', 'optionDetail', 'provider', 'url', 'landingHost', 'verifiedAt', 'evidence']) if (!p[k]) e(`product.${k} missing`);
    const hosts = providerHosts[p.provider];
    if (!hosts) e(`unknown provider ${p.provider}`);
    let host = '';
    try { host = new URL(String(p.url)).host; } catch { e(`product.url invalid: ${p.url}`); }
    if (hosts && host && !hosts.includes(host)) e(`product.url host ${host} not on ${p.provider} allowlist [${hosts.join(', ')}]`);
    if (/search|query=|q=/.test(String(p.url)) && !/link\.coupang\.com\/a\//.test(String(p.url))) warnings.push('product.url looks like a search URL; must land on the exact product');
    if (p.verifiedAt && !iso.test(String(p.verifiedAt))) e('product.verifiedAt must be ISO with zone');
    if (p.verifiedAt && fm.published && (new Date(fm.published) - new Date(p.verifiedAt)) / 864e5 > 2) e('product link verified more than 2 days before publish; re-verify');
    const affLinks = links.filter((l) => { try { return allAffHosts.has(new URL(l.href).host); } catch { return false; } });
    if (affLinks.length > 1) e(`${affLinks.length} in-text affiliate links (max 1)`);
    for (const l of affLinks) if (l.href !== p.url) e(`in-text affiliate link differs from product.url: ${l.href}`);
    if (p.evidence) {
      const ev = resolve(root, String(p.evidence));
      const evAlt = resolve(dirname(file), String(p.evidence));
      const evFile = existsSync(ev) ? ev : existsSync(evAlt) ? evAlt : null;
      if (!evFile) e(`evidence note not found: ${p.evidence}`);
      else if (!readFileSync(evFile, 'utf8').includes(String(p.url))) e('evidence note does not contain the exact product.url');
    }
    // images
    const imgs = Array.isArray(fm.images) ? fm.images : [];
    if (!imgs.some((i) => i?.role === 'cover')) e('no cover image');
    for (const img of imgs) {
      if (!img?.src?.startsWith('/')) { e(`image src must be site-absolute: ${img?.src}`); continue; }
      const candidates = [join(root, 'public', img.src), join(dirname(file), 'public', img.src)];
      if (!candidates.some((c) => existsSync(c) && statSync(c).size > 0)) e(`image file missing: ${img.src}`);
      if (!img.alt || String(img.alt).length < 4) e(`image alt missing: ${img.src}`);
      if (!['cover', 'context', 'detail', 'comparison', 'use'].includes(img.role)) e(`image role invalid: ${img.src}`);
      if (!['generated', 'provider-api', 'own'].includes(img.rights)) e(`image rights invalid: ${img.src}`);
      if (!img.credit) e(`image credit missing: ${img.src}`);
      if (/AI로 만든|실제 상품 사진이 아닙니다|가상 인물/.test(String(img.alt))) e(`image alt contains production disclaimer: ${img.src}`);
    }
    // duplicates in publish log (last 30 days)
    const windowStart = now.getTime() - RULES.duplicateWindowDays * 864e5;
    for (const row of logEntries) {
      const t = new Date(row.publishedAt).getTime();
      if (row.slug === fm.slug) e(`slug already in publish log (${row.publishedAt}); never re-publish a duplicate`);
      else if ((row['product.url'] ?? row.productUrl) === p.url && t >= windowStart) e(`same product URL published ${row.publishedAt} as ${row.slug} (within ${RULES.duplicateWindowDays} days)`);
    }
  }
  return { file: relative(root, file), kind, slug: fm.slug, errors, warnings, bodyChars: len, questionH2: qHeads.length };
}

// ---------- built-page gate ----------
function walkHtml(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walkHtml(p, out); else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}
export function gatePage(file, dist, { sitemapLocs, entries }) {
  const errors = [];
  const warnings = [];
  const e = (m) => errors.push(m);
  const html = readFileSync(file, 'utf8');
  const rel = '/' + relative(dist, file).split(sep).join('/');
  const pathName = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  const expected = site.url + pathName;
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? '').trim();
  if (!title) e('no <title>');
  else if (title.length < RULES.pageTitle[0] || title.length > RULES.pageTitle[1]) e(`<title> length ${title.length} not in ${RULES.pageTitle.join('–')}`);
  const desc = attr((html.match(/<meta name="description"[^>]*>/) ?? [''])[0], 'content') ?? '';
  if (desc.length < RULES.description[0] || desc.length > RULES.description[1]) e(`meta description length ${desc.length} not in ${RULES.description.join('–')}`);
  const canonical = attr((html.match(/<link rel="canonical"[^>]*>/) ?? [''])[0], 'href');
  if (canonical !== expected) e(`canonical ${canonical} != ${expected}`);
  if (/noindex/i.test(html)) e('noindex present');
  const ogImg = attr((html.match(/<meta property="og:image"[^>]*>/) ?? [''])[0], 'content');
  if (!ogImg) e('og:image missing');
  else if (ogImg.startsWith(site.url) && !existsSync(join(dist, ogImg.slice(site.url.length)))) e(`og:image file missing ${ogImg}`);
  if (!/<meta name="twitter:card"/.test(html)) e('twitter card missing');
  if (!html.includes('name="google-adsense-account" content="ca-pub-4490818204529253"')) e('adsense account meta missing');
  // JSON-LD
  const main = (html.match(/<main[\s\S]*<\/main>/) ?? [''])[0];
  const visible = stripTags(main);
  const h1 = stripTags((main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1] ?? '');
  if (!h1) e('no <h1>');
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (!lds.length) e('no JSON-LD');
  for (const raw of lds) {
    let ld;
    try { ld = JSON.parse(raw); } catch { e('JSON-LD not valid JSON'); continue; }
    if (['Review', 'AggregateRating', 'Offer', 'Product'].includes(ld['@type'])) e(`forbidden LD type ${ld['@type']}`);
    if (JSON.stringify(ld).includes('aggregateRating')) e('aggregateRating in LD');
    if (ld['@type'] === 'Article' && ld.headline !== h1) e(`Article headline "${ld.headline}" != h1 "${h1}"`);
    if (ld['@type'] === 'Article' && !ld.dateModified) e('Article without dateModified');
    if (ld['@type'] === 'FAQPage') for (const q of ld.mainEntity ?? []) {
      if (!visible.includes(q.name)) e(`FAQ question not visible: ${q.name}`);
      if (!visible.includes(q.acceptedAnswer?.text)) e(`FAQ answer not visible: ${q.name}`);
    }
  }
  const internal = [...main.matchAll(/<a\s[^>]*href="(\/[^"]*)"/g)].length;
  if (internal < RULES.minInternalLinksPage) e(`internal links in <main> ${internal} < ${RULES.minInternalLinksPage}`);
  if (!sitemapLocs.has(expected)) e('not in sitemap');
  for (const re of PLACEHOLDER) if (re.test(visible)) e(`placeholder text ${re}`);

  // content pages
  const entry = entries.get(pathName);
  if (entry) {
    const ans = stripTags((main.match(/<p class="answer" data-gate="answer">([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
    if (ans !== String(entry.fm.answer).trim()) e('visible direct answer does not match frontmatter.answer');
    if (h1 !== String(entry.fm.title)) e('h1 != frontmatter.title');
    if (!/data-gate="sources"/.test(main)) e('sources block missing');
    for (const s of entry.fm.sources ?? []) if (!main.includes(`href="${s.url.replace(/&/g, '&amp;')}"`) && !main.includes(`href="${s.url}"`)) e(`source link not rendered: ${s.url}`);
    if ((entry.fm.faq ?? []).length && !/data-gate="faq"/.test(main)) e('faq in frontmatter but not visible');
    for (const re of BANNED_FIRST_HAND) if (re.test(visible)) e(`first-hand/review phrase on page ${re}`);
    if (entry.kind === 'post') {
      const p = entry.fm.product;
      const article = (main.match(/<article[^>]*data-gate="article"[^>]*>([\s\S]*?)<\/article>/) ?? [])[1] ?? '';
      const firstBlock = article.trim().match(/^<(\w+)[^>]*>/);
      if (!firstBlock || !/data-gate="disclosure"/.test(firstBlock[0])) e('disclosure is not the first block of the article');
      const disc = providers[p.provider]?.disclosure;
      const discText = stripTags((article.match(/data-gate="disclosure"[^>]*>([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
      if (!entry.fm.disclosure && disc && !discText.includes(disc)) e('provider disclosure text missing/changed');
      const prodLinks = [...main.matchAll(/<a\s[^>]*data-product-link="([^"]*)"[^>]*>/g)].map((m) => ({ slot: m[1], tag: m[0] }));
      const slots = prodLinks.map((l) => l.slot);
      for (const need of ['side', 'inline', 'end']) if (!slots.includes(need)) e(`product link slot "${need}" missing`);
      if (slots.filter((s) => s === 'intext').length > 1) e('more than one in-text product link');
      for (const l of prodLinks) {
        if (attr(l.tag, 'href') !== p.url) e(`product link (${l.slot}) href differs from product.url`);
        const rel = (attr(l.tag, 'rel') ?? '').split(/\s+/);
        for (const r of ['sponsored', 'nofollow', 'noopener']) if (!rel.includes(r)) e(`product link (${l.slot}) rel missing ${r}`);
      }
      // any other affiliate-host link on the page must be a product link
      for (const m of main.matchAll(/<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)) {
        let host = ''; try { host = new URL(decode(m[1])).host; } catch { continue; }
        if (allAffHosts.has(host) && !/data-product-link=/.test(m[0])) e(`untagged affiliate link ${m[1]}`);
      }
      const coverImg = (entry.fm.images ?? []).find((i) => i.role === 'cover');
      if (coverImg && !main.includes(`src="${coverImg.src}"`)) e('cover image not rendered');
    }
  }
  return { page: pathName, errors, warnings };
}

function siteFiles(dist) {
  const errors = [];
  const need = ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', 'llms.txt', 'ads.txt', 'rss.xml', '404.html', `${site.indexNowKey}.txt`];
  for (const f of need) if (!existsSync(join(dist, f))) errors.push(`dist/${f} missing`);
  if (existsSync(join(dist, 'ads.txt')) && !readFileSync(join(dist, 'ads.txt'), 'utf8').includes('google.com, pub-4490818204529253, DIRECT, f08c47fec0942fa0')) errors.push('ads.txt content wrong');
  if (existsSync(join(dist, 'robots.txt'))) {
    const r = readFileSync(join(dist, 'robots.txt'), 'utf8');
    if (!r.includes(`Sitemap: ${site.url}/sitemap-index.xml`)) errors.push('robots.txt has no sitemap line');
    if (/Disallow:\s*\/\s*$/m.test(r)) errors.push('robots.txt blocks everything');
  }
  if (existsSync(join(dist, `${site.indexNowKey}.txt`)) && readFileSync(join(dist, `${site.indexNowKey}.txt`), 'utf8').trim() !== site.indexNowKey) errors.push('IndexNow key file content mismatch');
  return errors;
}

// ---------- main ----------
function contentEntries() {
  const list = [];
  for (const [dir, kind, base] of [['src/content/guides', 'guide', site.guideBase], ['src/content/posts', 'post', site.postBase]]) {
    const p = join(root, dir);
    if (!existsSync(p)) continue;
    for (const n of readdirSync(p)) {
      if (!n.endsWith('.md') || n.startsWith('_')) continue;
      const file = join(p, n);
      const { fm } = splitFrontmatter(readFileSync(file, 'utf8'));
      list.push({ file, kind, fm, path: `/${base}/${fm?.slug}/` });
    }
  }
  return list;
}

function report(results, extra = []) {
  const failed = results.filter((r) => r.errors.length);
  if (flag('--json')) console.log(JSON.stringify({ pass: failed.length === 0 && extra.length === 0, results, siteErrors: extra }, null, 2));
  else {
    for (const r of results) {
      const id = r.file ?? r.page;
      if (r.errors.length) { console.log(`FAIL ${id}`); for (const m of r.errors) console.log(`  - ${m}`); }
      for (const w of r.warnings ?? []) console.log(`WARN ${id}: ${w}`);
    }
    for (const m of extra) console.log(`FAIL site: ${m}`);
    console.log(`gate: ${results.length - failed.length}/${results.length} checks passed${extra.length ? `, ${extra.length} site errors` : ''}`);
  }
  return failed.length === 0 && extra.length === 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const logFile = resolve(root, opt('--log') ?? 'ops/publish-log.jsonl');
  const now = opt('--now') ? new Date(opt('--now')) : new Date();
  let logEntries;
  try { logEntries = readLog(logFile); } catch (err) { console.error(String(err.message)); process.exit(2); }
  const entries = contentEntries();
  const staticPaths = ['/', '/guides/', '/picks/', '/about/', '/methodology/', '/contact/', '/privacy/', '/terms/', '/disclaimer/', ...site.categories.map((c) => `/category/${c.slug}/`)];
  const knownPaths = new Set([...staticPaths, ...entries.map((x) => x.path)]);
  const src = opt('--source');
  if (src) {
    const file = resolve(src);
    if (!existsSync(file)) { console.error(`no such file ${src}`); process.exit(2); }
    const ok = report([gateSource(file, { logEntries, now, knownPaths })]);
    process.exit(ok ? 0 : 1);
  }
  const slug = opt('--slug');
  // source gate: published log rows for the same slug are allowed only for already-published files
  const publishedSlugs = new Set(logEntries.map((r) => r.slug));
  const results = [];
  for (const x of entries) {
    const rowsForOthers = x.kind === 'post' && publishedSlugs.has(x.fm?.slug) && x.fm?.slug !== slug
      ? logEntries.filter((r) => r.slug !== x.fm.slug) // already-live post: do not flag itself as duplicate
      : logEntries;
    results.push(gateSource(x.file, { kind: x.kind, logEntries: rowsForOthers, now, knownPaths }));
  }
  if (slug && !entries.some((x) => x.fm?.slug === slug)) { console.error(`slug ${slug} not found in src/content/posts`); process.exit(2); }
  const dist = join(root, 'dist');
  if (!existsSync(dist)) { console.error('dist/ missing: run pnpm build first'); process.exit(2); }
  const sitemap = existsSync(join(dist, 'sitemap-0.xml')) ? readFileSync(join(dist, 'sitemap-0.xml'), 'utf8') : '';
  const sitemapLocs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1])));
  const entryMap = new Map(entries.map((x) => [x.path, x]));
  for (const f of walkHtml(dist)) {
    const rel = relative(dist, f).split(sep).join('/');
    if (rel === '404.html' || rel === '404/index.html') continue;
    results.push(gatePage(f, dist, { sitemapLocs, entries: entryMap }));
  }
  for (const x of entries) if (!existsSync(join(dist, x.path, 'index.html'))) results.push({ page: x.path, errors: ['content entry not built'], warnings: [] });
  const ok = report(results, siteFiles(dist));
  process.exit(ok ? 0 : 1);
}
