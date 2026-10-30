param(
  [Parameter(Mandatory = $true)][int]$DesktopProcessId,
  [Parameter(Mandatory = $true)][ValidateSet('Save', 'Cancel', 'Open')][string]$Action,
  [string]$Destination,
  [string]$ExpectedFileName,
  [ValidateSet('Export chapter', 'Export book', 'Back up library', 'Choose library backup')][string]$DialogTitle = 'Export chapter'
)
$ErrorActionPreference = 'Stop'
$desktop = Get-Process -Id $DesktopProcessId
if ($desktop.ProcessName -ne 'write-daily-restart') { throw 'Refusing to control another process.' }
if ($Action -ne 'Cancel') {
  $workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
  $artifactRoot = [IO.Path]::GetFullPath((Join-Path $workspace '.cache/desktop-restart')) + [IO.Path]::DirectorySeparatorChar
  $target = [IO.Path]::GetFullPath($Destination)
  $expectedExtension = if ($DialogTitle -in @('Back up library', 'Choose library backup')) { '.zip' } else { '.txt' }
  if (-not $target.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($target) -ne $expectedExtension) { throw 'File test destination must be a private artifact of the expected type.' }
  if ($Action -eq 'Save' -and (Test-Path -LiteralPath $target)) { throw 'Export test must never replace an existing file.' }
  if ($Action -eq 'Open' -and ($DialogTitle -ne 'Choose library backup' -or -not [IO.File]::Exists($target))) { throw 'Only an existing private backup may be opened.' }
}
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ExportDialogWindow {
  [StructLayout(LayoutKind.Sequential)] public struct KeyboardInput { public ushort Key, Scan; public uint Flags, Time; public UIntPtr Extra; }
  [StructLayout(LayoutKind.Sequential)] public struct MouseInput { public int X, Y; public uint Data, Flags, Time; public UIntPtr Extra; }
  [StructLayout(LayoutKind.Explicit)] public struct InputUnion { [FieldOffset(0)] public KeyboardInput Keyboard; [FieldOffset(0)] public MouseInput Mouse; }
  [StructLayout(LayoutKind.Sequential)] public struct Input { public uint Type; public InputUnion Value; }
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint count, Input[] inputs, int size);
  public static void Key(ushort key, bool up) {
    var input = new Input { Type = 1, Value = new InputUnion { Keyboard = new KeyboardInput { Key = key, Flags = up ? 2u : 0u } } };
    if (SendInput(1, new[] { input }, Marshal.SizeOf(typeof(Input))) != 1) throw new InvalidOperationException("Keyboard event was refused.");
  }
  public static void Chord(ushort modifier, ushort key) { Key(modifier, false); Key(key, false); Key(key, true); Key(modifier, true); }
  public delegate bool EnumCallback(IntPtr window, IntPtr data);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumCallback callback, IntPtr data);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsChild(IntPtr parent, IntPtr child);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct GuiInfo { public int Size; public uint Flags; public IntPtr Active, Focus, Capture, MenuOwner, MoveSize, Caret; public Rect CaretRect; }
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint thread, ref GuiInfo info);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", EntryPoint="SendMessageW", CharSet=CharSet.Unicode)] public static extern IntPtr SetText(IntPtr window, uint message, IntPtr wParam, string text);
  [DllImport("user32.dll", EntryPoint="SendMessageW", CharSet=CharSet.Unicode)] public static extern IntPtr ReadText(IntPtr window, uint message, IntPtr wParam, StringBuilder text);
  [DllImport("user32.dll", EntryPoint="SendMessageW")] public static extern IntPtr SelectText(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
  public static IntPtr Dialog(uint process, string title) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((window, data) => {
      uint owner; GetWindowThreadProcessId(window, out owner);
      var text = new StringBuilder(256); GetWindowText(window, text, text.Capacity);
      if (owner == process && text.ToString() == title) { found = window; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
'@
$dialogHandle = [IntPtr]::Zero
for ($attempt = 0; $attempt -lt 100; $attempt++) {
  $dialogHandle = [ExportDialogWindow]::Dialog([uint32]$DesktopProcessId, $DialogTitle)
  if ($dialogHandle -ne [IntPtr]::Zero) { break }
  Start-Sleep -Milliseconds 100
}
if ($dialogHandle -eq [IntPtr]::Zero) { throw 'The owned native export dialog did not appear.' }
[uint32]$dialogOwner = 0
[void][ExportDialogWindow]::GetWindowThreadProcessId($dialogHandle, [ref]$dialogOwner)
if ($dialogOwner -ne $DesktopProcessId) { throw 'Refusing to control a dialog outside the isolated process.' }
$details = @{ processId = $DesktopProcessId; title = $DialogTitle; action = $Action }
if ($Action -eq 'Cancel') {
  if (-not [ExportDialogWindow]::PostMessage($dialogHandle, 0x10, [IntPtr]::Zero, [IntPtr]::Zero)) { throw 'The owned picker could not be cancelled.' }
} else {
  [void][ExportDialogWindow]::SetForegroundWindow($dialogHandle)
  if ([ExportDialogWindow]::GetForegroundWindow() -ne $dialogHandle) { throw 'The owned picker is not foreground; refusing to send keyboard input.' }
  [ExportDialogWindow]::Chord(0x12, 0x4E)
  Start-Sleep -Milliseconds 100
  if ([ExportDialogWindow]::GetForegroundWindow() -ne $dialogHandle) { throw 'The owned picker lost foreground.' }
  $info = New-Object ExportDialogWindow+GuiInfo
  $info.Size = [Runtime.InteropServices.Marshal]::SizeOf($info)
  [uint32]$focusOwner = 0
  $dialogThread = [ExportDialogWindow]::GetWindowThreadProcessId($dialogHandle, [ref]$focusOwner)
  if (-not [ExportDialogWindow]::GetGUIThreadInfo($dialogThread, [ref]$info) -or -not [ExportDialogWindow]::IsChild($dialogHandle, $info.Focus)) { throw 'The private filename input is not inside the owned picker.' }
  $initialName = [Text.StringBuilder]::new(1024)
  [void][ExportDialogWindow]::ReadText($info.Focus, 0xD, [IntPtr]($initialName.Capacity), $initialName)
  $expectedInput = $initialName.ToString() -eq $ExpectedFileName -or $initialName.ToString() -eq [IO.Path]::GetFileNameWithoutExtension($ExpectedFileName)
  if ($DialogTitle -eq 'Back up library') { $expectedInput = $initialName.ToString() -match '^WriteDaily-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(\.zip)?$' }
  if ($Action -eq 'Open') {
    $controlClass = [Text.StringBuilder]::new(128)
    [void][ExportDialogWindow]::GetClassName($info.Focus, $controlClass, $controlClass.Capacity)
    $expectedInput = $controlClass.ToString() -eq 'Edit'
  }
  if (-not $expectedInput) { throw ('The focused control is not the expected filename input: ' + $initialName.ToString()) }
  [void][ExportDialogWindow]::SelectText($info.Focus, 0xB1, [IntPtr]::Zero, [IntPtr](-1))
  [void][ExportDialogWindow]::SetText($info.Focus, 0xC2, [IntPtr]1, $target)
  $readback = [Text.StringBuilder]::new(1024)
  [void][ExportDialogWindow]::ReadText($info.Focus, 0xD, [IntPtr]($readback.Capacity), $readback)
  $acceptedPath = $readback.ToString()
  if ($acceptedPath -ne $target) {
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    $focused = [System.Windows.Automation.AutomationElement]::FocusedElement
    $pattern = $null
    if ($focused.Current.ProcessId -eq $DesktopProcessId -and $focused.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) { $acceptedPath = $pattern.Current.Value }
  }
  for ($attempt = 0; $acceptedPath -ne $target -and $attempt -lt 100; $attempt++) {
    if ([ExportDialogWindow]::GetForegroundWindow() -ne $dialogHandle) { throw 'The owned picker lost foreground during filename entry.' }
    Start-Sleep -Milliseconds 100
    [void][ExportDialogWindow]::GetGUIThreadInfo($dialogThread, [ref]$info)
    $readback.Clear() | Out-Null
    [void][ExportDialogWindow]::ReadText($info.Focus, 0xD, [IntPtr]($readback.Capacity), $readback)
    $acceptedPath = $readback.ToString()
    if ($acceptedPath -ne $target) {
      Add-Type -AssemblyName UIAutomationClient
      $focused = [System.Windows.Automation.AutomationElement]::FocusedElement
      $pattern = $null
      if ($focused.Current.ProcessId -eq $DesktopProcessId -and $focused.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) { $acceptedPath = $pattern.Current.Value }
    }
  }
  if ($acceptedPath -ne $target) { throw ('The filename did not accept the private export path: ' + $acceptedPath) }
  if ([ExportDialogWindow]::GetForegroundWindow() -ne $dialogHandle) { throw 'The owned picker lost foreground before Save.' }
  [ExportDialogWindow]::Key(0x0D, $false)
  [ExportDialogWindow]::Key(0x0D, $true)
  Start-Sleep -Milliseconds 250
  if ([ExportDialogWindow]::GetForegroundWindow() -eq $dialogHandle) {
    [ExportDialogWindow]::Key(0x0D, $false)
    [ExportDialogWindow]::Key(0x0D, $true)
  }
  $details.destination = $acceptedPath
}
$details | ConvertTo-Json -Compress
