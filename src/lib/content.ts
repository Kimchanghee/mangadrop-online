import { getCollection, type CollectionEntry } from 'astro:content';
import { site, abs, providerInfo } from '../site.config';

export type Post = CollectionEntry<'posts'>;
export type Guide = CollectionEntry<'guides'>;

export async function allGuides(): Promise<Guide[]> {
  return (await getCollection('guides')).sort((a, b) => b.data.updated.localeCompare(a.data.updated));
}
export async function allPosts(): Promise<Post[]> {
  return (await getCollection('posts')).sort((a, b) => b.data.published.localeCompare(a.data.published));
}

export const guidePath = (slug: string) => `/${site.guideBase}/${slug}/`;
export const postPath = (slug: string) => `/${site.postBase}/${slug}/`;

export function ymd(iso: string) {
  return iso.slice(0, 10);
}

export function disclosureFor(post: Post) {
  return post.data.disclosure ?? providerInfo(post.data.product.provider).disclosure;
}

/** Article.image: the visible hero (cover) photo first, then the generated OG card. */
function articleImages(e: Guide | Post, ogImage: string): string[] {
  const imgs = (e.data as { images?: { src: string; role: string }[] }).images ?? [];
  const hero = imgs.find((i) => i.role === 'cover') ?? imgs[0];
  return [...new Set([hero ? abs(hero.src) : null, abs(ogImage)].filter(Boolean) as string[])];
}

/**
 * <meta name="description"> for article pages. Stored descriptions shorter than 120 chars are
 * extended with sentences of the visible direct answer (never invented text), capped at 160.
 */
export function metaDescription(d: { description: string; answer?: string }): string {
  const base = d.description.trim();
  if (base.length >= 120 || !d.answer) return base;
  const norm = (x: string) => x.replace(/\s+/g, '');
  const sentences = d.answer.split(/(?<=[.!?。])\s+/).map((x) => x.trim()).filter(Boolean);
  let out = base;
  for (const sen of sentences) {
    if (norm(base).includes(norm(sen))) continue;
    const next = `${out} ${sen}`;
    if (next.length <= 160) { out = next; if (out.length >= 120) break; continue; }
    if (out.length < 120) {
      const room = 159 - out.length - 1;
      const cut = sen.slice(0, room);
      const sp = cut.lastIndexOf(' ');
      if (sp > 10) out = `${out} ${cut.slice(0, sp).replace(/[,·、\s]+$/, '')}…`;
    }
    break;
  }
  return out;
}

/** Article LD generated only from frontmatter that is also rendered visibly. */
export function articleLd(kind: 'guide' | 'post', e: Guide | Post, path: string, ogImage: string) {
  const d = e.data;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.title,
    description: d.description,
    datePublished: d.published,
    dateModified: d.updated,
    inLanguage: 'ko-KR',
    mainEntityOfPage: abs(path),
    image: articleImages(e, ogImage),
    author: { '@id': `${site.url}/#organization` },
    publisher: { '@id': `${site.url}/#organization` },
    articleSection: kind === 'guide' ? '구매 체크리스트' : '장비 추천',
    citation: d.sources.map((s) => s.url),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
