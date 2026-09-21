param([string]$Scenario = 'play', [string]$Out = 'cs_play.png', [int]$W = 1600, [int]$H = 900, [switch]$Touch, [switch]$Mobile)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$html = [System.IO.File]::ReadAllText((Join-Path $root 'banana-shooter.html'))
$inject = [System.IO.File]::ReadAllText((Join-Path $root '_shot-inject.js'))
$test = $html.Replace('</body>', "<script>`n$inject`n</script>`n</body>")
$testPath = Join-Path $root '_shot.html'
[System.IO.File]::WriteAllText($testPath, $test, (New-Object System.Text.UTF8Encoding($false)))

$outDir = Join-Path $env:TEMP 'opencode'
$prof = Join-Path $outDir 'chromeprof'
$shot = Join-Path $outDir $Out
if (Test-Path $shot) { Remove-Item $shot -Force }
$url = 'file:///C:/Users/lisen/OneDrive/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B/ai%20project%201/cs3d/_shot.html#' + $Scenario
if ($Touch -or $Mobile) { $url = $url -replace '\.html', '.html?touch=1' }
$udd = '--user-data-dir=' + $prof
$vtb = '--virtual-time-budget=20000'
$size = '--window-size=' + $W + ',' + $H
$screen = '--screenshot=' + $shot
$cargs = @('--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio', $udd,
  $size, $vtb, '--hide-scrollbars', $screen)
if ($Touch -or $Mobile) { $cargs += '--touch-events=enabled' }
$cargs += $url
& "C:\Program Files\Google\Chrome\Application\chrome.exe" $cargs 2>$null | Out-Null
if (Test-Path $shot) { Write-Host ("OK " + $Out + "  " + [math]::Round((Get-Item $shot).Length / 1KB) + " KB") -ForegroundColor Green }
else { Write-Host "FAILED $Out" -ForegroundColor Red }
