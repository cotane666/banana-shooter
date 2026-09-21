# Banana Shooter для Android

Проект уже готов — осталось собрать APK. Есть два пути.

---

## Вариант 1 (проще, без установки): PWA из браузера

Работает сразу, когда игра лежит на GitHub Pages.

1. Откройте адрес игры в **Chrome на телефоне**.
2. Меню браузера (⋮) → **«Установить приложение»** / «Добавить на главный экран».
3. Запускайте со значка на главном экране — игра откроется в полный экран
   и будет работать **оффлайн**.

В самом меню игры есть кнопка **«УСТАНОВИТЬ НА ТЕЛЕФОН»** — она вызывает то же окно.

Что уже сделано для PWA: `manifest.webmanifest`, service worker с офлайн-кэшем,
иконки 192/512/maskable, `theme-color`, запрет зума, полный экран, landscape.

---

## Вариант 2: настоящий APK

Нужен **Android Studio** (или JDK 17 + Android SDK).

### Что уже готово в папке `android/`

```
android/
  gradlew.bat, gradle/wrapper/       Gradle wrapper 8.7
  settings.gradle, build.gradle      AGP 8.5.2, minSdk 24, targetSdk 34
  app/build.gradle
  app/src/main/
    AndroidManifest.xml              landscape, fullscreen, интернет
    java/com/bananashooter/game/MainActivity.java
    assets/index.html                ← сама игра (кладёт build-android.ps1)
    assets/icons/...                 иконки PWA
    res/mipmap-*/ic_launcher*.png    иконки приложения (5 плотностей)
    res/mipmap-anydpi-v26/           адаптивная иконка
    res/values/{strings,colors,styles}.xml
```

### Сборка

**Через Android Studio (рекомендую):**

1. Android Studio → **Open** → выберите папку `android`.
2. Дайте Gradle синхронизироваться (скачает зависимости, нужен интернет).
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Готовый файл: `android/app/build/outputs/apk/debug/app-debug.apk`

**Через командную строку:**

```bat
cd android
gradlew.bat assembleDebug
:: результат: app\build\outputs\apk\debug\app-debug.apk

gradlew.bat assembleRelease
:: результат: app\build\outputs\apk\release\app-release.apk
:: (подписан debug-ключом, чтобы работал сразу)
```

Перед этим один раз задайте путь к SDK — скопируйте `local.properties.example`
в `local.properties` и впишите свой путь (Android Studio делает это сам).

### Установка на телефон

1. Включите **«Установка из неизвестных источников»** для файлового менеджера.
2. Перекиньте APK на телефон (кабель, облако, Telegram — как угодно).
3. Откройте APK и установите.

### Обновить игру в APK

Игра внутри APK — это собранный HTML. После правок в `src/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-android.ps1
```

и снова соберите APK.

---

## Что учтено для Android

- **Полный экран** — скрытие системных панелей, immersive sticky, вырез экрана.
- **Только landscape** — как в мобильных шутерах; в портрете играть неудобно.
- **Экран не гаснет** во время игры (`FLAG_KEEP_SCREEN_ON`).
- **Аппаратное ускорение** WebGL, `largeHeap` для текстур.
- **Джойстик и кнопки** — сенсорное управление встроено в саму игру.
- **Онлайн-дуэли** работают (WebRTC в WebView, разрешение INTERNET).
- **Прогресс сохраняется** (`DomStorage`).
- **Кнопка «Назад»** ставит игру на паузу, а не выкидывает сразу.
- **Звук** не требует лишнего касания (`setMediaPlaybackRequiresUserGesture(false)`).

## Совместимость

Android 7.0 (API 24) и новее, WebView с поддержкой WebGL 2.
На слабых устройствах в настройках игры поставьте **качество теней: Выкл**.
