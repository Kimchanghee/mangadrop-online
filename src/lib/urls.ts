import { allGuides, allPosts, guidePath, postPath } from './content';
import { site } from '../site.config';

/** Static info pages with their real last content change date. */
export const infoPages = [
  { path: '/about/', lastmod: '2026-10-15' },
  { path: '/methodology/', lastmod: '2026-10-15' },
  { path: '/contact/', lastmod: '2026-10-15' },
  { path: '/privacy/', lastmod: '2026-10-15' },
  { path: '/terms/', lastmod: '2026-10-15' },
  { path: '/disclaimer/', lastmod: '2026-10-15' },
];

export async function sitemapEntries() {
  const guides = await allGuides();
  const posts = await allPosts();
  const newest = [...guides.map((g) => g.data.updated), ...posts.map((p) => p.data.updated)].sort().pop() ?? '2026-10-15';
  const entries: { loc: string; lastmod: string }[] = [
    { loc: '/', lastmod: newest },
    { loc: '/guides/', lastmod: guides[0]?.data.updated ?? newest },
    { loc: '/picks/', lastmod: posts[0]?.data.updated ?? '2026-10-15' },
    ...site.categories.map((c) => {
      const dates = [...guides, ...posts].filter((e) => e.data.category === c.slug).map((e) => e.data.updated).sort();
      return { loc: `/category/${c.slug}/`, lastmod: dates.pop() ?? newest };
    }),
    ...guides.map((g) => ({ loc: guidePath(g.data.slug), lastmod: g.data.updated })),
    ...posts.map((p) => ({ loc: postPath(p.data.slug), lastmod: p.data.updated })),
    ...infoPages.map((p) => ({ loc: p.path, lastmod: p.lastmod })),
  ];
  return entries.map((e) => ({ loc: site.url + e.loc, lastmod: e.lastmod.slice(0, 10) }));
}

export const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
