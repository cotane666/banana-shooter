# Builds the Android app assets from the desktop game, then optionally assembles an APK.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\build-android.ps1
param(
  [switch]$Assemble,       # also run gradlew assembleDebug (needs Android SDK + JDK 17)
  [switch]$Release
)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "1/3  Building the web game..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1') | Out-Null

$assets = Join-Path $root 'android\app\src\main\assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $assets 'icons') | Out-Null

Write-Host "2/3  Copying game files into the APK assets..." -ForegroundColor Cyan
# the game itself, renamed to index.html so the WebView loads it by default
Copy-Item (Join-Path $root 'index.html') (Join-Path $assets 'index.html') -Force
# PWA extras: harmless inside the APK, and they let the same folder be served on the web
Copy-Item (Join-Path $root 'manifest.webmanifest') (Join-Path $assets 'manifest.webmanifest') -Force
Copy-Item (Join-Path $root 'sw.js') (Join-Path $assets 'sw.js') -Force
Get-ChildItem (Join-Path $root 'icons') -Filter *.png | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $assets 'icons') -Force
}
# a tiny flag the page can read to know it is running natively
[System.IO.File]::WriteAllText((Join-Path $assets 'native.txt'), 'banana-shooter-android', (New-Object System.Text.UTF8Encoding($false)))

$size = [math]::Round(((Get-ChildItem $assets -Recurse -File | Measure-Object Length -Sum).Sum) / 1KB)
Write-Host "     assets ready ($size KB)" -ForegroundColor Green

Write-Host "3/3  Android project is ready." -ForegroundColor Cyan
Write-Host ""
Write-Host "To build the APK you need Android Studio (or a JDK 17 + Android SDK):" -ForegroundColor Yellow
Write-Host "  a) Open the 'android' folder in Android Studio and press Run/Build APK, OR"
Write-Host "  b) From a terminal with JAVA_HOME and ANDROID_HOME set:"
Write-Host "       cd android"
Write-Host "       .\gradlew.bat assembleDebug        # -> app\build\outputs\apk\debug\app-debug.apk"
Write-Host "       .\gradlew.bat assembleRelease      # signed with the debug key"
Write-Host ""
Write-Host "Full instructions: android\BUILD.md" -ForegroundColor Yellow

if ($Assemble) {
  Write-Host ""
  Write-Host "Running gradlew assembleDebug..." -ForegroundColor Cyan
  $gw = Join-Path $root 'android\gradlew.bat'
  if (-not (Test-Path $gw)) { Write-Host "gradlew.bat missing" -ForegroundColor Red; exit 1 }
  Push-Location (Join-Path $root 'android')
  & cmd /c "gradlew.bat assembleDebug" 2>&1 | ForEach-Object { Write-Host $_ }
  Pop-Location
}
