# Листівка для Іри 🎂

Окремий репозиторій: інтерактивна 3D-привітальна листівка.

> Музика **вимкнена** поки (`melodyEnabled: false` у `public/js/config.js`). Файл `music.js` залишено на потім.

**Дизайн і сценарій:** [DESIGN.md](./DESIGN.md)

## Локальний перегляд

```bash
cd public
python3 -m http.server 8765
# http://localhost:8765
```

## Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
# у .firebaserc — project ID
firebase deploy --only hosting
```

Custom domain: Firebase Console → Hosting → Add custom domain → `birthday.ira.2026`

## Персоналізація

`public/js/config.js` — текст, підпис, фото, музика.
