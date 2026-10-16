import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const slugs=['reading-lamp-glare','book-humidity-storage','figure-display-dust-uv','reading-stand-fit'];
for(const slug of slugs) test(slug+' content contract',()=>{
const raw=readFileSync(new URL('../src/content/guides/'+slug+'.md',import.meta.url),'utf8');
const [,front,body]=raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);
const fm=JSON.parse(front);
assert.equal(fm.slug,slug); assert.ok(fm.answer.length>=20); assert.ok(fm.answer.length<=220);
assert.ok(fm.description.length>=60 && fm.description.length<=160);
assert.ok(body.replace(/\s/g,'').length>=1400);
assert.ok((body.match(/^## .*\?/gm)||[]).length>=4);
assert.ok(fm.sources.length>=1); assert.ok(fm.faq.length>=2);
for(const s of fm.sources) assert.match(s.url,/^https:\/\/(www\.)?(ccohs.ca|guides.loc.gov|osha.gov|canada.ca)\//);
const links=[...body.matchAll(/\]\(\/guides\/([a-z-]+)\/\)/g)];
assert.ok(links.length>=2); for(const l of links) assert.ok(slugs.includes(l[1]));
assert.ok(!fm.product); assert.doesNotMatch(body,/직접 써보니|내돈내산|별점 [0-9]/);
});
test('default scripts off and no false CMP claim',()=>{
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
assert.match(read('src/site.config.ts'),/adsEnabled: false/);
assert.match(read('src/site.config.ts'),/consentReady: false/);
assert.match(read('src/layouts/Base.astro'),/site.adsEnabled && site.consentReady && <script async/);
assert.match(read('src/components/AdSlot.astro'),/site.adsEnabled && site.consentReady/);
assert.match(read('src/pages/privacy.astro'),/동의 배너는 구현·검증되지 않았습니다/);
assert.match(read('scripts/gate.mjs'),/8/);
});
