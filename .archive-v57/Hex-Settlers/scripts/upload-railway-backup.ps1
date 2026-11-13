# Import a Railway volume backup into the private Cloudflare R2 state bucket.
# This script never uploads credentials from .env and never exposes a public URL.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [Parameter(Mandatory=$true)][string]$Bucket,
  [string]$TextureDirectory = '',
  [switch]$DryRun,
  [switch]$SkipTemplate
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Wrangler = Join-Path $ProjectRoot 'cloudflare\node_modules\.bin\wrangler.cmd'
if (-not (Test-Path -LiteralPath $Wrangler)) {
  throw 'Wrangler missing. First run: npm install --prefix .\cloudflare'
}
if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) {
  throw "BackupDirectory does not exist: $BackupDirectory"
}
if ($Bucket -notmatch '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$') {
  throw 'Invalid bucket name; use the actual private R2 bucket name.'
}
$Source = (Resolve-Path -LiteralPath $BackupDirectory).Path
function Find-One([string]$Filename) {
  $found = @(Get-ChildItem -LiteralPath $Source -File -Recurse -ErrorAction Stop | Where-Object { $_.Name -eq $Filename })
  if ($found.Count -eq 0) { return $null }
  if ($found.Count -gt 1) {
    $paths = ($found | ForEach-Object { $_.FullName }) -join '; '
    throw "More than one $Filename found; use a backup folder containing just one volume snapshot: $paths"
  }
  return $found[0]
}
function Send-R2([string]$Key, [string]$Path) {
  Write-Host "  $Key ($([math]::Round((Get-Item -LiteralPath $Path).Length / 1KB)) KiB)"
  if ($DryRun) { return }
  & $Wrangler r2 object put "$Bucket/$Key" '--file' $Path '--remote' '--force'
  if ($LASTEXITCODE -ne 0) { throw "R2 upload failed: $Key (exit $LASTEXITCODE)" }
}
$files = @('users.json','game_history.json','active_rooms.json','rating_policy.json','neural_ai_model.json')
$foundFiles = @{}
foreach ($name in $files) {
  $match = Find-One $name
  if ($null -ne $match) {
    $foundFiles[$name] = $match.FullName
    # PowerShell-native JSON validation avoids quote mangling in `node -e` on Windows.
    # The original source file is read only; no backup content is modified.
    try {
      $fileText = [System.IO.File]::ReadAllText($match.FullName, [System.Text.Encoding]::UTF8)
      $parsed = $fileText | ConvertFrom-Json -ErrorAction Stop
      if ($name -eq 'users.json' -and $parsed.users -isnot [array]) {
        throw 'users.json does not contain a users array'
      }
    } catch {
      throw "Invalid or unexpected JSON: $($match.FullName). $($_.Exception.Message)"
    }
  }
}
if (-not $foundFiles.ContainsKey('users.json')) {
  throw 'users.json not found in the backup. Stopping: do not launch the new game without account data.'
}
Write-Host "Importing Railway state to private R2 bucket '$Bucket'..."
foreach ($name in $files) {
  if ($foundFiles.ContainsKey($name)) { Send-R2 "state/$name" $foundFiles[$name] }
  else { Write-Warning "Missing optional volume file: $name" }
}
if ($TextureDirectory) {
  if (-not (Test-Path -LiteralPath $TextureDirectory -PathType Container)) { throw "TextureDirectory not found: $TextureDirectory" }
  $textures = (Resolve-Path -LiteralPath $TextureDirectory).Path
} else {
  $dirs = @(Get-ChildItem -LiteralPath $Source -Directory -Recurse | Where-Object { $_.Name -eq 'texture-packs' })
  if ($dirs.Count -gt 1) { throw 'Multiple texture-packs folders found; pass -TextureDirectory explicitly.' }
  $textures = if ($dirs.Count -eq 1) { $dirs[0].FullName } else { '' }
}
if ($textures) {
  $uploaded = 0
  foreach ($item in Get-ChildItem -LiteralPath $textures -File -Recurse) {
    $rel = $item.FullName.Substring($textures.Length).TrimStart('\','/').Replace('\','/')
    $parts = $rel.Split('/')
    if ($parts.Count -lt 2 -or $parts[0] -notmatch '^[a-f0-9]{36}$') {
      if ($rel.StartsWith('.uploads/')) { continue }
      Write-Warning "Skipping invalid texture storage path: $rel"; continue
    }
    $safe = $true
    foreach ($part in $parts) {
      if ($part -eq '..' -or $part -eq '.' -or $part -notmatch '^[a-zA-Z0-9 ._-]+$') { $safe = $false }
    }
    if (-not $safe) { Write-Warning "Skipping unsupported texture path: $rel"; continue }
    Send-R2 "state/texture-packs/$rel" $item.FullName
    $uploaded++
  }
  Write-Host "Texture pack assets processed: $uploaded"
} else { Write-Host 'No texture-packs folder found; skipping custom texture assets.' }
if (-not $SkipTemplate) {
  $template = Join-Path $ProjectRoot 'cloudflare\large-assets\texture-pack-template.zip'
  if (-not (Test-Path -LiteralPath $template)) { throw "Missing built-in template file: $template" }
  Send-R2 'assets/texture-pack-template.zip' $template
}
Write-Host 'Import complete. Verify users.json and game_history.json in your R2 dashboard before opening staging.'
Write-Host 'IMPORTANT: Keep this bucket PRIVATE; do not enable R2 public access.'
