<#
  dryrun-fixture.ps1 - end-to-end rehearsal of publish.ps1 -DryRun with a temporary, clearly-marked fixture post.
  Copies src/content/posts/_examples/pass-example.md to src/content/posts/<slug>.md with fresh dates,
  copies the fixture image into public/, runs publish.ps1 -DryRun (gate -> build -> built gate -> local preview
  verify -> dry-run receipt), then removes every temporary file and rebuilds so dist/ holds no fixture.
  Exit code = publish.ps1 exit code. Never touches ops/publish-log.jsonl.
#>
param([string]$Slug = 'zz-dryrun-fixture')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$post = Join-Path $root "src/content/posts/$Slug.md"
$imgDir = Join-Path $root 'public/images/examples'
$img = Join-Path $imgDir 'fixture-cover.png'
$og = Join-Path $root "public/og/picks/$Slug.png"
$hadImgDir = Test-Path $imgDir
if (Test-Path $post) { Write-Host "refusing: $post already exists"; exit 2 }
$now = Get-Date
$kst = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId($now.ToUniversalTime(), 'Korea Standard Time')
$pub = $kst.ToString("yyyy-MM-dd'T'HH:mm:00+09:00")
$ver = $kst.AddMinutes(-10).ToString("yyyy-MM-dd'T'HH:mm:00+09:00")
$code = 1
try {
  $src = Get-Content (Join-Path $root 'src/content/posts/_examples/pass-example.md') -Raw -Encoding utf8
  $src = $src -replace '(?m)^slug: .*$', "slug: $Slug"
  $src = $src -replace '(?m)^published: .*$', "published: `"$pub`""
  $src = $src -replace '(?m)^updated: .*$', "updated: `"$pub`""
  $src = $src -replace '(?m)^  verifiedAt: .*$', "  verifiedAt: `"$ver`""
  [System.IO.File]::WriteAllText($post, $src, (New-Object System.Text.UTF8Encoding($false)))
  New-Item -ItemType Directory -Force $imgDir | Out-Null
  Copy-Item (Join-Path $root 'src/content/posts/_examples/public/images/examples/fixture-cover.png') $img -Force
  & pwsh -NoProfile -File (Join-Path $PSScriptRoot 'publish.ps1') -Slug $Slug -DryRun
  $code = $LASTEXITCODE
} finally {
  Remove-Item $post -Force -ErrorAction SilentlyContinue
  Remove-Item $og -Force -ErrorAction SilentlyContinue
  if ($hadImgDir) { Remove-Item $img -Force -ErrorAction SilentlyContinue } else { Remove-Item (Join-Path $root 'public/images') -Recurse -Force -ErrorAction SilentlyContinue }
  pnpm build *> $null
}
Write-Host "dry-run rehearsal exit code: $code"
exit $code
