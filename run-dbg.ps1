param([int]$Timeout = 40000, [string]$Inject = '_dbg-inject.js', [switch]$Touch, [string]$Url = '')
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$html = [System.IO.File]::ReadAllText((Join-Path $root 'index.html'))
$inject = [System.IO.File]::ReadAllText((Join-Path $root $Inject))
$test = $html.Replace('</body>', "<script>`n$inject`n</script>`n</body>")
$testPath = Join-Path $root '_test.html'
[System.IO.File]::WriteAllText($testPath, $test, (New-Object System.Text.UTF8Encoding($false)))

$prof = Join-Path (Join-Path $env:TEMP 'opencode') 'chromeprof'
if (-not $Url) {
  $Url = 'file:///C:/Users/lisen/OneDrive/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B/ai%20project%201/cs3d/_test.html'
}
if ($Touch) { $Url = $Url -replace '\.html', '.html?touch=1' }
$vtb = '--virtual-time-budget=' + $Timeout
$udd = '--user-data-dir=' + $prof
$cargs = @('--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio', $udd, '--window-size=1280,720', $vtb, '--dump-dom')
if ($Touch) { $cargs += '--touch-events=enabled' }
$cargs += $Url
$dom = & "C:\Program Files\Google\Chrome\Application\chrome.exe" $cargs 2>&1 | Out-String

$m = [regex]::Match($dom, '(?s)id="__report"[^>]*>(.*?)</div>')
if (-not $m.Success) { Write-Host "NO REPORT" -ForegroundColor Red; Write-Host $dom.Substring(0, 900); exit 1 }
$raw = $m.Groups[1].Value
$json = $raw -replace '&quot;', '"' -replace '&amp;', '&' -replace '&lt;', '<' -replace '&gt;', '>' -replace '&#39;', "'"
$o = $json | ConvertFrom-Json
if ($o.dbg) { $o.dbg | ForEach-Object { Write-Host $_ } }
if ($o.errors -and $o.errors.Count -gt 0) { Write-Host "=== ERRORS ===" -ForegroundColor Red; $o.errors | ForEach-Object { Write-Host $_ -ForegroundColor Red } }
else { Write-Host "=== NO ERRORS ===" -ForegroundColor Green }
