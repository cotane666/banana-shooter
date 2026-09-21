# Build script: concatenates src/*.js + inlines libs into a single standalone HTML file.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$srcDir = Join-Path $root 'src'
$files = Get-ChildItem $srcDir -Filter '*.js' | Sort-Object Name
if ($files.Count -eq 0) { throw 'No source files found in src/' }

$parts = @()
foreach ($f in $files) {
    $code = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    $parts += "/* ===== $($f.Name) ===== */`n$code"
}
$game = $parts -join "`n`n"

$css = if (Test-Path (Join-Path $root 'src\style.css')) { Get-Content (Join-Path $root 'src\style.css') -Raw -Encoding UTF8 } else { '' }
$html = Get-Content (Join-Path $root 'src\shell.html') -Raw -Encoding UTF8

# Inline libraries. Guard against any '</script' sequence breaking the script tag.
$three = (Get-Content (Join-Path $root 'lib\three.min.js') -Raw -Encoding UTF8) -replace '</script', '<\/script'
$peer  = (Get-Content (Join-Path $root 'lib\peerjs.min.js')  -Raw -Encoding UTF8) -replace '</script', '<\/script'
$game  = $game -replace '</script', '<\/script'

$out = $html
$out = $out.Replace('<!--CSS-->', $css)
$out = $out.Replace('<!--LIB_THREE-->', $three)
$out = $out.Replace('<!--LIB_PEER-->', $peer)
$out = $out.Replace('<!--GAME-->', $game)

$target = Join-Path $root 'banana-shooter.html'
[System.IO.File]::WriteAllText($target, $out, (New-Object System.Text.UTF8Encoding($false)))

$kb = [math]::Round((Get-Item $target).Length / 1KB)
Write-Host "Built banana-shooter.html  ($kb KB) from $($files.Count) source files" -ForegroundColor Green

# keep the old file name working for anyone who bookmarked it
$legacy = Join-Path $root 'counterstrike.html'
[System.IO.File]::WriteAllText($legacy, $out, (New-Object System.Text.UTF8Encoding($false)))
