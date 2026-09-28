# Downloads real material textures (MIT-licensed, from the three.js repository),
# shrinks them to small seamless tiles and writes them as embedded data-URIs into
# src/03b-skintex.js so the single-file build keeps working offline.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cache = Join-Path $env:TEMP 'opencode\skintex'
New-Item -ItemType Directory -Force -Path $cache | Out-Null

$base = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/'
# name used by the game -> source file (three.js, MIT)
$map = @(
  @{ k='carbon';  f='carbon/Carbon.png';                             size=96 },
  @{ k='wood';    f='hardwood2_diffuse.jpg';                         size=96 },
  @{ k='noise';   f='noise.png';                                     size=96 },
  @{ k='brick';   f='brick_diffuse.jpg';                             size=96 },
  @{ k='checker'; f='floors/FloorsCheckerboard_S_Diffuse.jpg';       size=96 },
  @{ k='water';   f='water.jpg';                                     size=96 },
  @{ k='grass';   f='terrain/grasslight-big.jpg';                    size=96 },
  @{ k='grind';   f='roughness_map.jpg';                             size=96 }
)

$out = @()
$out += '/* ===== 03b-skintex.js (auto-generated) ===== */'
$out += '/* Real material textures embedded as data-URIs (MIT, from three.js examples). */'
$out += 'const SKIN_TEXTURE_DATA = {'

foreach ($m in $map) {
  $src = Join-Path $cache ($m.k + [System.IO.Path]::GetExtension($m.f))
  if (-not (Test-Path $src)) {
    Invoke-WebRequest ($base + $m.f) -UseBasicParsing -TimeoutSec 40 -OutFile $src
  }
  $img = [System.Drawing.Image]::FromFile($src)
  $S = [int]$m.size
  $bmp = New-Object System.Drawing.Bitmap $S, $S
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.DrawImage($img, 0, 0, $S, $S)
  $gfx.Dispose()
  $img.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $b64 = [Convert]::ToBase64String($ms.ToArray())
  $ms.Dispose()
  $out += ("  " + $m.k + ": 'data:image/png;base64," + $b64 + "',")
  Write-Host ("texture " + $m.k + " -> " + [math]::Round($b64.Length / 1024) + " KB")
}
$out += '};'
$out += 'function skinTextureData(name) { return SKIN_TEXTURE_DATA[name] || null; }'

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root 'src\03b-skintex.js'), ($out -join "`n"), $enc)
Write-Host 'Wrote src/03b-skintex.js' -ForegroundColor Green
