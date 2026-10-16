import { defineConfig } from 'astro/config';
import { rehypeAffiliate } from './scripts/lib/rehype-affiliate.mjs';

export default defineConfig({
  site: 'https://sportsdash.online',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  markdown: { rehypePlugins: [rehypeAffiliate] },
  devToolbar: { enabled: false },
});
