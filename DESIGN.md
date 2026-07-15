# Листівка для Іри — дизайн і сценарій

> Домен: `birthday.ira.2026` (Firebase Hosting custom domain)  
> Мокап: `assets/birthday-ira-design-mockup.png`

## Візуальна концепція

**Настрій:** казковий сад на заході сонця — романтика, тепло, «вау» з першої секунди.

| Шар | Що на екрані | Глибина |
|-----|--------------|--------|
| 0 | Градієнт неба (фіолетовий → рожевий → золото) | фон |
| 1 | М’які bokeh-вогники (CSS, parallax) | далеко |
| 2 | Three.js: пелюстки троянд, сердечка, стрічки конфеті | 3D простір |
| 3 | Скляна листівка по центру (glassmorphism) | фокус |
| 4 | Текст привітання + кнопки | UI |

**Палітра:** `#1a0a2e` → `#4a1942` → `#c9184a` → `#ff8fab` → `#ffd166` (акценти).

**Шрифти:** Playfair Display (заголовок), Cormorant Garamond (тіло), Great Vibes (іменне звернення).

---

## Сценарій взаємодії (90 секунд «вау»)

```
[0s]  Завантаження — м’яке світіння, «Для тебе, Іро…»
[1s]  Кнопка «Увійти в казку ✨» (потрібна для музики в браузері)
[2s]  Fade-in: небо + bokeh + 3D-частинки «оживають»
[3s]  Старт мелодії Happy Birthday (синтезована, «dear Ira» у тексті на екрані)
[4s]  Листівка з’являється знизу, легкий float + обертання
[8s]  Листівка «розкривається» (CSS 3D flip) — всередині текст
[12s] Typewriter: особисте привітання (можна редагувати в `config.js`)
[20s] Підказка: «Рухай мишею / проведи пальцем — зірки летять»
[∞]   Клік по сердечку → burst конфеті + haptic на мобільному
[∞]   Кнопка «Обійняти 🤍» → великий вибух сердець + фінальний текст
```

---

## Екрани

### 1. Intro (overlay)
- Напівпрозорий фіолетовий veil
- Анімоване серце-пульс
- Одна CTA-кнопка

### 2. Головна сцена
- Центр: листівка 420×560px (mobile: 92vw)
- Зліва/справа: парallax bokeh
- Canvas Three.js на весь viewport (z-index під UI)

### 3. Відкрита листівка
- Заголовок: **З Днем Народження, Іро!**
- Підзаголовок (редагується): особистий текст від чоловіка
- Міні-галерея: 3 слоти для фото (`assets/photos/1.jpg` …) — опційно

### 4. Фінал
- «Я тебе кохаю» + дата
- М’яке затухання музики не робимо — нехай грає, поки вона на сторінці

---

## Технічний стек

| Компонент | Рішення |
|-----------|---------|
| 3D | Three.js (CDN), InstancedMesh для confetti/hearts |
| UI | Vanilla HTML/CSS, CSS 3D transforms |
| Музика | Web Audio API — мелодія Happy Birthday + lyrics overlay |
| Хостинг | Firebase Hosting (static `public/`) |
| Домен | Custom domain у Firebase Console |

---

## Firebase + домен `birthday.ira.2026`

1. `firebase login` → `firebase init hosting` (папка `public`)
2. `firebase deploy --only hosting`
3. Firebase Console → Hosting → **Add custom domain**
4. Для `birthday.ira.2026` потрібен DNS у реєстратора домену:
   - TXT для верифікації
   - A/AAAA або CNAME на Firebase (Console покаже точні записи)
5. SSL — автоматично від Firebase (Let's Encrypt)

> **Примітка:** якщо `ira.2026` — це ваш домен другого рівня, subdomain `birthday` налаштовується як CNAME `birthday` → `your-project.web.app`.

---

## Що можна персоналізувати

Файл `public/js/config.js`:

- `HER_NAME` — Іра
- `GREETING_TITLE`, `GREETING_BODY` — текст листівки
- `FROM_NAME` — підпис
- `PHOTOS` — масив шляхів до фото
- `MELODY_ENABLED` — музика on/off
