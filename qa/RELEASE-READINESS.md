# MangaDrop local release QA, 2026-10-16

Scope: only mangadrop.online, branch v2-cloudflare-static, starting commit 0387c03. No deployment, accounts, DNS or sibling writes.

## Verified local candidate
- ISO collection schema and source gate accept fractional seconds with an explicit timezone, including original millisecond observations. No published/updated timestamp was rounded or rewritten. Regression includes whole seconds, fractional precision, missing zone and malformed fraction.
- Direct installed Node + Astro with ASTRO_TELEMETRY_DISABLED=1: static build PASS, 21 HTML pages; Astro check 0 errors / 0 warnings / 3 unused-import hints; gate 28/28; node tests 16/16.
- Fixed actual provider type cast error by indexing the known provider ID instead of asserting metadata as a provider.
- Three guides were 21–42 non-space characters below the existing gate. Added specific measurement/model/ISBN purchase checks, retaining limits and sources; did not lower the gate. Eight substantive guides remain.
- Isolated source-gate fixture repaired (current category/internal route and generated test image under excluded _examples). No fixture copied to release public content. Local HTTP crawl explicitly rejects fixture marker leakage.
- Same-process local HTTP server + installed Edge: home, reading-lamp-glare and bookshelf-load-anchoring at CSS viewport 390 and 1440, six captures. All 200, scrollWidth equals viewport, zero broken images and zero ad script/slot matches. All 21 built HTML files served 200; unknown path returned 404. Browser and server closed in finally.
- See local-qa.json and ignored qa/screens/*.png. Screens visually inspected: original book-spine hero, parchment/plum reading surface and numbered shelf entries are distinct from the SportsDash equipment-log homepage (read-only source comparison). Changed inherited green links to plum and LOG CARD to LIBRARY CARD. Fixed real mobile two-digit shelf number wrapping with nowrap. Final mobile image confirms numbers on one line. Readable 19px body / 24px H2 maintained.
- Source-limit spot-check: BILLY numbers restricted to exact model; 13kg and 30mm are arithmetic examples, not tested safe ratings; workplace lux guidance is not a medical/home prescription; exterior case dimensions are not interior dimensions. No invented usage, price or affiliate product.
- AdsEnabled/consentReady remain false; affiliate configuration empty. Ad account metadata and ads.txt are configuration, not active ad delivery or account approval.

## Remaining, not claimed
- No public release, domain routing, account verification or live public QA. This is a locally validated static editorial candidate, not a deployed or monetized service.
- Publisher DryRun/trusted commerce evidence/security review were not run in this bounded static-QA task. Recurring affiliate publishing is NOT release-approved by these results.
- Full side-by-side browser comparison with all siblings and external OSS design-reference/license audit remain unverified. No external design code was newly copied.
- Browser QA helper relies on existing read-only ../_qa-tools Playwright and installed Edge; it is a local harness, not a production dependency.
- Three unused-import diagnostic hints remain non-blocking. Source freshness remains the documented observation date, not a new reread of all remote originals.

## Analytics-only opt-in follow-up (2026-10-17)
- Base no longer ties analytics to the advertising CMP flag. `PUBLIC_GA4_ID` is emitted in the actual conditional loader's `data-ga4-id`; verified build uses `G-388R5752FD`. Missing configuration renders no analytics control/loader. No metadata-only workaround.
- Footer in normal document flow: Korean allow/decline/change, visible keyboard focus, live status, minimum 44px controls, persistent browser choice. Unknown/invalid/unwritable stored choice fails closed. Allow starts GA once per document; ad_storage, ad_user_data, ad_personalization always denied, Google signals/personalization disabled.
- Withdrawal disables measurement immediately, neutralizes the event wrapper, removes accessible `_ga` and this ID's `_ga_388R5752FD` cookies across host/domain/path variants, and reloads to unload Google's event handlers. Previously transmitted data/in-flight requests cannot be retracted. Cross-tab choice changes reload the document. No certified CMP or legal-compliance guarantee is asserted. adsEnabled and consentReady remain false.
- `node scripts/qa-analytics.mjs`: installed Edge, isolated same-process HTTP server, 390 and 1440 CSS px. Undecided and persisted decline: zero site-originated external requests. Accept and accepted reload: exactly one Google loader request per document, intercepted and ABORTED. Consent/config queue independently checked; all ad consent values denied. Withdrawal and next-page navigation: zero further Google requests. Synthetic own GA cookies deleted, unrelated cookie preserved. This is NOT proof of Google ingestion, GA console configuration or live account collection.
- Host antivirus injects Kaspersky script requests into local browser pages; QA explicitly records and aborts those separately (5 per viewport). They are not site analytics and are not silently counted as absent.
- `qa/analytics-qa.json` contains machine-readable results; `qa/screens/analytics-{390,1440}.png` visually inspected, no text/button overlap, no horizontal overflow, equal-weight allow/decline controls measured 46.6875px tall. Browser contexts/server closed in finally.
- Privacy updated to exact current opt-in/withdrawal behavior. Existing old no-banner wording test updated to assert the new explicit non-certified-CMP disclosure, while keeping all ad-off assertions.
- Build 21 pages; gate 28/28; node tests 19/19 (including new fail-closed, consent isolation and withdrawal regressions). No deployment or account work.
- Final Astro check: 43 files, 0 errors, 0 warnings, 5 non-blocking hints (including test harness unused parameters).
