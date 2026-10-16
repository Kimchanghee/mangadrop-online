# PROGRESS — mangadrop.online (v2-cloudflare-static)

Resume from here after host restart.

- [x] 0. Branch v2-cloudflare-static created from main; PROGRESS.md pushed
- [ ] 1. Old Next.js tree removed, Astro 5 scaffold (site.config.ts, wrangler.jsonc, .gitignore)
- [ ] 2. Content collections (posts + guides) with zod schema, layouts, distinct design
- [ ] 3. scripts/gate.mjs (CONTRACT + commerce gate), _examples pass/fail
- [ ] 4. scripts/publish.ps1 (-DryRun), refresh-build.ps1, ops/POSTING-RULES.md
- [ ] 5. >=8 evergreen guides, hubs, legal pages, SEO files (llms.txt, robots, sitemap, RSS, IndexNow)
- [ ] 6. QA: build, gate, astro check, curl crawl, screenshots, seo/scorecard.md

Build order: sportsdash first, then reuse pipeline for whereonott, mangadrop.

## 2026-10-16 continuation
Preservation commit 825a73e. Collector-bookshop shell/config/renderer milestone added. NOT launch-ready: zero guides, dependency install incomplete, build/check/test/gate failed. See HANDOFF.md and qa logs. No deployment or affiliate-account work.


## Four-guide bounded content chunk, 2026-10-16T14:33:04.402Z
- Added four substantive Korean evergreen guides (reading lamps, book humidity/storage, figure display dust/UV, reading stand fit). Actual total is 4, not 8. Full launch gate still requires at least 8; threshold unchanged.
- Primary-source reading record: ops/research/evergreen-four-source-readings.md. Five primary pages inspected, including browser recovery for CCI after fetch resets.
- Answer, visible FAQ, related internal links and source URLs use existing guide renderer. No affiliate links, prices, copied photos or experiential claims.
- Ads default OFF; analytics also held until consentReady. Removed false present-tense certified-CMP claim. No account work or deploy.
- Targeted dependency-free regression: node --test tests/evergreen-four.test.mjs PASS 5/5. This validates source contract, links and ad guards, not browser rendering or full launch readiness.
- Dependency installation retried after tool-server interruptions; copy-mode install log qa/install-content-copy.log. Consult final QA receipt for outcome.
