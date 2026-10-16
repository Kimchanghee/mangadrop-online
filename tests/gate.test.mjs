import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gate = join(root, 'scripts/gate.mjs');
const ex = (n) => join(root, 'src/content/posts/_examples', n);
const run = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: root, encoding: 'utf8' });
const emptyLog = () => { const d = mkdtempSync(join(tmpdir(), 'gate-')); const f = join(d, 'log.jsonl'); writeFileSync(f, ''); return f; };

test('pass fixture passes the source gate', () => {
  const r = run('--source', ex('pass-example.md'), '--log', emptyLog());
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('fail fixture is rejected with the expected reasons', () => {
  const r = run('--source', ex('fail-example.md'), '--json', '--log', emptyLog());
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout);
  const errs = out.results[0].errors.join('\n');
  for (const needle of ['fabricated first-hand', 'not on coupang allowlist', 'no cover image', 'question-shaped H2', 'in-text affiliate links', 'evidence note not found', 'sources[] empty', 'placeholder text', 'description length', 'published must be ISO']) {
    assert.ok(errs.includes(needle), `expected "${needle}" in:\n${errs}`);
  }
});

test('duplicate product URL within 30 days is rejected', () => {
  const d = mkdtempSync(join(tmpdir(), 'gate-'));
  const log = join(d, 'log.jsonl');
  writeFileSync(log, JSON.stringify({ slug: 'older-post', url: 'https://sportsdash.online/picks/older-post/', productUrl: 'https://link.coupang.com/a/FIXTURE-NOT-A-REAL-LINK', provider: 'coupang', publishedAt: '2026-10-10T10:00:00+09:00' }) + '\n');
  const r = run('--source', ex('pass-example.md'), '--log', log, '--now', '2026-10-15T21:00:00+09:00', '--json');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /same product URL published/);
});

test('same slug already in publish log is rejected', () => {
  const d = mkdtempSync(join(tmpdir(), 'gate-'));
  const log = join(d, 'log.jsonl');
  writeFileSync(log, JSON.stringify({ slug: 'example-foam-roller-fixture', productUrl: 'https://link.coupang.com/a/OTHER', publishedAt: '2026-09-01T10:00:00+09:00' }) + '\n');
  const r = run('--source', ex('pass-example.md'), '--log', log, '--json');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /slug already in publish log/);
});
