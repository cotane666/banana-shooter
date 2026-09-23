# Build script: concatenates src/*.js + inlines libs into a single standalone HTML file.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$srcDir = Join-Path $root 'src'
$files = Get-ChildItem $srcDir -Filter '*.js' | Sort-Object Name
if ($files.Count -eq 0) { throw 'No source files found in src/' }

$parts = @()
foreach ($f in $files) {
    # Read as UTF-8 and strip any BOM so Cyrillic strings survive the round-trip.
    $code = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    if ($code.Length -gt 0 -and $code[0] -eq [char]0xFEFF) { $code = $code.Substring(1) }
    $parts += "/* ===== $($f.Name) ===== */`n$code"
}
$game = $parts -join "`n`n"

$css = if (Test-Path (Join-Path $root 'src\style.css')) { [System.IO.File]::ReadAllText((Join-Path $root 'src\style.css'), [System.Text.Encoding]::UTF8) } else { '' }
if ($css.Length -gt 0 -and $css[0] -eq [char]0xFEFF) { $css = $css.Substring(1) }
$html = [System.IO.File]::ReadAllText((Join-Path $root 'src\shell.html'), [System.Text.Encoding]::UTF8)
if ($html.Length -gt 0 -and $html[0] -eq [char]0xFEFF) { $html = $html.Substring(1) }

# Inline libraries. Guard against any '</script' sequence breaking the script tag.
$three = ([System.IO.File]::ReadAllText((Join-Path $root 'lib\three.min.js'), [System.Text.Encoding]::UTF8)) -replace '</script', '<\/script'
$peer  = ([System.IO.File]::ReadAllText((Join-Path $root 'lib\peerjs.min.js'), [System.Text.Encoding]::UTF8)) -replace '</script', '<\/script'
$game  = $game -replace '</script', '<\/script'

$out = $html
$out = $out.Replace('<!--CSS-->', $css)
$out = $out.Replace('<!--LIB_THREE-->', $three)
$out = $out.Replace('<!--LIB_PEER-->', $peer)
$out = $out.Replace('<!--GAME-->', $game)

# Always write UTF-8 WITHOUT a BOM: the game is served as a plain HTML page and a
# BOM can confuse some hosts/service workers.
$enc = New-Object System.Text.UTF8Encoding($false)
$target = Join-Path $root 'banana-shooter.html'
[System.IO.File]::WriteAllText($target, $out, $enc)

$kb = [math]::Round((Get-Item $target).Length / 1KB)
Write-Host "Built banana-shooter.html  ($kb KB) from $($files.Count) source files" -ForegroundColor Green

# index.html is the file GitHub Pages serves; keep it identical to the build.
Copy-Item $target (Join-Path $root 'index.html') -Force

# keep the old file name working for anyone who bookmarked it
$legacy = Join-Path $root 'counterstrike.html'
[System.IO.File]::WriteAllText($legacy, $out, $enc)
