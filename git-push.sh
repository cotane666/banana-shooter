#!/usr/bin/env bash
# Uploads the project to GitHub, for Git Bash / Linux / macOS.
# Run:  bash git-push.sh
set -u

USER_NAME="${GH_USER:-cotane666}"
REPO_NAME="${GH_REPO:-banana-shooter}"
BRANCH="${GH_BRANCH:-main}"
MESSAGE="${GH_MSG:-Banana Shooter: 3D shuter, 20 stvolov, onlajn-duehli, Android}"

cd "$(dirname "$0")" || exit 1
say() { printf '%s\n' "$1"; }
ok()  { printf '\033[32m%s\033[0m\n' "$1"; }
warn(){ printf '\033[33m%s\033[0m\n' "$1"; }
err() { printf '\033[31m%s\033[0m\n' "$1"; }

# 0. git available?
if ! command -v git >/dev/null 2>&1; then
  err "Git not found. Install Git for Windows: https://git-scm.com/download/win"
  exit 1
fi
ok "Git: $(git --version)"

# 1. build the game so the latest version is committed
say ""
say "1/5  Building the game..."
if command -v powershell >/dev/null 2>&1; then
  powershell -ExecutionPolicy Bypass -File ./build.ps1 >/dev/null 2>&1
fi
if [ -f banana-shooter.html ]; then
  cp -f banana-shooter.html index.html
  ok "     banana-shooter.html and index.html are ready"
else
  warn "     banana-shooter.html not found - run build.ps1 first"
fi

# 2. git identity
GNAME="$(git config --global user.name 2>/dev/null || true)"
GMAIL="$(git config --global user.email 2>/dev/null || true)"
if [ -z "$GNAME" ] || [ -z "$GMAIL" ]; then
  warn ""
  warn "Git name/email are not set. Run once:"
  say  '  git config --global user.name "cotane666"'
  say  '  git config --global user.email "you@example.com"'
  exit 1
fi
ok "     git author: $GNAME <$GMAIL>"

# 3. init + commit
say ""
say "2/5  Initialising the repository..."
[ -d .git ] || git init >/dev/null
git branch -M "$BRANCH" 2>/dev/null || true

say "3/5  Staging files..."
git add .
COUNT="$(git diff --cached --name-only | wc -l | tr -d ' ')"
ok "     files staged: $COUNT"

# only commit if there is something to commit
if [ "$COUNT" != "0" ] || ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit -m "$MESSAGE" >/dev/null 2>&1 && ok "     committed" || warn "     nothing new to commit"
else
  ok "     nothing changed"
fi

# 4. remote
say ""
say "4/5  Setting the remote..."
URL="https://github.com/${USER_NAME}/${REPO_NAME}.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$URL"
else
  git remote add origin "$URL"
fi
ok "     origin = $URL"

# 5. push
say ""
say "5/5  Pushing to GitHub..."
say ""
warn "  Git will ask for a username and password."
warn "  Username: your GitHub login"
warn "  Password: NOT your account password - use a Personal Access Token (ghp_...)"
warn "            GitHub -> Settings -> Developer settings ->"
warn "            Personal access tokens -> Tokens (classic) -> Generate new token"
warn "            tick the 'repo' scope. The token stays hidden while typing."
say ""
git push -u origin "$BRANCH"

if [ $? -eq 0 ]; then
  say ""
  ok "DONE! The game is on GitHub."
  ok "  Repository : https://github.com/${USER_NAME}/${REPO_NAME}"
  warn "  Enable the site: Settings -> Pages -> Source: GitHub Actions"
  warn "  Game URL      : https://${USER_NAME}.github.io/${REPO_NAME}/"
else
  say ""
  err "Push failed. Common causes:"
  warn "  - you typed the account password instead of a token (see above)"
  warn "  - the GitHub repo is not empty (README/.gitignore were ticked):"
  say  "        git pull --rebase origin $BRANCH && git push"
  warn "  - git cached a wrong password:"
  say  "        git config --global --unset credential.helper"
fi
