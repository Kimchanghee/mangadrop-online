import type { APIRoute } from 'astro';
import { allGuides, allPosts, guidePath, postPath } from '../lib/content';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const guides = await allGuides();
  const posts = await allPosts();
  const lastUpdated = [...guides, ...posts].map((e) => String(e.data.updated)).sort().at(-1)?.slice(0, 10) ?? '';
  const lines = [
    `# ${site.name} (${site.nameEn})`,
    '',
    `> ${site.description}`,
    '',
    `Last updated: ${lastUpdated}`,
    '',
    'Korean-language buying guides for manga and webtoon print volumes (editions, ISBN, box sets), light novels, figure display and collection storage, and reading accessories. Edition, ISBN and specification facts come only from publisher, retailer listing or manufacturer pages; no first-hand use, ratings or prices are claimed. Product posts contain affiliate links (Coupang Partners, Toss Shopping) and say so in their first block.',
    '',
    `Full text of every guide and product post: ${site.url}/llms-full.txt`,
    '',
    '## Checklists',
    ...guides.map((g) => `- [${g.data.title}](${site.url}${guidePath(g.data.slug)}): ${g.data.answer}`),
    '',
    '## Product picks',
    ...(posts.length ? posts.map((p) => `- [${p.data.title}](${site.url}${postPath(p.data.slug)}): ${p.data.answer}`) : ['- None published yet.']),
    '',
    '## About',
    `- [About and editorial standards](${site.url}/about/)`,
    `- [How products are picked](${site.url}/methodology/)`,
    `- Contact: ${site.contactEmail}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
