<# Isolated local fixture rehearsal. Never writes real src/public/dist/ops. #>
param([string]$Slug = 'zz-dryrun-fixture', [ValidateSet('pass','invalid-source','invalid-built')][string]$Case = 'pass')
$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'dryrun-stage.mjs') --fixture --slug $Slug --case $Case
exit $LASTEXITCODE
