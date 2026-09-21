# Uploads the project to GitHub in one go.
#   powershell -ExecutionPolicy Bypass -File .\git-push.ps1
#
# It builds the game first, then commits and pushes everything.
# If Git is not installed it tells you what to do.
param(
  [string]$User = 'cotane666',
  [string]$Repo = 'banana-shooter',
  [string]$Branch = 'main',
  [string]$Message = 'Banana Shooter: 3D шутер, 20 стволов, онлайн-дуэли, Android'
)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Say($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }

# ---- 0. is git available? ----
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  Say ""
  Say "Git не установлен." 'Yellow'
  Say "Скачайте и установите: https://git-scm.com/download/win"
  Say "После установки ЗАКРОЙТЕ это окно, откройте заново и запустите скрипт снова."
  Say ""
  exit 1
}
Say ("Git найден: " + (& git --version)) 'Green'

# ---- 1. build the game so the latest version is committed ----
Say ""
Say "1/5  Собираю игру..." 'Cyan'
& powershell -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1')
Copy-Item (Join-Path $root 'banana-shooter.html') (Join-Path $root 'index.html') -Force
Say "     banana-shooter.html и index.html готовы" 'Green'

# ---- 2. git identity ----
$name = (& git config --global user.name) 2>$null
$mail = (& git config --global user.email) 2>$null
if (-not $name -or -not $mail) {
  Say ""
  Say "Не задано имя/почта для Git. Задайте их один раз:" 'Yellow'
  Say '  git config --global user.name "Ваше Имя"'
  Say '  git config --global user.email "ваш_email@example.com"'
  Say "Затем запустите скрипт снова."
  exit 1
}
Say ("     Git автор: $name <$mail>") 'Green'

# ---- 3. init + commit ----
Say ""
Say "2/5  Инициализирую репозиторий..." 'Cyan'
if (-not (Test-Path (Join-Path $root '.git'))) { & git init | Out-Null }
& git branch -M $Branch 2>$null | Out-Null

Say "3/5  Добавляю файлы..." 'Cyan'
& git add .
$staged = (& git diff --cached --name-only) 2>$null
Say ("     файлов к коммиту: " + (@($staged).Count)) 'Green'

$hasCommit = (& git rev-parse --verify HEAD 2>$null)
if ($hasCommit) { & git commit -m $Message 2>&1 | ForEach-Object { Say "     $_" } }
else { & git commit -m $Message 2>&1 | ForEach-Object { Say "     $_" } }

# ---- 4. remote ----
Say ""
Say "4/5  Подключаю репозиторий..." 'Cyan'
$url = "https://github.com/$User/$Repo.git"
$existing = (& git remote get-url origin 2>$null)
if ($existing) { & git remote set-url origin $url } else { & git remote add origin $url }
Say ("     origin = $url") 'Green'

# ---- 5. push ----
Say ""
Say "5/5  Отправляю на GitHub..." 'Cyan'
Say ""
Say "  Сейчас Git попросит логин и пароль." 'Yellow'
Say "  Логин  : ваш ник на GitHub (или почта)" 'Yellow'
Say "  Пароль : НЕ обычный пароль, а Personal Access Token (ghp_...)" 'Yellow'
Say "           GitHub → Settings → Developer settings →" 'Yellow'
Say "           Personal access tokens → Tokens (classic) → Generate new token" 'Yellow'
Say "           галочка 'repo'. При вводе токен не отображается — это нормально." 'Yellow'
Say ""
& git push -u origin $Branch

Say ""
if ($LASTEXITCODE -eq 0) {
  Say "ГОТОВО! Игра на GitHub." 'Green'
  Say "  Репозиторий : https://github.com/$User/$Repo" 'Green'
  Say "  Включите сайт: Settings → Pages → Source: GitHub Actions" 'Yellow'
  Say "  Адрес игры   : https://$User.github.io/$Repo/" 'Yellow'
} else {
  Say "Push не удался. Смотрите сообщение выше." 'Red'
  Say "Частые причины:" 'Yellow'
  Say "  - введён пароль вместо токена  → сделайте токен (инструкция выше)"
  Say "  - репозиторий на GitHub не пустой (были галочки README/.gitignore):"
  Say "        git pull --rebase origin $Branch"
  Say "        git push"
  Say "  - Git запомнил неверный пароль:"
  Say "        git config --global --unset credential.helper"
}
