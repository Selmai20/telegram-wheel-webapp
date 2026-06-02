const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const CONFIG = {
  company: "ELIT REMONT",
  variant: "premium-gold",
  sourceDefault: "github-pages-demo",
  prizes: [
    { label: "Монтаж натяжных потолков в подарок", short: "Потолки", emoji: "🏠", weight: 5 },
    { label: "От 3 до 5 м² плитки в подарок", short: "Плитка", emoji: "🧱", weight: 8 },
    { label: "Скидка на электрику", short: "Электрика", emoji: "💡", weight: 15 },
    { label: "Бесплатная консультация", short: "Консультация", emoji: "💬", weight: 22 },
    { label: "Подарок к ремонту", short: "Подарок", emoji: "🎁", weight: 14 },
    { label: "Скидка на сантехнику", short: "Сантехника", emoji: "🚿", weight: 14 },
    { label: "Бесплатный замер", short: "Замер", emoji: "📏", weight: 17 },
    { label: "Бонус на материалы", short: "Материалы", emoji: "🛠️", weight: 5 }
  ],
  colors: [
    "#2A1A12",
    "#D8B25D",
    "#5A3B1A",
    "#FFF1B6",
    "#8E672A",
    "#1A1112",
    "#C9973E",
    "#F6D98B"
  ]
};

const STORAGE_LEAD_KEY = `wheel_${CONFIG.variant}_lead`;
const STORAGE_SPIN_KEY = `wheel_${CONFIG.variant}_spun`;
const STORAGE_LEADS_KEY = `wheel_${CONFIG.variant}_leads`;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const welcomeScreen = document.getElementById("welcomeScreen");
const gameScreen = document.getElementById("gameScreen");

const startBtn = document.getElementById("startBtn");
const resetDemoBtn = document.getElementById("resetDemoBtn");
const soundBtn = document.getElementById("soundBtn");

const wheelPanel = document.getElementById("wheelPanel");
const prizePanel = document.getElementById("prizePanel");
const formPanel = document.getElementById("formPanel");
const successPanel = document.getElementById("successPanel");

const spinBtn = document.getElementById("spinBtn");
const statusText = document.getElementById("statusText");
const prizeTitle = document.getElementById("prizeTitle");
const claimBtn = document.getElementById("claimBtn");

const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const errorText = document.getElementById("errorText");
const sendBtn = document.getElementById("sendBtn");

const confetti = document.getElementById("confetti");

let rotation = 0;
let isSpinning = false;
let selectedPrize = null;
let soundEnabled = true;
let audioContext = null;
let lastTickIndex = -1;

function getSource() {
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") || params.get("source") || params.get("ref") || CONFIG.sourceDefault;
}

function setScreen(screen) {
  welcomeScreen.classList.remove("screen-active");
  gameScreen.classList.remove("screen-active");
  screen.classList.add("screen-active");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bounceSwitch(fromPanel, toPanel) {
  fromPanel.classList.remove("enter-up");
  fromPanel.classList.add("exit-up");

  await wait(680);

  fromPanel.classList.add("hidden");
  fromPanel.classList.remove("exit-up");

  toPanel.classList.remove("hidden");
  toPanel.classList.add("enter-up");

  await wait(760);

  toPanel.classList.remove("enter-up");
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getNormalizedRotation(value) {
  const full = Math.PI * 2;
  return ((value % full) + full) % full;
}

function getPrizeIndexByRotation(finalRotation) {
  const full = Math.PI * 2;
  const segmentAngle = full / CONFIG.prizes.length;
  const normalized = getNormalizedRotation(finalRotation);
  const pointerAngle = (Math.PI * 1.5 - normalized + full) % full;

  return Math.floor(pointerAngle / segmentAngle);
}

function weightedRandomPrizeIndex() {
  const total = CONFIG.prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < CONFIG.prizes.length; i++) {
    roll -= CONFIG.prizes[i].weight;

    if (roll <= 0) {
      return i;
    }
  }

  return CONFIG.prizes.length - 1;
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 20;
  const segmentAngle = (Math.PI * 2) / CONFIG.prizes.length;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);

  // Outer luxury halo
  const halo = ctx.createRadialGradient(0, 0, radius * 0.62, 0, 0, radius + 16);
  halo.addColorStop(0, "rgba(216,178,93,0.00)");
  halo.addColorStop(0.70, "rgba(216,178,93,0.08)");
  halo.addColorStop(1, "rgba(255,241,182,0.36)");

  ctx.beginPath();
  ctx.arc(0, 0, radius + 14, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  ctx.rotate(rotation);

  // Decorative outer ring
  ctx.beginPath();
  ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#140C12";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFF1B6";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(216,178,93,0.65)";
  ctx.lineWidth = 8;
  ctx.stroke();

  for (let i = 0; i < CONFIG.prizes.length; i++) {
    const start = i * segmentAngle;
    const end = start + segmentAngle;
    const mid = start + segmentAngle / 2;
    const prize = CONFIG.prizes[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 8, start, end);
    ctx.closePath();

    const sectorGradient = ctx.createRadialGradient(0, 0, radius * 0.05, 0, 0, radius);
    sectorGradient.addColorStop(0, i % 2 === 0 ? "rgba(255,241,182,0.22)" : "rgba(255,255,255,0.16)");
    sectorGradient.addColorStop(0.50, CONFIG.colors[i]);
    sectorGradient.addColorStop(1, i % 2 === 0 ? "#1A1112" : "#7B5624");

    ctx.fillStyle = sectorGradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,241,182,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // small golden studs
    ctx.save();
    ctx.rotate(mid);

    ctx.beginPath();
    ctx.arc(radius - 22, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF1B6";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(radius - 22, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#8E672A";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF7E1";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 6;

    ctx.font = "900 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(prize.emoji, radius - 88, -8);

    ctx.font = "950 15px system-ui, -apple-system, sans-serif";
    ctx.fillText(prize.short, radius - 88, 20);

    ctx.restore();
  }

  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, 82, 0, Math.PI * 2);
  ctx.fillStyle = "#120B0E";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 76, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,241,182,0.92)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  const centerGradient = ctx.createRadialGradient(-22, -25, 8, 0, 0, 62);
  centerGradient.addColorStop(0, "#FFFFFF");
  centerGradient.addColorStop(0.34, "#FFF1B6");
  centerGradient.addColorStop(1, "#D8B25D");
  ctx.fillStyle = centerGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,12,18,0.10)";
  ctx.fill();

  ctx.restore();
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTick() {
  if (!soundEnabled) return;

  try {
    ensureAudio();

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.value = 720;

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.038);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.045);
  } catch {}
}

function playWinSound() {
  if (!soundEnabled) return;

  try {
    ensureAudio();

    [523, 659, 784, 1046].forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const t = audioContext.currentTime + index * 0.09;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.075, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {}
}

function maybePlayTick() {
  const index = getPrizeIndexByRotation(rotation);

  if (index !== lastTickIndex) {
    lastTickIndex = index;
    playTick();
  }
}

function createConfetti() {
  confetti.innerHTML = "";

  const colors = ["#D8B25D", "#FFF1B6", "#FFFFFF", "#C9973E", "#8E672A", "#F6D98B"];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("div");

    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-20 - Math.random() * 45}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.2 + Math.random() * 2.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.38}s`;
    piece.style.transform = `translateY(-35px) rotate(${Math.random() * 180}deg)`;

    confetti.appendChild(piece);
  }

  setTimeout(() => {
    confetti.innerHTML = "";
  }, 5400);
}

function formatPhone(value) {
  value = value.replace(/[^\d+()\-\s]/g, "");

  if (value.length > 22) {
    value = value.slice(0, 22);
  }

  return value;
}

function prefillTelegramData() {
  const user = tg?.initDataUnsafe?.user;

  if (!user) {
    return;
  }

  if (!nameInput.value) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    nameInput.value = fullName || "";
  }
}

function getExistingLead() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_LEAD_KEY) || "null");
  } catch {
    return null;
  }
}

function saveLead(name, phone) {
  const lead = {
    id: Date.now(),
    company: CONFIG.company,
    variant: CONFIG.variant,
    prize: selectedPrize.label,
    name,
    phone,
    source: getSource(),
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_LEAD_KEY, JSON.stringify(lead));

  const leads = JSON.parse(localStorage.getItem(STORAGE_LEADS_KEY) || "[]");
  leads.unshift(lead);
  localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(leads.slice(0, 50)));

  return lead;
}

function applyAlreadyUsedState() {
  const lead = getExistingLead();

  if (!lead) {
    return;
  }

  spinBtn.disabled = true;
  spinBtn.querySelector("span").textContent = "Готово";
  spinBtn.querySelector("small").textContent = "заявка есть";
  statusText.textContent = `Вы уже забрали подарок: ${lead.prize}`;
}

async function spinWheel() {
  if (isSpinning) {
    return;
  }

  if (getExistingLead()) {
    applyAlreadyUsedState();
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  statusText.textContent = "Колесо крутится...";

  localStorage.setItem(STORAGE_SPIN_KEY, "1");

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("medium");
  }

  try {
    ensureAudio();
  } catch {}

  const full = Math.PI * 2;
  const segmentAngle = full / CONFIG.prizes.length;
  const targetIndex = weightedRandomPrizeIndex();

  const currentNormalized = getNormalizedRotation(rotation);
  const targetAngle = Math.PI * 1.5 - (targetIndex * segmentAngle + segmentAngle / 2);

  let delta = targetAngle - currentNormalized;

  if (delta < 0) {
    delta += full;
  }

  const finalRotation = rotation + delta + full * (7.5 + Math.random() * 1.4);
  const anticipationRotation = rotation - 0.30;

  const anticipationDuration = 240;
  const spinDuration = 4450;

  const anticipationStart = performance.now();

  function animateAnticipation(now) {
    const t = Math.min((now - anticipationStart) / anticipationDuration, 1);
    rotation = rotation + (anticipationRotation - rotation) * easeOutBack(t);
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(animateAnticipation);
      return;
    }

    const spinStart = performance.now();

    function animateSpin(frameNow) {
      const progress = Math.min((frameNow - spinStart) / spinDuration, 1);
      const eased = easeOutQuint(progress);

      rotation = anticipationRotation + (finalRotation - anticipationRotation) * eased;

      if (progress > 0.86) {
        rotation += Math.sin((progress - 0.86) * 34) * 0.013 * (1 - progress);
      }

      drawWheel();
      maybePlayTick();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
        return;
      }

      rotation = finalRotation;
      drawWheel();

      const prizeIndex = getPrizeIndexByRotation(rotation);
      selectedPrize = CONFIG.prizes[prizeIndex];

      prizeTitle.textContent = selectedPrize.label;
      statusText.textContent = "Подарок выпал";

      playWinSound();

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }

      setTimeout(async () => {
        await bounceSwitch(wheelPanel, prizePanel);
        isSpinning = false;
      }, 450);
    }

    requestAnimationFrame(animateSpin);
  }

  requestAnimationFrame(animateAnticipation);
}

startBtn.addEventListener("click", () => {
  setScreen(gameScreen);
  drawWheel();
  applyAlreadyUsedState();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("light");
  }
});

resetDemoBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_LEAD_KEY);
  localStorage.removeItem(STORAGE_SPIN_KEY);
  localStorage.removeItem(STORAGE_LEADS_KEY);

  selectedPrize = null;
  isSpinning = false;

  wheelPanel.classList.remove("hidden", "exit-up");
  prizePanel.classList.add("hidden");
  formPanel.classList.add("hidden");
  successPanel.classList.add("hidden");

  spinBtn.disabled = false;
  spinBtn.querySelector("span").textContent = "Крутить";
  spinBtn.querySelector("small").textContent = "1 попытка";
  statusText.textContent = "Демо сброшено. Можно крутить снова.";

  setScreen(gameScreen);
  drawWheel();
});

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "🔊" : "🔇";

  if (soundEnabled) {
    playTick();
  }
});

spinBtn.addEventListener("click", spinWheel);

claimBtn.addEventListener("click", async () => {
  await bounceSwitch(prizePanel, formPanel);

  setTimeout(() => {
    nameInput.focus();
  }, 100);
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

sendBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  errorText.textContent = "";

  if (!selectedPrize) {
    errorText.textContent = "Сначала прокрутите колесо";
    return;
  }

  if (name.length < 2) {
    errorText.textContent = "Введите имя";
    return;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 6) {
    errorText.textContent = "Введите корректный номер телефона";
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Отправляем...";

  const lead = saveLead(name, phone);

  // Для будущего подключения к Telegram-боту.
  // Когда будем встраивать в бота, можно будет раскомментировать:
  // if (tg) {
  //   tg.sendData(JSON.stringify({
  //     prize: lead.prize,
  //     name: lead.name,
  //     phone: lead.phone,
  //     source: lead.source,
  //     createdAt: lead.createdAt
  //   }));
  // }

  await bounceSwitch(formPanel, successPanel);

  createConfetti();
  playWinSound();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred("success");
  }

  setTimeout(() => {
    if (tg) {
      tg.close();
    }
  }, 2100);
});

prefillTelegramData();
drawWheel();
