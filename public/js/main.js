import { CONFIG } from "./config.js";
import { Experience3D } from "./scene3d.js";

document.title = CONFIG.siteTitle;
const $ = (sel) => document.querySelector(sel);

const exp = new Experience3D($("#scene3d"));
exp.start();

// Smooth word-by-word reveal with subtle rise and blur fade
function revealParagraph(el, text, wordDelay = 60) {
  el.innerHTML = "";
  const words = text.split(/(\\s+)/);
  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.textContent = w;
    span.style.setProperty("--i", String(i));
    span.className = "reveal-word";
    el.appendChild(span);
  });
  // force reflow, then add active
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.classList.add("reveal-on");
  // resolve when last word animated
  return new Promise((resolve) => {
    const total = words.length;
    setTimeout(resolve, total * wordDelay + 400);
  });
}

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

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
};

function takeBouquet() {
  $("#take-btn").classList.add("hidden");
  $("#bouquet-ui .scene-caption")?.classList.add("fade-out");
  exp.takeBouquet();
}

$("#open-btn").addEventListener("click", openGreeting);
$("#next-btn").addEventListener("click", goBouquet);
$("#take-btn").addEventListener("click", takeBouquet);
