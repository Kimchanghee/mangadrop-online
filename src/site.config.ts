import siteData from './data/site.json';
import providers from './data/providers.json';

const env = import.meta.env;

export type ProviderId = 'coupang' | 'ohou' | 'toss' | 'naver' | 'amazon';

export const site = {
  ...siteData,
  // Remains off until parent verifies account approval and certified CMP integration.
  adsEnabled: false,
  consentReady: false,
  ga4Id: (env.PUBLIC_GA4_ID as string | undefined) ?? '',
  gscVerification: (env.PUBLIC_GSC_VERIFICATION as string | undefined) ?? '',
  naverVerification: (env.PUBLIC_NAVER_VERIFICATION as string | undefined) ?? '',
  adsenseClient: 'ca-pub-4490818204529253',
  /** Site-level affiliate home links (e.g. a provider storefront). Empty until the owner configures them. */
  affiliate: {
    coupang: '',
    ohou: '',
    toss: '',
    naver: '',
  } as Record<string, string>,
  /** Consent Mode v2: regions where storage defaults to denied. */
  consentDeniedRegions: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
    'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
  ],
};

export function providerInfo(id: ProviderId) {
  return providers[id];
}

export function categoryBySlug(slug: string) {
  return site.categories.find((c) => c.slug === slug);
}

export const abs = (p: string) => new URL(p, site.url).href;
