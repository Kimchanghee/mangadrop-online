import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const [label,args,expected] of [
 ['deploy requires explicit parent opt-in',['-Slug','not-a-post'],'deployment disabled by default'],
 ['traversal rejected',['-Slug','../_examples/pass-example','-DryRun'],'invalid slug'],
 ['missing dry-run post rejected',['-Slug','not-a-post','-DryRun'],'not found']])test(label,()=>{const r=spawnSync('pwsh',['-NoProfile','-File','scripts/publish.ps1',...args],{encoding:'utf8'});assert.equal(r.status,1);assert.ok((r.stdout+r.stderr).includes(expected),r.stdout+r.stderr);});
