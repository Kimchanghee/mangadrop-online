import type { APIRoute } from 'astro';
import { allGuides, allPosts, guidePath, postPath } from '../lib/content';
import { xmlEscape } from '../lib/urls';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const items = [
    ...(await allPosts()).map((p) => ({ t: p.data.title, d: p.data.description, l: site.url + postPath(p.data.slug), date: p.data.published })),
    ...(await allGuides()).map((g) => ({ t: g.data.title, d: g.data.description, l: site.url + guidePath(g.data.slug), date: g.data.published })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(site.name)}</title>
  <link>${site.url}/</link>
  <description>${xmlEscape(site.description)}</description>
  <language>ko</language>
  <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items.map((i) => `  <item><title>${xmlEscape(i.t)}</title><link>${i.l}</link><guid isPermaLink="true">${i.l}</guid><pubDate>${new Date(i.date).toUTCString()}</pubDate><description>${xmlEscape(i.d)}</description></item>`).join('\n')}
</channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
