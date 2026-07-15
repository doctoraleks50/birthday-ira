import { CONFIG } from "./config.js";
import { Experience3D } from "./scene3d.js";

document.title = CONFIG.siteTitle;
const $ = (sel) => document.querySelector(sel);

const exp = new Experience3D($("#scene3d"));
exp.start();

function typewriter(el, text, speed = 22) {
  el.textContent = "";
  el.classList.add("typing");
  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else {
        el.classList.remove("typing");
        resolve();
      }
    };
    tick();
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

  await typewriter($("#greeting-body"), CONFIG.greetingBody, 18);
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
