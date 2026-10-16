import type { APIRoute } from 'astro';
import { site } from '../site.config';

// Allow all crawlers, including search (Googlebot, Yeti) and AI crawlers.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
