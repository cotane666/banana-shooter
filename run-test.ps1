# Builds a test copy of banana-shooter.html with the test harness injected, then runs it in headless Chrome.
param(
  [switch]$Shot,
  [int]$Timeout = 60000
)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$html = [System.IO.File]::ReadAllText((Join-Path $root 'banana-shooter.html'))
$inject = [System.IO.File]::ReadAllText((Join-Path $root '_test-inject.js'))
$test = $html.Replace('</body>', "<script>`n$inject`n</script>`n</body>")
$testPath = Join-Path $root '_test.html'
[System.IO.File]::WriteAllText($testPath, $test, (New-Object System.Text.UTF8Encoding($false)))

$outDir = Join-Path $env:TEMP 'opencode'
$prof = Join-Path $outDir 'chromeprof'
$url = 'file:///C:/Users/lisen/OneDrive/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B/ai%20project%201/cs3d/_test.html'

$vtb = '--virtual-time-budget=' + $Timeout
$udd = '--user-data-dir=' + $prof
$cargs = @(
  '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
  $udd, '--window-size=1280,720',
  $vtb,
  '--dump-dom'
)
if ($Shot) {
  $shot = Join-Path $outDir 'cs_shot.png'
  $cargs += ('--screenshot=' + $shot)
}
$cargs += $url

$dom = & "C:\Program Files\Google\Chrome\Application\chrome.exe" $cargs 2>&1 | Out-String
$m = [regex]::Match($dom, '(?s)id="__report"[^>]*>(.*?)</div>')
if (-not $m.Success) {
  Write-Host "NO REPORT FOUND - page may have crashed early" -ForegroundColor Red
  $t = [regex]::Match($dom, '(?s)<title>(.*?)</title>')
  Write-Host ("title: " + $t.Groups[1].Value)
  Write-Host "--- first 1500 chars of DOM ---"
  Write-Host $dom.Substring(0, [Math]::Min(1500, $dom.Length))
  exit 1
}
$raw = $m.Groups[1].Value
# unescape html entities
$json = $raw -replace '&quot;', '"' -replace '&amp;', '&' -replace '&lt;', '<' -replace '&gt;', '>' -replace '&#39;', "'"
$obj = $json | ConvertFrom-Json
Write-Host "=== REPORT ===" -ForegroundColor Cyan
$obj | ConvertTo-Json -Depth 6
if ($obj.errors -and $obj.errors.Count -gt 0) {
  Write-Host "=== ERRORS ===" -ForegroundColor Red
  $obj.errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
  Write-Host "=== NO ERRORS ===" -ForegroundColor Green
}
