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
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
function Fail($msg) { Write-Host "PUBLISH FAIL: $msg" -ForegroundColor Red; exit 1 }

$cfg = Get-Content (Join-Path $root 'ops/publish.config.json') -Raw | ConvertFrom-Json
$site = $null  # set from post-info (src/data/site.json)
$log = Join-Path $root 'ops/publish-log.jsonl'
$postPath = $null
foreach ($ext in 'md', 'mdx') { $p = Join-Path $root "src/content/posts/$Slug.$ext"; if (Test-Path $p) { $postPath = $p } }
if (-not $postPath) { Fail "post src/content/posts/$Slug.md(x) not found" }

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
pnpm build
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
node scripts/gate.mjs --slug $Slug --log $log
if ($LASTEXITCODE -ne 0) { Fail 'built-page gate failed' }
$buildSha = (git rev-parse --short HEAD).Trim()

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
  npx wrangler deploy
  if ($LASTEXITCODE -ne 0) { Fail 'wrangler deploy failed' }
  $origin = $site
}

# 4. verify the page: 200 + title + disclosure + exact product href
$url = "$site$($fm.path)"; $checkUrl = "$origin$($fm.path)"
$ok = $false; $why = ''
try {
  for ($i = 0; $i -lt 6 -and -not $ok; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 20
      $html = $r.Content
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
$rec = [ordered]@{ slug = $Slug; url = $url; 'product.url' = $productUrl; provider = $provider; publishedAt = $fm.published; liveVerifiedAt = $now; buildSha = $buildSha; dryRun = [bool]$DryRun } | ConvertTo-Json -Compress
$target = if ($DryRun) { Join-Path $root 'ops/publish-log.dryrun.jsonl' } else { $log }
Add-Content -Path $target -Value $rec -Encoding utf8
Write-Host "PUBLISH OK$(if($DryRun){' (dry run)'}): $url" -ForegroundColor Green
exit 0
