// Own informational diagrams for posts: mobile-first 1080x1350 portrait PNGs.
// Usage: node scripts/diagram.mjs <spec.json> <outDir>
// spec: [{ name, kicker, title, kind: 'cards'|'list', items: [{ label, big?, unit?, text, hl? }], foot }]
// Fails if any text would render under 12px at a 390px-wide display (source font < 34px),
// or if content overflows the 1080x1350 canvas.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('../../_qa-tools/node_modules/playwright');

const W = 1080, H = 1350, DISPLAY = 390, MIN_DISPLAY_PX = 12;
const MIN_SRC_PX = Math.ceil((MIN_DISPLAY_PX * W) / DISPLAY); // 34
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const css = `*{box-sizing:border-box;margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:#f6f1e7;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1f1b16;padding:64px 64px 56px;display:flex;flex-direction:column}
.k{font:700 34px/1.2 'Malgun Gothic',sans-serif;letter-spacing:.06em;color:#a33a2a}
h1{font-size:68px;line-height:1.22;margin:18px 0 40px;letter-spacing:-.02em;word-break:keep-all}
.cards{display:flex;flex-direction:column;gap:24px}
.card{background:#fffdf8;border:3px solid #1f1b16;border-radius:10px;padding:28px 32px;display:grid;grid-template-columns:auto 1fr;gap:4px 28px;align-items:center}
.card.hl{background:#1f1b16;color:#f6f1e7}
.big{grid-row:span 2;font-size:96px;font-weight:800;line-height:1;white-space:nowrap}.big small{font-size:40px;margin-left:4px}
.lab{font-size:44px;font-weight:800;line-height:1.2;word-break:keep-all}
.txt{font-size:36px;line-height:1.4;word-break:keep-all}
.card.nobig{grid-template-columns:1fr}.card.nobig .lab,.card.nobig .txt{grid-column:1}
ol{list-style:none;padding:0;display:flex;flex-direction:column;gap:6px}
ol li{border-bottom:3px dashed #cfc4b2;padding:18px 0;display:grid;grid-template-columns:80px 1fr;gap:4px 16px}
ol b{font-size:40px;font-weight:800;color:#a33a2a;grid-row:span 2}
ol .lab{font-size:46px}ol .txt{color:#5f564b}
.foot{margin-top:auto;padding-top:24px;font-size:34px;line-height:1.4;color:#5f564b;word-break:keep-all}`;

function html(d) {
  const items = d.kind === 'list'
    ? `<ol>${d.items.map((it, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span class="lab">${esc(it.label)}</span><span class="txt">${esc(it.text)}</span></li>`).join('')}</ol>`
    : `<div class="cards">${d.items.map((it) => `<div class="card${it.hl ? ' hl' : ''}${it.big ? '' : ' nobig'}">${it.big ? `<span class="big">${esc(it.big)}<small>${esc(it.unit ?? '')}</small></span>` : ''}<span class="lab">${esc(it.label)}</span><span class="txt">${esc(it.text)}</span></div>`).join('')}</div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style></head><body><p class="k">${esc(d.kicker)}</p><h1>${esc(d.title)}</h1>${items}<p class="foot">${esc(d.foot)}</p></body></html>`;
}

const [specPath, outDir] = process.argv.slice(2);
if (!specPath || !outDir) { console.error('usage: node scripts/diagram.mjs <spec.json> <outDir>'); process.exit(2); }
const specs = JSON.parse(readFileSync(specPath, 'utf8'));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  for (const d of specs) {
    if (!/^[a-z0-9-]+$/.test(d.name)) throw new Error('bad diagram name ' + d.name);
    await page.setContent(html(d));
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const els = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
      const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
      const foot = document.querySelector('.foot').getBoundingClientRect();
      const overflowX = document.documentElement.scrollWidth > innerWidth || els.some((e) => e.getBoundingClientRect().right > innerWidth - 8);
      const body = document.querySelector('.cards,ol').getBoundingClientRect();
      return { minFont: Math.min(...sizes), bottom: Math.round(foot.bottom), overlap: body.bottom > foot.top - 8, overflowX };
    });
    const minDisplay = +(m.minFont * DISPLAY / W).toFixed(1);
    const ok = m.minFont >= MIN_SRC_PX && m.bottom <= H - 20 && !m.overlap && !m.overflowX;
    if (!ok) failed = true;
    await page.screenshot({ path: join(outDir, d.name + '.png') });
    results.push({ name: d.name, width: W, height: H, minSourceFontPx: m.minFont, minDisplayPxAt390: minDisplay, contentBottom: m.bottom, overlap: m.overlap, overflowX: m.overflowX, ok });
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 1));
process.exit(failed ? 1 : 0);
