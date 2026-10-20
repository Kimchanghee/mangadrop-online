import { defineConfig } from 'astro/config';
import { rehypeAffiliate } from './scripts/lib/rehype-affiliate.mjs';
import { rehypeCollector } from './scripts/lib/rehype-collector.mjs';

export default defineConfig({
  site: 'https://mangadrop.online',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  markdown: { rehypePlugins: [rehypeAffiliate, rehypeCollector] },
  devToolbar: { enabled: false },
});
