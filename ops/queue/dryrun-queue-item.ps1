<#
  dryrun-queue-item.ps1 -Slug <slug>
  Temporarily places a queued post (ops/queue/<slug>.md), its evidence note and images into the
  build tree, runs scripts/publish.ps1 -DryRun, then removes every placed file again.
  Nothing unpublished stays in src/content/posts or public/images. Exit code = dry-run result.
#>
param([Parameter(Mandatory = $true)][string]$Slug)
$ErrorActionPreference = 'Stop'
if ($Slug -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw 'invalid slug' }
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$post = "src/content/posts/$Slug.md"; $ev = "src/content/posts/_evidence/$Slug.md"; $img = "public/images/picks/$Slug"
foreach ($p in $post, $ev, $img) { if (Test-Path $p) { throw "refusing to overwrite existing $p" } }
$placed = @()
$code = 1
try {
  Copy-Item "ops/queue/$Slug.md" $post; $placed += $post
  Copy-Item "ops/queue/evidence/$Slug.md" $ev; $placed += $ev
  Copy-Item "ops/queue/images/$Slug" $img -Recurse; $placed += $img
  pwsh -NoProfile -File scripts/publish.ps1 -Slug $Slug -DryRun
  $code = $LASTEXITCODE
} finally {
  foreach ($p in $placed) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue }
  foreach ($p in $post, $ev, $img) { if (Test-Path $p) { Write-Host "CLEANUP FAILED: $p" -ForegroundColor Red; $code = 1 } }
}
Write-Host "QUEUE DRYRUN $Slug exit=$code; placed files removed"
exit $code
