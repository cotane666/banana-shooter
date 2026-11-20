# build2d.ps1 — собирает BANANA SHOOTER 2D в один standalone HTML-файл.
#   01-data.js + 02-audio.js  — перенесены из оригинала (cs3d/src) без изменений
#   03..10*.js                — новый 2D-движок (canvas 2D, сайд-скроллер)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$enc = New-Object System.Text.UTF8Encoding($false)
function ReadU8($p) {
  $t = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
  if ($t.Length -gt 0 -and $t[0] -eq [char]0xFEFF) { $t = $t.Substring(1) }
  return $t
}

$src = Join-Path $root 'src2d'
$data  = ReadU8 (Join-Path $src '01-data.js')
$audio = ReadU8 (Join-Path $src '02-audio.js')

$files = Get-ChildItem $src -Filter '*.js' | Where-Object { $_.Name -notin @('01-data.js','02-audio.js') } | Sort-Object Name
if ($files.Count -eq 0) { throw 'Нет новых модулей в src2d/' }

$parts = @()
foreach ($f in $files) {
  $parts += "/* ===== $($f.Name) ===== */`n" + (ReadU8 $f.FullName)
}
$game = $parts -join "`n`n"

$css  = ReadU8 (Join-Path $src 'style.css')
$html = ReadU8 (Join-Path $src 'shell.html')

$data  = $data  -replace '</script', '<\/script'
$audio = $audio -replace '</script', '<\/script'
$game  = $game  -replace '</script', '<\/script'

$out = $html
$out = $out.Replace('<!--CSS-->', $css)
$out = $out.Replace('<!--LIB_DATA-->', $data)
$out = $out.Replace('<!--LIB_AUDIO-->', $audio)
$out = $out.Replace('<!--GAME-->', $game)

$target = Join-Path $root 'banana-shooter-2d.html'
[System.IO.File]::WriteAllText($target, $out, $enc)
$kb = [math]::Round((Get-Item $target).Length / 1KB)
Write-Host "Собрано banana-shooter-2d.html  ($kb КБ) из $($files.Count) 2D-модулей" -ForegroundColor Green
