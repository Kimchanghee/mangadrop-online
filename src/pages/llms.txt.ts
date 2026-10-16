import type { APIRoute } from 'astro';
import { allGuides, allPosts, guidePath, postPath } from '../lib/content';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const guides = await allGuides();
  const posts = await allPosts();
  const lines = [
    `# ${site.name} (${site.nameEn})`,
    '',
    `> ${site.description}`,
    '',
    'Korean-language buying checklists for home training, running, camping and outdoor gear. Specs are taken only from manufacturer pages or official bodies; no first-hand testing is claimed. Product posts contain affiliate links (Coupang Partners, Ohouse, Toss Shopping, Naver Shopping Connect) and say so in their first block.',
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
