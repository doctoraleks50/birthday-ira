# Листівка для Іри 🎂

Окремий репозиторій: інтерактивна 3D-привітальна листівка (сердечка, пелюстки, конфеті).

> Музика **вимкнена** (`melodyEnabled: false`). Увімкнути пізніше в `public/js/config.js`.

## Живий прев’ю (GitHub Pages)

**https://doctoraleks50.github.io/birthday-ira/**

## Firebase Hosting

У цій машині Firebase ще не залогінений. Один раз локально:

```bash
cd ~/Projects/birthday-ira
./deploy.sh
# або:
firebase login
firebase projects:create birthday-ira-2026 --display-name "Birthday Ira"   # якщо проєкту ще немає
firebase use birthday-ira-2026
firebase deploy --only hosting
```

Потім Custom domain у Console: `birthday.ira.2026`

## Локально

```bash
cd public && python3 -m http.server 8765
```

## Персоналізація

`public/js/config.js` — текст, підпис, фото, музика.
