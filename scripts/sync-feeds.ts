/**
 * 만화·웹툰·라이트노벨 신간 데이터 수집 파이프라인
 *
 * 출처:
 *  1. 알라딘 OpenAPI (한국 신간) — https://blog.aladin.co.kr/openapi
 *  2. MyAnimeList Jikan API (일본 신간) — https://jikan.moe (무료 비공식)
 *  3. 학산·서울미디어 출판사 RSS — 직접 RSS 폴링
 *  4. 네이버 시리즈 / 카카오 페이지 (스크래핑, robots.txt 준수)
 *
 * 출력: src/data/releases.json
 */
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { XMLParser } from 'fast-xml-parser';

const OUT = join(process.cwd(), 'src/data/releases.json');

interface Release {
  id: string;
  title: string;
  originalTitle?: string;
  author?: string;
  publisher?: string;
  releaseDate: string;        // ISO date
  format: 'manga' | 'webtoon' | 'lightnovel';
  source: 'aladin' | 'mal' | 'rss-haksan' | 'rss-seoulmedia' | 'naver' | 'kakao';
  coverUrl?: string;
  isbn?: string;
  url?: string;
  countryCode: 'KR' | 'JP';
  volumeNumber?: number;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

/* ---------- Aladin OpenAPI ---------- */
async function fetchAladin(): Promise<Release[]> {
  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    console.warn('  ⚠️  ALADIN_TTB_KEY missing, skipping Aladin');
    return [];
  }
  const url = `https://www.aladin.co.kr/ttb/api/ItemList.aspx?TTBKey=${ttbKey}&QueryType=ItemNewAll&MaxResults=50&CategoryId=2552&SearchTarget=Book&output=js&Version=20131101`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.item || []).map((b: any): Release => ({
      id: `aladin-${b.isbn || b.itemId}`,
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      releaseDate: b.pubDate,
      format: 'manga',
      source: 'aladin',
      coverUrl: b.cover,
      isbn: b.isbn,
      url: b.link,
      countryCode: 'KR',
    }));
  } catch (e) {
    console.error('  ❌ Aladin fetch failed:', e);
    return [];
  }
}

/* ---------- MyAnimeList Jikan ---------- */
async function fetchMAL(): Promise<Release[]> {
  try {
    const res = await fetch('https://api.jikan.moe/v4/manga?order_by=start_date&sort=desc&limit=25');
    const data = await res.json();
    return (data.data || []).map((m: any): Release => ({
      id: `mal-${m.mal_id}`,
      title: m.title,
      originalTitle: m.title_japanese,
      author: m.authors?.[0]?.name,
      releaseDate: m.published?.from?.slice(0, 10) || '',
      format: m.type === 'Light Novel' ? 'lightnovel' : 'manga',
      source: 'mal',
      coverUrl: m.images?.jpg?.image_url,
      url: m.url,
      countryCode: 'JP',
    }));
  } catch (e) {
    console.error('  ❌ MAL fetch failed:', e);
    return [];
  }
}

/* ---------- 출판사 RSS ---------- */
async function fetchRss(url: string, source: Release['source']): Promise<Release[]> {
  try {
    const res = await fetch(url);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];
    return items.slice(0, 30).map((it: any, idx: number): Release => ({
      id: `${source}-${idx}-${Date.parse(it.pubDate || '0')}`,
      title: typeof it.title === 'string' ? it.title : it.title?.['#text'] || '',
      releaseDate: it.pubDate ? new Date(it.pubDate).toISOString().slice(0, 10) : '',
      format: 'manga',
      source,
      url: it.link,
      countryCode: 'KR',
    }));
  } catch (e) {
    console.error(`  ❌ RSS fetch failed (${source}):`, e);
    return [];
  }
}

async function main() {
  console.log('→ Fetching Aladin...');
  const aladin = await fetchAladin();
  console.log(`  ✓ ${aladin.length} items`);

  console.log('→ Fetching MyAnimeList...');
  const mal = await fetchMAL();
  console.log(`  ✓ ${mal.length} items`);

  // 출판사 RSS 등은 실제 URL 입수 후 채워넣기 (자리표시자)
  // const haksan = await fetchRss('https://example.com/haksan-rss', 'rss-haksan');

  const all: Release[] = [...aladin, ...mal];

  // 중복 제거 (제목+저자 기준)
  const seen = new Set<string>();
  const dedup = all.filter((r) => {
    const k = `${r.title}|${r.author || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 최신순 정렬
  dedup.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));

  if (!existsSync(dirname(OUT))) await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(dedup, null, 2), 'utf-8');
  console.log(`✅ Wrote ${dedup.length} releases to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
