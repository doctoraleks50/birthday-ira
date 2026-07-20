import { CONFIG } from "./config.js";
import { Experience3D } from "./scene3d.js";
import { BlowDetector } from "./blow.js";
import { BirthdayMusic } from "./music.js";

document.title = CONFIG.siteTitle;
const $ = (sel) => document.querySelector(sel);

const exp = new Experience3D($("#scene3d"));
exp.start();

const blow = new BlowDetector();
const music = new BirthdayMusic();
let blowLoop = null;
let cakeDone = false;
let micReady = false;
let questionIndex = 0;
const answers = {};

const STORAGE_KEY = "birthday-ira-answers";

function saveAnswers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    /* ignore */
  }
}

/** Word reveal — spaces stay as text nodes (inline-block ate the spaces before) */
function revealParagraph(el, text, wordDelay = 55) {
  el.textContent = "";
  el.classList.remove("reveal-on");
  const tokens = text.match(/\S+|\s+/g) || [text];
  let wordIndex = 0;
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      el.appendChild(document.createTextNode(tok));
      continue;
    }
    const span = document.createElement("span");
    span.className = "reveal-word";
    span.style.setProperty("--i", String(wordIndex++));
    span.textContent = tok;
    el.appendChild(span);
  }
  el.offsetHeight;
  el.classList.add("reveal-on");
  return new Promise((resolve) => {
    setTimeout(resolve, wordIndex * wordDelay + 450);
  });
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

async function openGreeting() {
  // Unlock audio early on first tap (iOS/Safari needs a gesture)
  try { await music.unlock(); } catch { /* ignore */ }

  const intro = $("#intro");
  intro.classList.add("fade-out");
  setTimeout(() => hide(intro), 700);

  show($("#greeting"));
  $("#greeting-title").textContent = CONFIG.greetingTitle;
  $("#from-name").textContent = CONFIG.fromName;
  $("#next-btn").classList.add("hidden");

  await revealParagraph($("#greeting-body"), CONFIG.greetingBody, 55);
  $("#next-btn").classList.remove("hidden");
}

async function goBouquet() {
  try { await music.unlock(); } catch { /* ignore */ }
  hide($("#greeting"));
  show($("#bouquet-ui"));
  $("#take-btn").classList.add("hidden");
  await exp.startBouquetApproach();
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
  setTimeout(() => {
    const btn = $("#next-questions-btn");
    btn.classList.remove("hidden");
    btn.classList.add("pop-in");
  }, 3500);
};

async function takeBouquet() {
  try { await music.unlock(); } catch { /* ignore */ }
  $("#take-btn").classList.add("hidden");
  $("#bouquet-ui .scene-caption")?.classList.add("fade-out");
  exp.takeBouquet();
}

function renderQuestion() {
  const list = CONFIG.questions || [];
  const q = list[questionIndex];
  if (!q) return;

  $("#questions-kicker").textContent = `${questionIndex + 1} / ${list.length}`;
  $("#questions-title").textContent = CONFIG.questionsTitle;
  $("#questions-intro").textContent =
    questionIndex === 0 ? (CONFIG.questionsIntro || "") : "";
  $("#questions-prompt").textContent = q.prompt;

  const ta = $("#questions-answer");
  ta.value = answers[q.id] || "";
  ta.placeholder = q.placeholder || "";
  ta.focus({ preventScroll: true });

  const prog = $("#questions-progress");
  prog.innerHTML = "";
  list.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "q-dot" + (i === questionIndex ? " active" : i < questionIndex ? " done" : "");
    prog.appendChild(dot);
  });

  const nextBtn = $("#questions-next");
  nextBtn.textContent = questionIndex >= list.length - 1 ? "Далі до сюрпризу" : "Далі";
}

function storeCurrentAnswer() {
  const list = CONFIG.questions || [];
  const q = list[questionIndex];
  if (!q) return;
  answers[q.id] = ($("#questions-answer").value || "").trim();
  saveAnswers();
}

async function goQuestions() {
  try { await music.unlock(); } catch { /* ignore */ }
  hide($("#wish-ui"));
  show($("#questions"));
  questionIndex = 0;
  renderQuestion();
}

async function advanceQuestion({ skip = false } = {}) {
  if (!skip) storeCurrentAnswer();
  else {
    const list = CONFIG.questions || [];
    const q = list[questionIndex];
    if (q && answers[q.id] == null) answers[q.id] = "";
    saveAnswers();
  }

  const list = CONFIG.questions || [];
  if (questionIndex < list.length - 1) {
    questionIndex += 1;
    renderQuestion();
    return;
  }

  // Done — soft bridge into cake surprise
  const panel = $("#questions .questions-panel");
  panel?.classList.add("questions-done");
  $("#questions-prompt").textContent = CONFIG.questionsDone || "Дякую 🤍";
  $("#questions-intro").textContent = "";
  $("#questions-answer").classList.add("hidden");
  $("#questions-actions")?.classList.add("hidden");
  $("#questions-progress")?.classList.add("hidden");
  $("#questions-kicker").textContent = "";

  setTimeout(() => goSurprise(), 1400);
}

/** After questions: mic + unlock audio, then surprise cake */
async function goSurprise() {
  try {
    await music.unlock();
  } catch (err) {
    console.warn("audio unlock", err);
  }

  try {
    await blow.start();
    micReady = true;
  } catch (err) {
    micReady = false;
    console.warn("mic", err);
  }

  hide($("#questions"));
  hide($("#wish-ui"));
  show($("#cake-ui"));
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
    await music.unlock();
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
        exp.blowCandles(Math.min(1, accum));
        accum = 0;
      }
    } else {
      accum *= 0.85;
    }
  };
  tick();
}

async function showFinale() {
  hide($("#cake-ui"));
  show($("#finale"));
  const el = $("#finale-text");
  el.textContent = CONFIG.finaleText;
  el.classList.remove("finale-in");
  el.offsetHeight;
  el.classList.add("finale-in");

  const musicBtn = $("#music-btn");
  // Music should already be starting from candle blow; reinforce + show button if blocked
  const tryMusic = async () => {
    try {
      await music.start();
      if (music.isAudible()) musicBtn?.classList.add("hidden");
      else musicBtn?.classList.remove("hidden");
    } catch (err) {
      console.warn("music", err);
      musicBtn?.classList.remove("hidden");
    }
  };
  await tryMusic();
  setTimeout(tryMusic, 500);

  musicBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await music.unlock();
      await music.start();
      musicBtn.classList.add("hidden");
    } catch (err) {
      console.warn("music btn", err);
    }
  });
}

exp.onAllCandlesOut = () => {
  if (cakeDone) return;
  cakeDone = true;
  blow.stop();
  if (blowLoop) cancelAnimationFrame(blowLoop);
  $("#cake-caption").textContent = "Усі свічки задуті";
  // Music starts the moment the last candle goes out
  music.start().catch(() => {});
  setTimeout(showFinale, 900);
};

$("#open-btn").addEventListener("click", openGreeting);
$("#next-btn").addEventListener("click", goBouquet);
$("#take-btn").addEventListener("click", takeBouquet);
$("#next-questions-btn").addEventListener("click", goQuestions);
$("#questions-next").addEventListener("click", () => advanceQuestion({ skip: false }));
$("#questions-skip").addEventListener("click", () => advanceQuestion({ skip: true }));
$("#mic-btn").addEventListener("click", enableMic);
