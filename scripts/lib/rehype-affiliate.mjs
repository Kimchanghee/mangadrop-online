// Adds rel="sponsored nofollow noopener" + data-product-link to markdown links that point at an
// affiliate-program host (src/data/providers.json). Other external links get rel="noopener".
import { readFileSync } from 'node:fs';

const providers = JSON.parse(readFileSync(new URL('../../src/data/providers.json', import.meta.url), 'utf8'));
const affiliateHosts = new Set(
  Object.entries(providers).filter(([k]) => !k.startsWith('_')).flatMap(([, p]) => p.hosts),
);

function walk(node, fn) {
  fn(node);
  if (node.children) for (const c of node.children) walk(c, fn);
}

export function rehypeAffiliate() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return;
      const href = String(node.properties?.href ?? '');
      if (!/^https?:\/\//.test(href)) return;
      let host = '';
      try { host = new URL(href).host; } catch { return; }
      if (affiliateHosts.has(host)) {
        node.properties.rel = ['sponsored', 'nofollow', 'noopener'];
        node.properties.target = '_blank';
        node.properties.dataProductLink = 'intext';
      } else {
        node.properties.rel = ['noopener'];
      }
    });
  };
}
