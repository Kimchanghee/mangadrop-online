import type { APIRoute } from 'astro';
import { site } from '../site.config';

// Explicitly allow search engines (Googlebot, Bingbot, Naver Yeti, Daum) and AI/answer crawlers.
const agents = ['Googlebot', 'Bingbot', 'Yeti', 'Daumoa', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'CCBot'];

export const GET: APIRoute = () =>
  new Response(
    [...agents.map((a) => `User-agent: ${a}\nAllow: /\n`), 'User-agent: *\nAllow: /\n', `Sitemap: ${site.url}/sitemap-index.xml`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
