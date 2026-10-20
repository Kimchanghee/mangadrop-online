<#
  publish.ps1 -Slug <slug> [-DryRun]
  gate -> build -> wrangler deploy -> live verify (200 + title + disclosure + exact product href)
  -> IndexNow ping -> append ops/publish-log.jsonl. Exits non-zero on any failure.
  -DryRun: everything except deploy/ping; verification runs against a local `astro preview`,
  and the receipt is written to ops/publish-log.dryrun.jsonl (never the real log, so the
  30-day duplicate window is not polluted).
  Site URL comes from src/data/site.json; ops/publish.config.json holds indexNowKey, previewPort.
#>
param(
  [Parameter(Mandatory = $true)][string]$Slug,
  [switch]$DryRun, [switch]$AllowDeploy,
  [ValidatePattern('^(verified|inconclusive-[a-z0-9-]+)$')][string]$LiveCheck = 'verified'
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
function Fail($msg) { Write-Host "PUBLISH FAIL: $msg" -ForegroundColor Red; exit 1 }

# A test stage can never enter the deployment path, even with explicit opt-in.
$stageMarker = Join-Path $root '.dryrun-only.json'
$staged = Test-Path $stageMarker
if ($staged -and -not $DryRun) { Fail 'test stage is never deployable' }
if ($staged) {
  $tempRoot = (& node -p "require('fs').realpathSync(require('os').tmpdir())").TrimEnd('\') + '\'
  if (-not $root.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $root -Leaf) -notlike 'mangadrop-NONDEPLOYABLE-*') { Fail 'invalid dryrun staging location' }
  $stageInfo = Get-Content $stageMarker -Raw | ConvertFrom-Json
  if ($stageInfo.nonDeployable -ne $true) { Fail 'invalid dryrun staging marker' }
}
if ($Slug -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { Fail 'invalid slug; paths and traversal are forbidden' }
if (-not $DryRun -and -not $AllowDeploy) { Fail 'deployment disabled by default; parent must explicitly pass -AllowDeploy' }
if ($DryRun -and -not $staged) {
  if (-not (Test-Path (Join-Path $root "src/content/posts/$Slug.md")) -and -not (Test-Path (Join-Path $root "src/content/posts/$Slug.mdx"))) { Fail 'post not found' }
  node (Join-Path $PSScriptRoot 'dryrun-stage.mjs') --slug $Slug
  exit $LASTEXITCODE
}
# Fixture recognition applies to all buildable posts, not only the requested slug.
if (-not $DryRun) {
  foreach ($candidate in Get-ChildItem (Join-Path $root 'src/content/posts') -File) {
    if ($candidate.Extension -in '.md','.mdx' -and (Get-Content $candidate.FullName -Raw) -match 'FIXTURE|fixture:\s*true|example-only') { Fail 'fixture content is never deployable' }
  }
}
$intent = Join-Path $root "ops/publish-pending-$Slug.json"
if (-not $DryRun -and (Test-Path $intent)) { Fail 'unreconciled publish intent exists; inspect live destination before retrying' }
$cfg = Get-Content (Join-Path $root 'ops/publish.config.json') -Raw | ConvertFrom-Json
$site = $null  # set from post-info (src/data/site.json)
$log = Join-Path $root 'ops/publish-log.jsonl'
$postPath = $null
foreach ($ext in 'md', 'mdx') { $p = Join-Path $root "src/content/posts/$Slug.$ext"; if (Test-Path $p) { $postPath = $p } }
if (-not $postPath) { Fail "post src/content/posts/$Slug.md(x) not found" }

if (-not $DryRun -and (Get-Content $postPath -Raw) -match 'FIXTURE|fixture: true|example-only') { Fail 'fixture content is never deployable' }
# 0. never retry-publish a duplicate slug
if ((Test-Path $log) -and (Select-String -Path $log -SimpleMatch "`"slug`":`"$Slug`"" -Quiet)) {
  Fail "slug '$Slug' already in ops/publish-log.jsonl - refusing duplicate publish"
}

# 1. source gate (frontmatter, disclosure, links, length, H2s, banned phrases, 30-day duplicates)
node scripts/gate.mjs --source $postPath --log $log
if ($LASTEXITCODE -ne 0) { Fail 'source gate failed' }

# read product URL / title / disclosure from the post frontmatter
$fm = node scripts/post-info.mjs $postPath | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Fail 'could not read post frontmatter' }
$productUrl = $fm.productUrl; $title = $fm.title; $provider = $fm.provider
if (-not $productUrl -or -not $title -or -not $fm.disclosure) { Fail 'title/product.url/disclosure missing' }
$site = $fm.siteUrl

# 2. build + full built-page gate for this slug
$env:ASTRO_TELEMETRY_DISABLED = '1'
# Public build env: GA4 id (required) and Naver verification (optional) from the parent _refs folder.
$refs = Join-Path (Split-Path -Parent $root) '_refs'
if ($staged) { $refs = Join-Path $stageInfo.sourceRoot '..\_refs' }
$gaFile = Join-Path $refs 'ga4-ids.json'
if (-not (Test-Path $gaFile)) { Fail "GA4 id file not found: $gaFile" }
$gaId = (Get-Content $gaFile -Raw | ConvertFrom-Json).mangadrop.id
if ($gaId -notmatch '^G-[A-Z0-9]+$') { Fail 'GA4 id for mangadrop missing or malformed' }
$env:PUBLIC_GA4_ID = $gaId
$naverFile = Join-Path $refs 'naver-verification\tokens.json'
if (Test-Path $naverFile) {
  $naverToken = (Get-Content $naverFile -Raw | ConvertFrom-Json).tokens.'mangadrop.online'
  if ($naverToken -and $naverToken -notmatch '^[A-Za-z0-9_-]{10,100}$') { Fail 'Naver verification token malformed' }
  if ($naverToken) { $env:PUBLIC_NAVER_VERIFICATION = $naverToken }
}
if (-not $DryRun) { $cfEnv = Join-Path $refs 'cf-env.ps1'; if (Test-Path $cfEnv) { . $cfEnv } }
node scripts/fonts.mjs
if ($LASTEXITCODE -ne 0) { Fail 'font subset build failed' }
node scripts/og.mjs
if ($LASTEXITCODE -ne 0) { Fail 'OG generation failed' }
node node_modules/astro/astro.js build --force
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
node scripts/gate.mjs --slug $Slug --log $log
if ($LASTEXITCODE -ne 0) { Fail 'built-page gate failed' }
$builtHome = Get-Content (Join-Path $root 'dist/index.html') -Raw
if (-not $builtHome.Contains($gaId)) { Fail "GA4 id $gaId not found in dist/index.html" }
if ($env:PUBLIC_NAVER_VERIFICATION -and -not $builtHome.Contains('naver-site-verification')) { Fail 'Naver verification meta missing from dist/index.html' }
if ($builtHome -match 'adsbygoogle\.js|pagead2\.googlesyndication\.com/pagead/js') { Fail 'ad loader present in build; ads must stay OFF' }
$buildSha = if ($staged) { $stageInfo.buildSha } else { (git rev-parse --short HEAD).Trim() }

# 3. deploy (skipped in DryRun) and choose verification origin
$preview = $null
if ($DryRun) {
  $port = if ($cfg.previewPort) { $cfg.previewPort } else { 4411 }
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Fail "preview port $port is already in use; stop that server or change ops/publish.config.json previewPort" }
  $nodeExe = (& node -p "process.execPath").Trim()
  $preview = Start-Process -FilePath $nodeExe -ArgumentList @('node_modules/astro/astro.js', 'preview', '--port', "$port", '--host', '127.0.0.1') -WorkingDirectory $root -PassThru -WindowStyle Hidden
  $origin = "http://127.0.0.1:$port"
  Start-Sleep -Seconds 4
} else {
  $intentStream = [System.IO.File]::Open($intent, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
  try { $bytes = [Text.Encoding]::UTF8.GetBytes((@{slug=$Slug; attemptedAt=(Get-Date).ToUniversalTime().ToString('o'); buildSha=$buildSha} | ConvertTo-Json)); $intentStream.Write($bytes,0,$bytes.Length); $intentStream.Flush($true) } finally { $intentStream.Dispose() }
  # Same deploy path as _refs/deploy-site.ps1: pinned toolchain wrangler + generated config that keeps apex/www custom domains.
  if (-not $global:WRANGLER -or -not (Test-Path $global:WRANGLER)) { Fail 'pinned wrangler not available (_refs/cf-env.ps1 must define $WRANGLER)' }
  if (-not $env:CLOUDFLARE_ACCOUNT_ID) { Fail 'CLOUDFLARE_ACCOUNT_ID missing' }
  $domain = ([Uri]$site).Host
  $cfgObj = ((Get-Content (Join-Path $root 'wrangler.jsonc') -Raw) -replace '(?m)^\s*//.*$','') | ConvertFrom-Json
  $cfgObj | Add-Member -NotePropertyName routes -NotePropertyValue @(@{pattern=$domain; custom_domain=$true}, @{pattern="www.$domain"; custom_domain=$true}) -Force
  $cfgObj | Add-Member -NotePropertyName account_id -NotePropertyValue $env:CLOUDFLARE_ACCOUNT_ID -Force
  $cfgObj | Add-Member -NotePropertyName workers_dev -NotePropertyValue $false -Force
  $cfgObj | Add-Member -NotePropertyName preview_urls -NotePropertyValue $false -Force
  $deployCfg = Join-Path $root '.wrangler.deploy.json'
  $cfgObj | ConvertTo-Json -Depth 10 | Set-Content $deployCfg -Encoding utf8
  node $global:WRANGLER deploy --config $deployCfg
  $deployExit = $LASTEXITCODE
  Remove-Item $deployCfg -Force -ErrorAction SilentlyContinue
  if ($deployExit -ne 0) { Fail 'wrangler deploy failed' }
  $origin = $site
}

# 4. verify the page: 200 + title + disclosure + exact product href
$url = "$site$($fm.path)"; $checkUrl = "$origin$($fm.path)"
$ok = $false; $why = ''
try {
  for ($i = 0; $i -lt 6 -and -not $ok; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 20
      $html = [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
      $hrefEsc = [System.Net.WebUtility]::HtmlEncode($productUrl)
      if ($r.StatusCode -ne 200) { $why = "status $($r.StatusCode)" }
      elseif (-not $html.Contains([System.Net.WebUtility]::HtmlEncode($title)) -and -not $html.Contains($title)) { $why = 'title missing' }
      elseif (-not $html.Contains($fm.disclosure)) { $why = 'disclosure missing' }
      elseif (-not ($html.Contains("href=`"$productUrl`"") -or $html.Contains("href=`"$hrefEsc`""))) { $why = 'exact product href missing' }
      else { $ok = $true }
    } catch { $why = $_.Exception.Message }
    if (-not $ok) { Start-Sleep -Seconds 5 }
  }
} finally { if ($preview) { Stop-Process -Id $preview.Id -Force -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process -Filter "ParentProcessId=$($preview.Id)" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } }
if (-not $ok) { Fail "verify $checkUrl : $why" }

# 5. IndexNow (skipped in DryRun)
if (-not $DryRun) {
  $body = @{ host = ([Uri]$site).Host; key = $cfg.indexNowKey; keyLocation = "$site/$($cfg.indexNowKey).txt"; urlList = @($url) } | ConvertTo-Json
  try { Invoke-RestMethod -Method Post -Uri 'https://api.indexnow.org/indexnow' -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null }
  catch { Fail "IndexNow ping failed: $($_.Exception.Message)" }
}

# 6. receipt
$now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$rec = [ordered]@{ slug = $Slug; url = $url; 'product.url' = $productUrl; provider = $provider; publishedAt = $now; contentPublishedAt = $fm.published; liveVerifiedAt = $now; buildSha = $buildSha; dryRun = [bool]$DryRun; liveCheck = $LiveCheck } | ConvertTo-Json -Compress
$target = if ($DryRun) { Join-Path $root 'ops/publish-log.dryrun.jsonl' } else { $log }
Add-Content -Path $target -Value $rec -Encoding utf8
if (-not $DryRun) { Remove-Item $intent }
Write-Host "PUBLISH OK$(if($DryRun){' (dry run)'}): $url" -ForegroundColor Green
exit 0
