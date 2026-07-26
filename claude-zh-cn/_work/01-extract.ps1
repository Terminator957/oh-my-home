# Claude Desktop zh-CN language pack :: step 1 - extract & diagnose
# Writes everything under D:\Coding\workplace\Claude\claude-zh-cn\_work
[CmdletBinding()]
param([switch]$Elevated)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$WorkDir = "D:\Coding\workplace\Claude\claude-zh-cn\_work"
$utf8 = [System.Text.UTF8Encoding]::new($false)
$lines = New-Object System.Collections.Generic.List[string]
function L([string]$m) { $lines.Add($m); Write-Host $m }

# --- self elevate ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin -and -not $Elevated) {
    Write-Host "Requesting administrator privileges (please click Yes on the UAC prompt)..."
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-Elevated"
    )
    exit
}

New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
L "=== Claude Desktop zh-CN pack :: extract & diagnose ==="
L ("timestamp: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
L ("isAdmin: " + $isAdmin)
L ""

# --- locate Claude ---
$claudePath = $null
$pkgInfo = $null
try {
    $pkg = Get-AppxPackage -Name Claude -ErrorAction Stop | Sort-Object Version -Descending | Select-Object -First 1
    if ($pkg) {
        $claudePath = $pkg.InstallLocation
        $pkgInfo = "$($pkg.PackageFullName) | version=$($pkg.Version) | family=$($pkg.PackageFamilyName)"
    }
} catch { L "Get-AppxPackage failed: $($_.Exception.Message)" }

if (-not $claudePath) {
    $wa = Join-Path ${env:ProgramFiles} "WindowsApps"
    $c = Get-ChildItem -LiteralPath $wa -Directory -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -like "Claude*" } | Sort-Object Name -Descending | Select-Object -First 1
    if ($c) { $claudePath = $c.FullName }
}

if (-not $claudePath) { L "FATAL: Claude Desktop not found"; [System.IO.File]::WriteAllText((Join-Path $WorkDir "diag.txt"), ($lines -join "`r`n"), $utf8); exit 1 }

L "claudePath: $claudePath"
L "appxPackage: $pkgInfo"

$manifest = Join-Path $claudePath "AppxManifest.xml"
if (Test-Path -LiteralPath $manifest) {
    try {
        [xml]$mx = Get-Content -LiteralPath $manifest -Raw
        L ("manifest.Identity.Version: " + $mx.Package.Identity.Version)
        L ("manifest.Identity.Name: " + $mx.Package.Identity.Name)
        L ("manifest.Application.Id: " + (@($mx.Package.Applications.Application)[0].Id))
    } catch { L "manifest parse failed: $($_.Exception.Message)" }
}

$res = Join-Path $claudePath "app\resources"
L "resourcesPath: $res  exists=$(Test-Path -LiteralPath $res)"
if (-not (Test-Path -LiteralPath $res)) {
    L "FATAL: resources dir missing"
    [System.IO.File]::WriteAllText((Join-Path $WorkDir "diag.txt"), ($lines -join "`r`n"), $utf8); exit 1
}
L ""

# --- inventory ---
L "--- resources top level ---"
Get-ChildItem -LiteralPath $res -ErrorAction SilentlyContinue | ForEach-Object {
    L ("  {0,-45} {1,12} {2}" -f $_.Name, $(if ($_.PSIsContainer) { "<DIR>" } else { $_.Length }), $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm"))
}
L ""
foreach ($sub in @("ion-dist", "ion-dist\i18n", "ion-dist\i18n\statsig", "ion-dist\assets\v1")) {
    $p = Join-Path $res $sub
    L "--- $sub ---  exists=$(Test-Path -LiteralPath $p)"
    if (Test-Path -LiteralPath $p) {
        Get-ChildItem -LiteralPath $p -ErrorAction SilentlyContinue | ForEach-Object {
            L ("  {0,-55} {1,12} {2}" -f $_.Name, $(if ($_.PSIsContainer) { "<DIR>" } else { $_.Length }), $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm"))
        }
    }
    L ""
}

# --- copy en-US sources + any existing zh-CN ---
$copyList = @(
    @{ Name = "ion-dist\en-US.json";         Src = (Join-Path $res "ion-dist\i18n\en-US.json") }
    @{ Name = "desktop-shell\en-US.json";    Src = (Join-Path $res "en-US.json") }
    @{ Name = "statsig\en-US.json";          Src = (Join-Path $res "ion-dist\i18n\statsig\en-US.json") }
    @{ Name = "installed\ion-dist.zh-CN.json";        Src = (Join-Path $res "ion-dist\i18n\zh-CN.json") }
    @{ Name = "installed\desktop-shell.zh-CN.json";   Src = (Join-Path $res "zh-CN.json") }
    @{ Name = "installed\statsig.zh-CN.json";         Src = (Join-Path $res "ion-dist\i18n\statsig\zh-CN.json") }
    @{ Name = "installed\ion-dist.zh-CN.overrides.json"; Src = (Join-Path $res "ion-dist\i18n\zh-CN.overrides.json") }
)
L "--- copying files to _work\current ---"
foreach ($c in $copyList) {
    $dst = Join-Path $WorkDir ("current\" + $c.Name)
    if (Test-Path -LiteralPath $c.Src -PathType Leaf) {
        try {
            [System.IO.Directory]::CreateDirectory((Split-Path -Parent $dst)) | Out-Null
            Copy-Item -LiteralPath $c.Src -Destination $dst -Force -ErrorAction Stop
            L ("  OK   {0,-42} {1} bytes" -f $c.Name, (Get-Item -LiteralPath $dst).Length)
        } catch { L ("  FAIL {0}  -> {1}" -f $c.Name, $_.Exception.Message) }
    } else {
        L ("  SKIP {0}  (source not present)" -f $c.Name)
    }
}
L ""

# --- JS locale list probe ---
L "--- assets\v1 JS locale-array probe ---"
$assets = Join-Path $res "ion-dist\assets\v1"
$rx = [regex]'(?:[\w$]+)=\["en-US"(?:,"[^"]+")+\]'
$jsReport = New-Object System.Collections.Generic.List[string]
if (Test-Path -LiteralPath $assets) {
    $js = Get-ChildItem -LiteralPath $assets -Filter "*.js" -File -ErrorAction SilentlyContinue
    L ("  js file count: " + @($js).Count)
    foreach ($f in $js) {
        try {
            $txt = [System.IO.File]::ReadAllText($f.FullName)
        } catch { L ("  FAIL read {0}: {1}" -f $f.Name, $_.Exception.Message); continue }
        $hasZh = $txt.Contains('"zh-CN"')
        $ms = $rx.Matches($txt)
        L ("  {0,-40} size={1,10}  containsZhCN={2}  localeArrayMatches={3}" -f $f.Name, $f.Length, $hasZh, $ms.Count)
        foreach ($m in $ms) { $jsReport.Add("$($f.Name) @ $($m.Index) :: $($m.Value)") }
        # also probe any array literal that lists en-US among quoted locales, looser
        if ($ms.Count -eq 0) {
            $rx2 = [regex]'\[(?:"[a-z]{2}(?:-[A-Za-z]{2,4})?",){1,}"[a-z]{2}(?:-[A-Za-z]{2,4})?"\]'
            $ms2 = $rx2.Matches($txt)
            $seen = @{}
            foreach ($m in $ms2) { if (-not $seen.ContainsKey($m.Value)) { $seen[$m.Value] = 1; $jsReport.Add("LOOSE $($f.Name) @ $($m.Index) :: $($m.Value)") } }
            L ("      loose locale-array candidates: " + $seen.Count)
        }
    }
} else { L "  assets\v1 missing" }
[System.IO.File]::WriteAllText((Join-Path $WorkDir "js-locale-arrays.txt"), ($jsReport -join "`r`n"), $utf8)
L ""

# --- config.json ---
L "--- config.json ---"
$base = Join-Path ${env:LOCALAPPDATA} "Packages\Claude_pzs8sxrjxfjjc"
L "packageLocalAppData: $base  exists=$(Test-Path -LiteralPath $base)"
foreach ($cp in @(
    (Join-Path $base "LocalCache\Roaming\Claude\config.json"),
    (Join-Path $base "LocalCache\Roaming\Claude-3p\config.json"),
    (Join-Path ${env:APPDATA} "Claude\config.json"),
    (Join-Path ${env:APPDATA} "Claude-3p\config.json")
)) {
    if (Test-Path -LiteralPath $cp -PathType Leaf) {
        $raw = Get-Content -LiteralPath $cp -Raw -Encoding UTF8
        $loc = if ($raw -match '"locale"\s*:\s*"([^"]*)"') { $Matches[1] } else { "<none>" }
        L "  $cp  locale=$loc  bytes=$((Get-Item -LiteralPath $cp).Length)"
        $dst = Join-Path $WorkDir ("current\config\" + ((Split-Path -Parent $cp | Split-Path -Leaf) + ".config.json"))
        [System.IO.Directory]::CreateDirectory((Split-Path -Parent $dst)) | Out-Null
        Copy-Item -LiteralPath $cp -Destination $dst -Force -ErrorAction SilentlyContinue
    } else { L "  $cp  <missing>" }
}
L ""
L "--- claude processes ---"
Get-Process -Name "claude" -ErrorAction SilentlyContinue | ForEach-Object { L ("  pid={0} start={1}" -f $_.Id, $_.StartTime) }
L ""
L "DONE"

[System.IO.File]::WriteAllText((Join-Path $WorkDir "diag.txt"), ($lines -join "`r`n"), $utf8)
Write-Host ""
Write-Host "Report written to $WorkDir\diag.txt"
Write-Host "Press Enter to close."
[void](Read-Host)
