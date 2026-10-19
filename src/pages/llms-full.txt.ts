import type { APIRoute } from 'astro';
import { allGuides, allPosts, guidePath, postPath, disclosureFor } from '../lib/content';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const guides = await allGuides();
  const posts = await allPosts();
  const g = guides.map((x) => [
    `## ${x.data.title}`,
    `URL: ${site.url}${guidePath(x.data.slug)}`,
    `Updated: ${x.data.updated.slice(0, 10)} · Data as of: ${x.data.data_asof}`,
    '',
    x.data.answer,
    '',
    'Checklist:',
    ...x.data.checklist.map((c) => `- ${c}`),
    '',
    (x.body ?? '').trim(),
    '',
    `Sources: ${x.data.sources.map((s) => s.url).join(', ')}`,
  ].join('\n'));
  const p = posts.map((x) => [
    `## ${x.data.title}`,
    `URL: ${site.url}${postPath(x.data.slug)}`,
    `Published: ${x.data.published.slice(0, 10)} · Updated: ${x.data.updated.slice(0, 10)}`,
    `Disclosure: ${disclosureFor(x)}`,
    `Product: ${x.data.product.name} (${x.data.product.optionDetail}); details checked ${x.data.product.verifiedAt.slice(0, 10)}`,
    '',
    x.data.answer,
    '',
    (x.body ?? '').trim(),
    '',
    `Sources: ${x.data.sources.map((s) => s.url).join(', ')}`,
  ].join('\n'));
  const body = [
    `# ${site.name} (${site.nameEn}) — full text`,
    '',
    `> ${site.description}`,
    '',
    '# Guides',
    '',
    g.join('\n\n'),
    '',
    '# Product posts',
    '',
    p.length ? p.join('\n\n') : 'None published yet.',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
