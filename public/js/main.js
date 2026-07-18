import { CONFIG } from "./config.js";
import { Experience3D } from "./scene3d.js";
import { BlowDetector } from "./blow.js";
import { BirthdayMusic } from "./music.js";

document.title = CONFIG.siteTitle;
const $ = (sel) => document.querySelector(sel);

const exp = new Experience3D($("#scene3d"));
exp.start();

const blow = new BlowDetector();
let music = null;
let blowLoop = null;
let cakeDone = false;
let micReady = false;

function revealParagraph(el, text, wordDelay = 60) {
  el.innerHTML = "";
  const words = text.split(/(\s+)/);
  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.textContent = w;
    span.style.setProperty("--i", String(i));
    span.className = "reveal-word";
    el.appendChild(span);
  });
  el.offsetHeight;
  el.classList.add("reveal-on");
  return new Promise((resolve) => {
    setTimeout(resolve, words.length * wordDelay + 400);
  });
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

async function openGreeting() {
  const intro = $("#intro");
  intro.classList.add("fade-out");
  setTimeout(() => hide(intro), 700);

  show($("#greeting"));
  $("#greeting-title").textContent = CONFIG.greetingTitle;
  $("#from-name").textContent = CONFIG.fromName;
  $("#next-btn").classList.add("hidden");

  await revealParagraph($("#greeting-body"), CONFIG.greetingBody, 60);
  $("#next-btn").classList.remove("hidden");
}

/** Mic permission on «Далі» — silently, no spoilers */
async function goBouquet() {
  try {
    await blow.start();
    micReady = true;
  } catch (err) {
    micReady = false;
    console.warn("mic", err);
  }

  hide($("#greeting"));
  show($("#bouquet-ui"));
  $("#take-btn").classList.add("hidden");
  $("#bouquet-hint")?.classList.remove("hidden");
  exp.startBouquetApproach();
}

exp.onTakeReady = () => {
  const btn = $("#take-btn");
  btn.classList.remove("hidden");
  btn.classList.add("pop-in");
};

exp.onBouquetGone = () => {
  hide($("#bouquet-ui"));
  show($("#wish-ui"));
  $("#wish-text").textContent = CONFIG.wishText;
  $("#wish-text").classList.add("fade-in");
  exp.startStars();
  // Neutral «Далі» — surprise, no cake spoilers
  setTimeout(() => {
    const btn = $("#next-surprise-btn");
    btn.classList.remove("hidden");
    btn.classList.add("pop-in");
  }, 3500);
};

function takeBouquet() {
  $("#take-btn").classList.add("hidden");
  $("#bouquet-ui .scene-caption")?.classList.add("fade-out");
  $("#bouquet-hint")?.classList.add("fade-out");
  exp.takeBouquet();
}

function goSurprise() {
  hide($("#wish-ui"));
  show($("#cake-ui"));
  $("#candle-count").textContent = "Свічок: 30";
  exp.startCake();

  if (micReady && blow.active) {
    $("#mic-btn").classList.add("hidden");
    $("#blow-meter").classList.remove("hidden");
    $("#cake-caption").textContent = "Подуй у мікрофон — чим сильніше, тим більше свічок";
    startBlowLoop();
  } else {
    $("#mic-btn").classList.remove("hidden");
    $("#cake-caption").textContent = "Задуй свічки";
  }
}

async function enableMic() {
  try {
    await blow.start();
    micReady = true;
    $("#mic-btn").classList.add("hidden");
    $("#blow-meter").classList.remove("hidden");
    $("#cake-caption").textContent = "Подуй у мікрофон — чим сильніше, тим більше свічок";
    startBlowLoop();
  } catch (err) {
    $("#cake-caption").textContent = "Немає доступу до мікрофона. Дозволь у налаштуваннях браузера.";
    console.warn(err);
  }
}

function startBlowLoop() {
  if (blowLoop) cancelAnimationFrame(blowLoop);
  let accum = 0;
  const tick = () => {
    blowLoop = requestAnimationFrame(tick);
    if (cakeDone) return;
    const { intensity, isBlow } = blow.sample();
    const fill = $("#blow-fill");
    if (fill) {
      fill.style.width = `${Math.round(intensity * 100)}%`;
      fill.classList.toggle("hot", intensity > 0.5);
    }

    if (isBlow && intensity > 0.08) {
      accum += intensity;
      if (accum >= 0.35) {
        const n = Math.min(1, accum);
        const left = exp.blowCandles(n);
        accum = 0;
        $("#candle-count").textContent = `Свічок: ${left}`;
      }
    } else {
      accum *= 0.85;
    }
  };
  tick();
}

exp.onAllCandlesOut = () => {
  if (cakeDone) return;
  cakeDone = true;
  blow.stop();
  if (blowLoop) cancelAnimationFrame(blowLoop);
  $("#cake-caption").textContent = "Усі свічки задуті";
  $("#candle-count").textContent = "Свічок: 0";
  setTimeout(async () => {
    hide($("#cake-ui"));
    show($("#finale"));
    $("#finale-text").textContent = CONFIG.finaleText;
    // Happy Birthday when the message appears
    try {
      music = new BirthdayMusic();
      await music.start();
    } catch (err) {
      console.warn("music", err);
    }
  }, 1200);
};

$("#open-btn").addEventListener("click", openGreeting);
$("#next-btn").addEventListener("click", goBouquet);
$("#take-btn").addEventListener("click", takeBouquet);
$("#next-surprise-btn").addEventListener("click", goSurprise);
$("#mic-btn").addEventListener("click", enableMic);
