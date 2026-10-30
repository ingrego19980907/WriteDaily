param([Parameter(Mandatory = $true)][string]$ArchivePath, [Parameter(Mandatory = $true)][string]$DatabaseOutput)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$artifactRoot = [IO.Path]::GetFullPath((Join-Path $workspace '.cache/desktop-restart')) + [IO.Path]::DirectorySeparatorChar
$archiveFile = [IO.Path]::GetFullPath($ArchivePath)
$databaseFile = [IO.Path]::GetFullPath($DatabaseOutput)
if (-not $archiveFile.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($archiveFile) -ne '.zip') { throw 'Only private harness ZIP outputs may be read.' }
if (-not $databaseFile.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($databaseFile) -ne '.sqlite3' -or (Test-Path -LiteralPath $databaseFile)) { throw 'Only a new private harness SQLite artifact may be created.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($archiveFile)
try {
  $manifestEntry = $zip.GetEntry('manifest.json')
  if ($null -eq $manifestEntry -or $manifestEntry.Length -gt 33554432) { throw 'Missing or oversized generated manifest.' }
  $reader = [IO.StreamReader]::new($manifestEntry.Open(), [Text.Encoding]::UTF8)
  try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
  if ($manifest.format -ne 'writedaily-library' -or $manifest.formatVersion -ne 1) { throw 'Unexpected generated backup format.' }
  $expectedNames = @('manifest.json') + @($manifest.files | ForEach-Object { $_.path })
  $names = @($zip.Entries | ForEach-Object { $_.FullName })
  if ($names.Count -ne $expectedNames.Count -or (Compare-Object ($names | Sort-Object) ($expectedNames | Sort-Object))) { throw 'Unexpected generated archive members.' }
  foreach ($file in $manifest.files) {
    if ($file.path -ne 'write-daily.sqlite3' -and $file.path -notmatch '^covers/[0-9a-f-]{36}\.(png|jpe?g|webp)$') { throw 'Unexpected generated member path.' }
    $entry = $zip.GetEntry($file.path)
    if ($null -eq $entry -or $entry.Length -ne $file.byteLength) { throw 'Generated member size mismatch.' }
    $stream = $entry.Open()
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $hex = [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() } finally { $hash.Dispose(); $stream.Dispose() }
    if ($hex -ne $file.sha256) { throw 'Generated member digest mismatch.' }
  }
  # Only the fixed known DB member goes to a fixed new private path. No general extraction.
  $stream = $zip.GetEntry('write-daily.sqlite3').Open()
  $output = [IO.File]::Open($databaseFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
  try { $stream.CopyTo($output); $output.Flush($true) } finally { $output.Dispose(); $stream.Dispose() }
  $manifest | ConvertTo-Json -Depth 8 -Compress
} finally { $zip.Dispose() }
