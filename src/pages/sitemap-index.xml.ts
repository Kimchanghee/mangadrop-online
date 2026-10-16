import type { APIRoute } from 'astro';
import { sitemapEntries } from '../lib/urls';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const entries = await sitemapEntries();
  const last = entries.map((e) => e.lastmod).sort().pop();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${site.url}/sitemap-0.xml</loc><lastmod>${last}</lastmod></sitemap>
</sitemapindex>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
