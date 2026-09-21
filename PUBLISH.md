# Как выложить игру на GitHub

Пошагово, без спешки. Займёт ~10 минут.

---

## Шаг 0. Установите Git (один раз)

Скачайте **Git for Windows**: https://git-scm.com/download/win
Установите со стандартными настройками («Next» до конца).

Проверьте (откройте **Git Bash** или **PowerShell**):

```bash
git --version
```

Должно показать что-то вроде `git version 2.4x`.

---

## Шаг 1. Создайте пустой репозиторий на GitHub

1. Зайдите на https://github.com и войдите.
2. Справа вверху **+** → **New repository**.
3. Заполните:
   - **Repository name:** `banana-shooter`
   - **Description:** `3D-шутер: волны зомби, онлайн-дуэль и банан за $10 000`
   - **Public** (публичный — иначе GitHub Pages будет платным)
   - **НЕ** ставьте галочки «Add a README file», «Add .gitignore», «Choose a license» —
     они уже есть в проекте, иначе будет конфликт.
4. **Create repository**.

GitHub покажет страницу с командами. Скопируйте оттуда **ссылку** вида
`https://github.com/ВАШ_ЛОГИН/banana-shooter.git` — она понадобится.

---

## Шаг 2. Настройте Git (один раз)

В PowerShell или Git Bash:

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "ваш_email@example.com"
```

Имя/почта — те же, что на GitHub (или просто ваши).

---

## Шаг 3. Залейте проект

Откройте **PowerShell**, перейдите в папку проекта и выполните по одному:

```powershell
cd "C:\Users\lisen\OneDrive\Документы\ai project 1\cs3d"

git init
git branch -M main

git add .
git commit -m "Banana Shooter: 3D шутер, 20 стволов, онлайн-дуэли, мобильная версия"
```

Теперь подключите репозиторий (**вставьте свою ссылку**):

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/banana-shooter.git
git push -u origin main
```

### Про пароль

При `git push` Git спросит логин и пароль.
**Обычный пароль от GitHub не подойдёт** — нужен **токен**:

1. GitHub → правый верхний угол (аватар) → **Settings**
2. Слева внизу **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**
   - **Note:** `banana-shooter push`
   - **Expiration:** `90 days` (или как удобно)
   - **Scopes:** поставьте галочку **`repo`** (этого достаточно)
5. **Generate token** → **скопируйте** длинную строку (`ghp_...`)

При запросе пароля вставьте **этот токен** (в консоли он не отображается —
это нормально, просто вставьте и нажмите Enter).

> Сохраните токен в надёжном месте — GitHub показывает его только один раз.

---

## Шаг 4. Включите сайт (GitHub Pages)

Чтобы игра открывалась по ссылке и её можно было установить на телефон:

1. В репозитории → **Settings** → слева **Pages**.
2. **Source:** выберите **GitHub Actions**.
3. Готово. Файл `.github/workflows/build.yml` уже в проекте — он сам соберёт
   игру и опубликует её.

Через 1–2 минуты зайдите во вкладку **Actions** и дождитесь зелёной галочки.
Адрес игры будет:

```
https://ВАШ_ЛОГИН.github.io/banana-shooter/
```

Этот адрес можно открыть на телефоне и **установить как приложение**
(см. `android/BUILD.md`, вариант 1).

---

## Как обновлять игру

После любых правок в `src/`:

```powershell
cd "C:\Users\lisen\OneDrive\Документы\ai project 1\cs3d"
powershell -ExecutionPolicy Bypass -File .\build.ps1
git add .
git commit -m "Что изменилось"
git push
```

Сайт обновится сам за пару минут.

---

## Если что-то пошло не так

**`git: command not found`** — Git не установлен или не перезапущен терминал.
Закройте и откройте PowerShell заново.

**`remote origin already exists`** — значит адрес уже задан. Замените:

```powershell
git remote set-url origin https://github.com/ВАШ_ЛОГИН/banana-shooter.git
```

**`failed to push some refs` / `rejected`** — на GitHub есть коммиты, которых нет
локально (например, вы всё-таки поставили галочку README). Подтяните их:

```powershell
git pull --rebase origin main
git push
```

**`Authentication failed`** — вы ввели пароль вместо токена. Сделайте токен
(Шаг 3) и попробуйте снова. Если Git запомнил неверный пароль:

```powershell
git config --global --unset credential.helper
```

и повторите `git push` — он спросит заново.

**Хочу выложить руками, без командной строки** — на странице пустого
репозитория есть ссылка **uploading an existing file**. Но `index.html` собирается
скриптом, поэтому сначала запустите `build.ps1` (готовый `banana-shooter.html`
можно просто переименовать в `index.html` и перетащить мышкой).

---

## Что попадёт в репозиторий

Благодаря `.gitignore` собранные файлы (`index.html`, `banana-shooter.html`)
в репозиторий **не** кладутся — их создаёт GitHub Actions при публикации.
В репозитории лежат исходники, иконки, PWA-файлы и Android-проект.

Это правильный подход: исходники — в Git, сборка — автоматически.
