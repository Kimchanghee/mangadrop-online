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
