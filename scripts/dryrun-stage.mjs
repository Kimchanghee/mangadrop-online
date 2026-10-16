// Local-only rehearsal. Never copies credentials, Wrangler config, git, or release output.
import {cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args=process.argv.slice(2);
const opt=k=>args[args.indexOf(k)+1];
const fixture=args.includes('--fixture');
const mode=args.includes('--case')?opt('--case'):'pass';
const slug=args.includes('--slug')?opt('--slug'):'zz-dryrun-fixture';
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!['pass','invalid-source','invalid-built'].includes(mode))throw Error('invalid rehearsal arguments');
if(!fixture&&mode!=='pass')throw Error('negative cases require fixture');
const protectedDirs=['src','public','dist','ops','content'];
function treeHash(){
 const h=createHash('sha256');
 function walk(p,rel){if(!existsSync(p)){h.update(`missing:${rel}`);return;}const s=lstatSync(p);if(s.isSymbolicLink())throw Error(`protected tree contains link: ${rel}`);h.update(rel+'\0');if(s.isDirectory()){for(const n of readdirSync(p).sort())walk(join(p,n),rel+'/'+n);}else h.update(readFileSync(p));}
 for(const d of protectedDirs)walk(join(root,d),d);return h.digest('hex');
}
const before=treeHash();
const stage=mkdtempSync(join(realpathSync(tmpdir()),'mangadrop-NONDEPLOYABLE-'));
let status=1;
try{
 for(const name of ['src','public','content','scripts','package.json','astro.config.mjs','tsconfig.json'])if(existsSync(join(root,name)))cpSync(join(root,name),join(stage,name),{recursive:true,filter:p=>{if(lstatSync(p).isSymbolicLink())throw Error('input symlink refused: '+p);return true;}});
 mkdirSync(join(stage,'ops'));
 // No live publishing configuration is required for a loopback-only rehearsal.
 const probe=createServer();
 await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
 const previewPort=probe.address().port;
 await new Promise(resolve=>probe.close(resolve));
 for(const n of ['publish.config.json','publish-log.jsonl'])if(existsSync(join(root,'ops',n)))cpSync(join(root,'ops',n),join(stage,'ops',n));
 writeFileSync(join(stage,'ops/publish.config.json'),JSON.stringify({previewPort}));
 // Reuse trusted installed packages, but never junction the writable cache container.
 mkdirSync(join(stage,'node_modules'));
 for(const n of readdirSync(join(root,'node_modules'))){
  if(n.startsWith('.'))continue;
  const source=join(root,'node_modules',n);
  symlinkSync(realpathSync(source),join(stage,'node_modules',n),lstatSync(realpathSync(source)).isDirectory()?'junction':'file');
 }
 const config=join(stage,'astro.config.mjs');
 let configText=readFileSync(config,'utf8');
 if(!configText.includes('defineConfig({'))throw Error('unsupported stage config');
 configText=configText.replace('defineConfig({',`defineConfig({\n  cacheDir: './.astro',\n  vite: { cacheDir: './.vite' },`);
 writeFileSync(config,configText);
 console.log('CACHE ISOLATION: stage .astro/.vite; trusted dependency packages reused, not OS security isolation');
 const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 if(sha.status!==0)throw Error('cannot record source revision');
 writeFileSync(join(stage,'.dryrun-only.json'),JSON.stringify({nonDeployable:true,sourceRoot:root,buildSha:sha.stdout.trim()}));
 writeFileSync(join(stage,'NEVER-DEPLOY.txt'),'TEST ONLY: fake fixture content; no publication or approval evidence.');
 if(fixture){
  const target=join(stage,'src/content/posts',slug+'.md');
  if(existsSync(target))throw Error('fixture slug already exists');
  let text=readFileSync(join(stage,'src/content/posts/_examples/pass-example.md'),'utf8');
  const now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z'),verified=new Date(Date.now()-600000).toISOString().replace(/\.\d{3}Z$/,'Z');
  text=text.replace(/^slug: .*$/m,`slug: ${slug}`).replace(/^(published|updated): .*$/gm,`$1: "${now}"`).replace(/^  verifiedAt: .*$/m,`  verifiedAt: "${verified}"`);
  if(mode==='invalid-source')text=text.replace(/^  optionDetail: .*\r?\n/m,'');
  writeFileSync(target,text);
  mkdirSync(join(stage,'public/images/examples'),{recursive:true});
  cpSync(join(stage,'src/content/posts/_examples/public/images/examples/fixture-cover.png'),join(stage,'public/images/examples/fixture-cover.png'));
  if(mode==='invalid-built')rmSync(join(stage,'public/ads.txt'),{force:true});
 }
 const denied=spawnSync('pwsh',['-NoProfile','-File',join(stage,'scripts/publish.ps1'),'-Slug',slug,'-AllowDeploy'],{cwd:stage,encoding:'utf8',timeout:15000});
 if(denied.status!==1||!denied.stdout.includes('test stage is never deployable'))throw Error('stage deployment denial failed');
 console.log('STAGE DEPLOYMENT DENIED even with -AllowDeploy');
 const run=spawnSync('pwsh',['-NoProfile','-File',join(stage,'scripts/publish.ps1'),'-Slug',slug,'-DryRun'],{cwd:stage,encoding:'utf8',timeout:180000,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
 process.stdout.write(run.stdout??'');process.stderr.write(run.stderr??'');
 status=run.status??1;
 if(status!==0&&existsSync(join(stage,'ops/publish-log.dryrun.jsonl')))throw Error('failed rehearsal wrote success receipt');
 if(run.error)console.error(run.error.message);
 if(status===0){
  const receipt=JSON.parse(readFileSync(join(stage,'ops/publish-log.dryrun.jsonl'),'utf8').trim().split(/\r?\n/).at(-1));
  if(receipt.dryRun!==true||receipt.slug!==slug)throw Error('invalid dryrun receipt');
  console.log('ISOLATED RECEIPT: local verification only; never publication proof');
 }
}finally{
 rmSync(stage,{recursive:true,force:true,maxRetries:3,retryDelay:500});
 const after=treeHash();
 if(before!==after)throw Error('PROTECTED TREE CHANGED: src/public/dist/ops/content');
 console.log(`PROTECTED TREES UNCHANGED sha256=${after}; stage removed=${!existsSync(stage)}`);
}
process.exitCode=status;


