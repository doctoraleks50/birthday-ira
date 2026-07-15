import { CONFIG } from "./config.js";
import { BirthdayScene, createBokeh } from "./scene3d.js";

document.title = CONFIG.siteTitle;

const $ = (sel) => document.querySelector(sel);

let scene = null;
let cardOpened = false;

function initBokeh() {
  createBokeh($("#bokeh"), 28);
}

function initScene() {
  scene = new BirthdayScene($("#scene3d"));
  scene.start();
}

function typewriter(el, text, speed = 28) {
  el.textContent = "";
  el.classList.add("typing-cursor");
  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else {
        el.classList.remove("typing-cursor");
        resolve();
      }
    };
    tick();
  });
}

function setupPhotos() {
  if (!CONFIG.photos?.length) return;
  const row = $("#photo-row");
  row.classList.remove("hidden");
  for (const src of CONFIG.photos) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Наше фото";
    img.loading = "lazy";
    row.appendChild(img);
  }
}

function openCard() {
  if (cardOpened) return;
  cardOpened = true;
  const card = $("#card");
  card.classList.add("open");

  setTimeout(async () => {
    $("#greeting-title").textContent = `${CONFIG.greetingTitle}, ${CONFIG.herName}!`;
    await typewriter($("#greeting-body"), CONFIG.greetingBody, 22);
    $("#from-name").textContent = CONFIG.fromName;
    setupPhotos();
  }, 600);
}

async function enterExperience() {
  const intro = $("#intro");
  intro.classList.add("fade-out");

  initScene();

  $("#main").classList.remove("hidden");
  requestAnimationFrame(() => $("#main").classList.add("visible"));

  // Music stays off for now (melodyEnabled in config.js / public/js/music.js ready later)
  setTimeout(() => intro.remove(), 900);
}

function showFinal() {
  scene?.megaBurst();
  if (navigator.vibrate) navigator.vibrate([50, 30, 80]);

  const final = $("#final");
  $("#final-message").textContent = CONFIG.finalMessage;
  final.classList.remove("hidden");
}

function resetExperience() {
  location.reload();
}

function bindEvents() {
  $("#enter-btn").addEventListener("click", enterExperience);

  $("#card").addEventListener("click", (e) => {
    if (e.target.closest("#hug-btn")) return;
    openCard();
  });

  $("#hug-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    showFinal();
  });

  $("#replay-btn").addEventListener("click", resetExperience);

  let lastBurst = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      const now = Date.now();
      if (now - lastBurst > 400) {
        lastBurst = now;
        scene?.burstAt(e.clientX, e.clientY, 8);
      }
    },
    { passive: true }
  );
}

initBokeh();
bindEvents();
