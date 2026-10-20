// Collector layout for markdown bodies:
//  - a paragraph that holds only an image becomes <figure class="photo"> (title -> figcaption);
//    width/height come from the real file in public/ so the browser reserves space (no CLS),
//    portrait files (older diagrams) get photo--portrait so they are never cropped.
//  - tables get a .table-wrap, data-l labels from the header row (mobile stacking) and the first
//    row whose first cell starts with "▶" is marked as the product row (marker removed).
//  - <del> from single-tilde ranges is turned back into literal "~" text.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = fileURLToPath(new URL('../../public/', import.meta.url));
const text = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(text).join(''));
const cache = new Map();
async function dims(src) {
  if (cache.has(src)) return cache.get(src);
  const file = join(pub, decodeURI(src));
  let d = null;
  if (src.startsWith('/') && existsSync(file)) { try { const m = await sharp(file).metadata(); d = { w: m.width, h: m.height }; } catch { d = null; } }
  cache.set(src, d);
  return d;
}

export function rehypeCollector() {
  return async (tree) => {
    const jobs = [];
    const visit = (node, parent, index) => {
      if (node.type === 'element' && node.tagName === 'p' && parent) {
        const kids = (node.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()));
        if (kids.length === 1 && kids[0].type === 'element' && kids[0].tagName === 'img') {
          const img = kids[0];
          jobs.push((async () => {
            const src = String(img.properties.src ?? '');
            const d = await dims(src);
            const portrait = d ? d.h > d.w : false;
            img.properties.loading = 'lazy';
            img.properties.decoding = 'async';
            if (d) { img.properties.width = d.w; img.properties.height = d.h; }
            const caption = img.properties.title; delete img.properties.title;
            const fig = { type: 'element', tagName: 'figure', properties: { className: portrait ? ['photo', 'photo--portrait'] : ['photo'] }, children: [img] };
            if (caption) fig.children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: String(caption) }] });
            parent.children[index] = fig;
          })());
          return;
        }
      }
      if (node.type === 'element' && node.tagName === 'table' && parent) {
        const thead = node.children.find((c) => c.tagName === 'thead');
        const tbody = node.children.find((c) => c.tagName === 'tbody');
        const headRow = thead?.children.find((c) => c.tagName === 'tr');
        const labels = (headRow?.children ?? []).filter((c) => c.tagName === 'th').map((c) => text(c).trim());
        let marked = false;
        for (const tr of (tbody?.children ?? []).filter((c) => c.tagName === 'tr')) {
          const cells = tr.children.filter((c) => c.tagName === 'td' || c.tagName === 'th');
          cells.forEach((td, i) => { td.properties = { ...(td.properties ?? {}), dataL: labels[i] ?? '' }; });
          const first = cells[0];
          const firstText = first?.children?.find((c) => c.type === 'text');
          if (!marked && firstText && firstText.value.trimStart().startsWith('▶')) {
            firstText.value = firstText.value.replace(/^\s*▶\s*/, '');
            tr.properties = { ...(tr.properties ?? {}), className: ['is-this'] };
            marked = true;
          }
        }
        for (let i = 0; i < node.children.length; i++) visit(node.children[i], node, i);
        parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table-wrap'] }, children: [node] };
        return;
      }
      // GFM reads "1~12, 13~23" as strikethrough; volume ranges must stay literal.
      if (node.type === 'element' && node.tagName === 'del' && parent) {
        parent.children.splice(index, 1, { type: 'text', value: '~' }, ...(node.children ?? []), { type: 'text', value: '~' });
        return;
      }
      for (let i = 0; i < (node.children ?? []).length; i++) visit(node.children[i], node, i);
    };
    visit(tree, null, 0);
    await Promise.all(jobs);
  };
}
