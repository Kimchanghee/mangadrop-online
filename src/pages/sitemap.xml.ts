import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join } from 'path';

const SITE = 'https://mangadrop.online';

export const GET: APIRoute = async () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const entries: Array<{ loc: string; priority: number; changefreq: string }> = [
    { loc: SITE, priority: 1.0, changefreq: 'daily' },
    { loc: `${SITE}/calendar`, priority: 0.95, changefreq: 'daily' },
    { loc: `${SITE}/manga`, priority: 0.9, changefreq: 'daily' },
    { loc: `${SITE}/webtoon`, priority: 0.9, changefreq: 'daily' },
    { loc: `${SITE}/lightnovel`, priority: 0.9, changefreq: 'daily' },
  ];

  // 작품별 페이지 (있으면)
  try {
    const data = await readFile(join(process.cwd(), 'src/data/releases.json'), 'utf-8');
    const releases: any[] = JSON.parse(data);
    for (const r of releases.slice(0, 1000)) {
      entries.push({ loc: `${SITE}/title/${encodeURIComponent(r.id)}`, priority: 0.6, changefreq: 'weekly' });
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
