# MangaDrop posting rules (collector-v2)

Approved by the owner on 2026-10-21 ("이대로 적용"). Every manuscript in `ops/queue/`, every post with
`format: collector-v2`, and every post published on/after 2026-10-21 must follow this contract.
`scripts/gate.mjs` enforces the machine-checkable parts (`V2` rules); `ops/queue/dryrun-queue-item.ps1`
runs the full source + built-page gate on a queued item without leaving files behind.

## Identity (do not drift)
- Collector's bookshop: warm paper, oxblood accent, double-rule masthead, ledger tables, catalogue-card
  product box with CSS-drawn volume ticks, printed checklist, dark end CTA.
- Type: Pretendard 400/600/700 (unicode-range dynamic subsets in `public/fonts/pretendard/`) for body/UI,
  Gowun Batang 700 (subset built by `scripts/fonts.mjs` at build time) for brand, H1, H2 and card names.
  Body 19px / 1.75, H2 24px / 700, H1 32px mobile / 42px desktop, nothing under 14px. No monospace anywhere.
  Both fonts are SIL OFL 1.1 (`public/fonts/OFL-*.txt`).
- Mobile side padding 20px (`.wrap`), desktop 720px column + sticky 300px rail (card, specs, button, 5-item TOC).

## Manuscript format
- Frontmatter: `format: collector-v2`, `product.box` (label + volume `ranges`, optional `extra` such as
  card count) so the card graphic shows exact volume ticks, `checklist` 4-6 items (`label` + `text`),
  `faq` 2-3 items, optional `toc` short labels (5), `sources` with direct URLs.
- Body: 1,800-2,600 visible characters including spaces (and at least 1,400 non-space). Two short intro
  paragraphs, then 4-5 question-shaped H2 sections (max 6 H2), paragraphs of 1-3 sentences (<= 260 chars).
- Exactly one ledger table (markdown). Prefix the product row's first cell with `▶` to highlight it.
- At most one in-text affiliate link and it must equal `product.url`; internal guide links >= 1.
- No raw HTML, no code spans, no prices/discounts, ratings, review counts, first-hand or personal-reading
  claims. Disputed values (sizes, dates, ISBNs that differ between retailers) stay omitted.
- Disclosure is rendered first by the template from `providers.json`; never edit it per post.

## Images
- 6-8 distinct scene photos (cover + 5-7 in the body), WebP, unique basenames, unique bytes, all under
  `/images/picks/<slug>/`, each listed in frontmatter `images` with `src`, natural scene `alt`,
  `rights: generated`, `artwork: none`, and also listed in `ops/queue/ready.json` `item.images`
  (`ops/queue/images/<slug>/<basename>`; the publisher copies by basename to the frontmatter `src`).
- The cover is rendered by the template; every other image appears once in the body next to the paragraph
  it illustrates (optional markdown title = caption).
- **No artwork rule:** never reproduce manga cover art, characters, logos or legible titles. Allowed:
  shelves with blank spines, unboxing with blank sleeves, shelf measuring, care supplies, reading corners,
  plain boxes. No Coupang/retailer banner images. Product identity comes from text, the CSS box graphic
  and the exact option string.
- Generate only with the GENEXIS gpt-image skill (Codex ChatGPT bridge), path contract
  `channel-ops/ops/content/<job>/` + `channel-ops/ops/state/<job>/`, max 4 jobs per manifest,
  concurrency <= 2, stop on rate limit. QA every image for text/art leakage and fake claims before use.
  No "AI image" captions or alt text. Images across posts must not be near-duplicates.

## Release
- `pwsh -NoProfile -File ops/queue/dryrun-queue-item.ps1 -Slug <slug>` must pass; only then set
  `dryRunPassedAt` in `ready.json`.
- Ads stay OFF (`site.adsEnabled=false`); GA4 + Naver meta come from `_refs` at build time.
