import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import siteData from './data/site.json';

const categorySlugs = siteData.categories.map((c) => c.slug) as [string, ...string[]];
const isoWithZone = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/, 'ISO datetime with explicit Z or +09:00');

const source = z.object({ title: z.string().min(2), url: z.string().url() });
const faq = z.object({ q: z.string().min(4), a: z.string().min(10) });
const image = z.object({
  src: z.string().startsWith('/'),
  alt: z.string().min(4),
  role: z.enum(['cover', 'context', 'detail', 'comparison', 'use']),
  credit: z.string().min(2),
  rights: z.enum(['generated', 'provider-api', 'own']),
});

// Hourly affiliate posts. Files in src/content/posts/_examples/ are excluded (pattern is top-level only).
const posts = defineCollection({
  loader: glob({ pattern: '[!_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(8).max(60),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    question: z.string().min(6),
    answer: z.string().min(20),
    description: z.string().min(60).max(160),
    published: isoWithZone,
    updated: isoWithZone,
    category: z.enum(categorySlugs),
    primaryKeyword: z.string().min(2),
    product: z.object({
      name: z.string().min(2),
      optionDetail: z.string().min(1),
      provider: z.enum(['coupang', 'ohou', 'toss', 'naver', 'amazon']),
      url: z.string().url(),
      landingHost: z.string().min(3),
      verifiedAt: isoWithZone,
      evidence: z.string().min(3),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    }),
    images: z.array(image).min(1),
    sources: z.array(source).min(1),
    faq: z.array(faq).default([]),
    disclosure: z.string().optional(),
  }),
});

// Evergreen buying-criteria guides (no affiliate links).
const guides = defineCollection({
  loader: glob({ pattern: '[!_]*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(8).max(60),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    question: z.string().min(6),
    answer: z.string().min(20),
    description: z.string().min(60).max(160),
    published: isoWithZone,
    updated: isoWithZone,
    data_asof: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.enum(categorySlugs),
    primaryKeyword: z.string().min(2),
    checklist: z.array(z.string()).min(3),
    sources: z.array(source).min(1),
    faq: z.array(faq).default([]),
  }),
});

export const collections = { posts, guides };
