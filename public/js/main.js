import { CONFIG } from "./config.js";
import { Experience3D } from "./scene3d.js";
import { BlowDetector } from "./blow.js";

document.title = CONFIG.siteTitle;
const $ = (sel) => document.querySelector(sel);

const exp = new Experience3D($("#scene3d"));
exp.start();

const blow = new BlowDetector();
let blowLoop = null;
let cakeDone = false;

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

function goBouquet() {
  hide($("#greeting"));
  show($("#bouquet-ui"));
  $("#take-btn").classList.add("hidden");
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
  // Show "to cake" after wish sinks in
  setTimeout(() => {
    const btn = $("#cake-btn");
    btn.classList.remove("hidden");
    btn.classList.add("pop-in");
  }, 3500);
};

function takeBouquet() {
  $("#take-btn").classList.add("hidden");
  $("#bouquet-ui .scene-caption")?.classList.add("fade-out");
  exp.takeBouquet();
}

function goCake() {
  hide($("#wish-ui"));
  show($("#cake-ui"));
  $("#candle-count").textContent = "Свічок: 30";
  exp.startCake();
}

async function enableMic() {
  try {
    await blow.start();
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
    fill.style.width = `${Math.round(intensity * 100)}%`;
    fill.classList.toggle("hot", intensity > 0.5);

    if (isBlow && intensity > 0.08) {
      accum += intensity;
      // Extinguish in bursts so strong blows clear many at once
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
  setTimeout(() => {
    hide($("#cake-ui"));
    show($("#finale"));
    $("#finale-text").textContent = CONFIG.finaleText;
  }, 1200);
};

$("#open-btn").addEventListener("click", openGreeting);
$("#next-btn").addEventListener("click", goBouquet);
$("#take-btn").addEventListener("click", takeBouquet);
$("#cake-btn").addEventListener("click", goCake);
$("#mic-btn").addEventListener("click", enableMic);
