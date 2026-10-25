param(
  [Parameter(Mandatory = $true)][int]$DesktopProcessId,
  [string]$ScreenshotPath,
  [switch]$Close
)
$ErrorActionPreference = 'Stop'
$desktop = Get-Process -Id $DesktopProcessId
if ($desktop.ProcessName -ne 'write-daily-restart') { throw 'Refusing to inspect/close an unrelated process.' }
if ($Close) {
  if (-not $desktop.CloseMainWindow()) { throw 'Native window did not accept a close request.' }
  exit 0
}
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class RestartWindow {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr window, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
'@
[void][RestartWindow]::SetThreadDpiAwarenessContext([IntPtr](-4))
$handle = $desktop.MainWindowHandle
if ($handle -eq [IntPtr]::Zero -or -not [RestartWindow]::IsWindowVisible($handle)) { throw 'No visible native window.' }
$rect = New-Object RestartWindow+Rect
if (-not [RestartWindow]::GetWindowRect($handle, [ref]$rect)) { throw 'Could not inspect native window bounds.' }
if ($ScreenshotPath) {
  $workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
  $artifactRoot = [IO.Path]::GetFullPath((Join-Path $workspace '.cache/desktop-restart')) + [IO.Path]::DirectorySeparatorChar
  $target = [IO.Path]::GetFullPath($ScreenshotPath)
  if (-not $target.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Screenshot must stay under .cache/desktop-restart.' }
  $bitmap = New-Object Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $dc = $graphics.GetHdc()
  try { $captured = [RestartWindow]::PrintWindow($handle, $dc, 2) }
  finally { $graphics.ReleaseHdc($dc); $graphics.Dispose() }
  try {
    if (-not $captured) { throw 'Native PrintWindow capture failed.' }
    $bitmap.Save($target, [Drawing.Imaging.ImageFormat]::Png)
  } finally { $bitmap.Dispose() }
}
@{ processId = $desktop.Id; title = $desktop.MainWindowTitle; visible = $true; width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top } | ConvertTo-Json -Compress
