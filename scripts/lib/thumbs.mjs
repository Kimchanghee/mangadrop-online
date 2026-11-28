// Card thumbnails (2026-11-28): list pages show /public images at ~160-320 CSS px but used to load the
// full-size file. thumbSrcset() writes srcset candidates under /_thumbs/; the integration generates
// exactly the referenced files into dist after the build (nothing is written to public/ or git).
import { readdirSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RE = /\/_thumbs\/(images\/[^"'\s,?]+?)\.w(\d+)\.webp/g;

/** srcset with resized webp candidates (width descriptors) for a /public image. */
export function srcsetFor(src, widths) {
  if (!src || !src.startsWith('/images/') || !/\.(webp|jpe?g)$/i.test(src)) return undefined; // PNG diagrams keep the original
  const p = src.slice(1);
  return widths.map((w) => `/_thumbs/${p}.w${w}.webp ${w}w`).join(', ');
}
/** srcset for a card image displayed at `cssWidth` px (1x and 2x candidates). */
export const thumbSrcset = (src, cssWidth) => srcsetFor(src, [cssWidth, cssWidth * 2]);
/** Article hero (LCP image): phone/tablet/desktop candidates; the original stays as src fallback. */
export const heroSrcset = (src) => srcsetFor(src, [480, 768, 1080]);
export const HERO_SIZES = '(max-width: 820px) 100vw, 820px';

function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export function thumbs() {
  return {
    name: 'card-thumbs',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { default: sharp } = await import('sharp');
        const dist = fileURLToPath(dir);
        const want = new Map();
        for (const f of htmlFiles(dist)) for (const m of readFileSync(f, 'utf8').matchAll(RE)) want.set(`${m[1]}.w${m[2]}.webp`, { src: m[1], w: Number(m[2]) });
        let made = 0;
        for (const [rel, { src, w }] of want) {
          const input = join(dist, src);
          const output = join(dist, '_thumbs', rel);
          if (!existsSync(input)) throw new Error(`card-thumbs: source missing for ${rel}`);
          if (existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs) continue;
          mkdirSync(dirname(output), { recursive: true });
          await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toFile(output);
          made++;
        }
        logger.info(`card-thumbs: ${want.size} referenced, ${made} generated`);
      },
    },
  };
}
