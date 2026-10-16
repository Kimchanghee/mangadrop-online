import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gateSource} from '../scripts/gate.mjs';
import {fileURLToPath} from 'node:url';
test('explicit-zone fractional seconds preserve original precision',()=>{
 const schema=readFileSync(new URL('../src/content.config.ts',import.meta.url),'utf8');
 const regex=new RegExp(schema.match(/\.regex\(\/(.*?)\//)[1]);
 for(const value of ['2026-10-16T14:33:04.402Z','2026-10-16T14:33:04.4+09:00','2026-10-16T14:33:04.402123Z','2026-10-16T14:33:04Z']) assert.ok(regex.test(value),value);
 for(const value of ['2026-10-16T14:33:04.','2026-10-16T14:33:04.402','2026-10-16T14:33.402Z']) assert.equal(regex.test(value),false,value);
});
test('actual millisecond guide passes source gate',()=>{
 const result=gateSource(fileURLToPath(new URL('../src/content/guides/reading-lamp-glare.md',import.meta.url)));
 assert.deepEqual(result.errors,[]);
});
