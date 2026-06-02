const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();

  tg.setHeaderColor?.("#050406");
  tg.setBackgroundColor?.("#050406");
  tg.setBottomBarColor?.("#050406");
  tg.disableVerticalSwipes?.();
  tg.requestFullscreen?.();
}

document.addEventListener("gesturestart", event => event.preventDefault());

const CONFIG = {
  company: "ELIT REMONT",
  variant: "premium-gold-app-mode",
  sourceDefault: "github-pages-demo",
  prizes: [
    { label: "Монтаж натяжных потолков в подарок", short: "Потолки", icon: "⌂", weight: 5 },
    { label: "От 3 до 5 м² плитки в подарок", short: "Плитка", icon: "▦", weight: 8 },
    { label: "Скидка на электрику", short: "Свет", icon: "✦", weight: 15 },
    { label: "Бесплатная консультация", short: "Совет", icon: "✧", weight: 22 },
    { label: "Подарок к ремонту", short: "Подарок", icon: "◆", weight: 14 },
    { label: "Скидка на сантехнику", short: "Вода", icon: "◌", weight: 14 },
    { label: "Бесплатный замер", short: "Замер", icon: "⌁", weight: 17 },
    { label: "Бонус на материалы", short: "Бонус", icon: "✺", weight: 5 }
  ],
  sectorColors: [
    ["#24140D", "#513419", "#120A08"],
    ["#D2A755", "#F1D28A", "#8C6126"],
    ["#3B2614", "#9A6A2A", "#1A0F0B"],
    ["#FFF0B8", "#D3A652", "#8A6027"],
    ["#6E481D", "#C9963D", "#2B190F"],
    ["#18100D", "#3A2516", "#080506"],
    ["#C79640", "#FFE5A0", "#80551F"],
    ["#F0D082", "#AA792D", "#3A240F"]
  ]
};

const STORAGE_LEAD_KEY = `wheel_${CONFIG.variant}_lead`;
const STORAGE_LEADS_KEY = `wheel_${CONFIG.variant}_leads`;

const splashScene = document.getElementById("splashScene");
const mainScene = document.getElementById("mainScene");
const loaderProgress = document.getElementById("loaderProgress");
const loaderText = document.getElementById("loaderText");

const sceneLabel = document.getElementById("sceneLabel");

const wheelView = document.getElementById("wheelView");
const prizeView = document.getElementById("prizeView");
const contactView = document.getElementById("contactView");
const successView = document.getElementById("successView");

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinBtn = document.getElementById("spinBtn");
const statusText = document.getElementById("statusText");
const prizeTitle = document.getElementById("prizeTitle");

const mainActionBtn = document.getElementById("mainActionBtn");
const resetDemoBtn = document.getElementById("resetDemoBtn");

const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const errorText = document.getElementById("errorText");

const soundBtn = document.getElementById("soundBtn");
const soundOnIcon = document.getElementById("soundOnIcon");
const soundOffIcon = document.getElementById("soundOffIcon");

const confetti = document.getElementById("confetti");

let currentView = wheelView;
let currentState = "wheel";
let rotation = 0;
let isSpinning = false;
let selectedPrize = null;
let soundEnabled = true;
let audioContext = null;
let lastTickIndex = -1;

const viewEnterTiming = {
  duration: 940,
  easing: "cubic-bezier(0.22, 1.10, 0.32, 1)"
};

const viewExitTiming = {
  duration: 780,
  easing: "cubic-bezier(0.62, -0.04, 0.74, 0.20)"
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fakeLoad() {
  const steps = [
    { p: 18, t: "Подготавливаем приложение..." },
    { p: 38, t: "Загружаем подарки..." },
    { p: 67, t: "Полируем золотое колесо..." },
    { p: 91, t: "Создаём вашу попытку..." },
    { p: 100, t: "Готово" }
  ];

  for (const step of steps) {
    loaderProgress.style.width = `${step.p}%`;
    loaderText.textContent = step.t;
    await wait(280 + Math.random() * 120);
  }

  await splashScene.animate(
    [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(-24px) scale(0.985)" }
    ],
    { duration: 420, easing: "ease", fill: "forwards" }
  ).finished;

  splashScene.classList.remove("active");
  mainScene.classList.add("active");

  await currentView.animate(
    [
      { opacity: 0, transform: "translateY(70px) scale(0.975)" },
      { opacity: 1, transform: "translateY(-10px) scale(1.006)", offset: 0.72 },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ],
    viewEnterTiming
  ).finished;

  applyAlreadyUsedState();
}

async function goToView(nextView, state, label, actionText = null) {
  if (currentView === nextView) return;

  mainActionBtn.disabled = true;

  const previousView = currentView;

  await previousView.animate(
    [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 1, transform: "translateY(18px) scale(0.992)", offset: 0.20 },
      { opacity: 0, transform: "translateY(-118vh) scale(0.965)" }
    ],
    viewExitTiming
  ).finished;

  previousView.classList.remove("active-view");

  nextView.classList.add("active-view");

  sceneLabel.textContent = label;

  await nextView.animate(
    [
      { opacity: 0, transform: "translateY(118vh) scale(0.965)" },
      { opacity: 1, transform: "translateY(-18px) scale(1.012)", offset: 0.72 },
      { opacity: 1, transform: "translateY(5px) scale(0.998)", offset: 0.88 },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ],
    viewEnterTiming
  ).finished;

  currentView = nextView;
  currentState = state;

  if (actionText) {
    mainActionBtn.textContent = actionText;
    mainActionBtn.classList.remove("hidden");
  } else {
    mainActionBtn.classList.add("hidden");
  }

  mainActionBtn.disabled = false;
}

function getSource() {
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") || params.get("source") || params.get("ref") || CONFIG.sourceDefault;
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

    if (roll <= 0) return i;
  }

  return CONFIG.prizes.length - 1;
}

function drawStar(ctx, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(0, -outerRadius);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
    rot += step;

    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }

  ctx.lineTo(0, -outerRadius);
  ctx.closePath();
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 32;
  const segmentAngle = (Math.PI * 2) / CONFIG.prizes.length;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);

  const backGlow = ctx.createRadialGradient(0, 0, radius * 0.30, 0, 0, radius + 30);
  backGlow.addColorStop(0, "rgba(255,240,184,0.07)");
  backGlow.addColorStop(0.70, "rgba(207,166,90,0.13)");
  backGlow.addColorStop(1, "rgba(255,240,184,0.36)");

  ctx.beginPath();
  ctx.arc(0, 0, radius + 25, 0, Math.PI * 2);
  ctx.fillStyle = backGlow;
  ctx.fill();

  ctx.save();
  ctx.rotate(rotation);

  ctx.beginPath();
  ctx.arc(0, 0, radius + 16, 0, Math.PI * 2);
  ctx.fillStyle = "#0B0707";
  ctx.fill();

  ctx.lineWidth = 9;
  ctx.strokeStyle = "#FFF0B8";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(207,166,90,0.90)";
  ctx.lineWidth = 13;
  ctx.stroke();

  for (let i = 0; i < CONFIG.prizes.length; i++) {
    const start = i * segmentAngle;
    const end = start + segmentAngle;
    const mid = start + segmentAngle / 2;
    const prize = CONFIG.prizes[i];
    const palette = CONFIG.sectorColors[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 14, start, end);
    ctx.closePath();

    const sectorGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    sectorGradient.addColorStop(0, "rgba(255,255,255,0.18)");
    sectorGradient.addColorStop(0.36, palette[1]);
    sectorGradient.addColorStop(1, palette[2]);

    ctx.fillStyle = sectorGradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,240,184,0.48)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.rotate(mid);

    ctx.beginPath();
    ctx.arc(radius - 84, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,6,5,0.30)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(radius - 84, 0, 31, 0, Math.PI * 2);
    const medalGradient = ctx.createRadialGradient(radius - 95, -11, 5, radius - 84, 0, 35);
    medalGradient.addColorStop(0, "#FFFFFF");
    medalGradient.addColorStop(0.28, "#FFF0B8");
    medalGradient.addColorStop(1, "#CFA65A");
    ctx.fillStyle = medalGradient;
    ctx.fill();

    ctx.fillStyle = "#1B0D08";
    ctx.font = "950 27px Manrope, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(prize.icon, radius - 84, -2);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#FFF6DD";
    ctx.shadowColor = "rgba(0,0,0,0.68)";
    ctx.shadowBlur = 6;
    ctx.font = "950 16px Manrope, system-ui";
    ctx.fillText(prize.short, radius - 84, 54);
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(radius - 21, 0, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF0B8";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(radius - 21, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#7D5520";
    ctx.fill();

    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.fillStyle = "#0B0707";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, Math.PI * 2);
  const ringGradient = ctx.createRadialGradient(-25, -25, 10, 0, 0, 86);
  ringGradient.addColorStop(0, "#FFFFFF");
  ringGradient.addColorStop(0.28, "#FFF0B8");
  ringGradient.addColorStop(1, "#CFA65A");
  ctx.fillStyle = ringGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, Math.PI * 2);
  ctx.fillStyle = "#130B09";
  ctx.fill();

  ctx.save();
  ctx.fillStyle = "#FFF0B8";
  drawStar(ctx, 8, 30, 13);
  ctx.fill();
  ctx.restore();

  ctx.restore();
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
    osc.frequency.value = 710;

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.040, audioContext.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.036);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.042);
  } catch {}
}

function playWinSound() {
  if (!soundEnabled) return;

  try {
    ensureAudio();

    [523, 659, 784, 1046].forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const t = audioContext.currentTime + index * 0.085;

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
  const colors = ["#CFA65A", "#FFF0B8", "#FFFFFF", "#F3D58A", "#8E672A", "#E6BE6B"];

  for (let i = 0; i < 82; i++) {
    const piece = document.createElement("div");

    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-30 - Math.random() * 60}px`;
    piece.style.width = `${7 + Math.random() * 8}px`;
    piece.style.height = `${9 + Math.random() * 15}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.2 + Math.random() * 2.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.40}s`;
    piece.style.transform = `translateY(-40px) rotate(${Math.random() * 180}deg)`;

    confetti.appendChild(piece);
  }

  setTimeout(() => {
    confetti.innerHTML = "";
  }, 5600);
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

  if (!user) return;

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

  if (!lead) return;

  spinBtn.disabled = true;
  spinBtn.querySelector("span").textContent = "Готово";
  spinBtn.querySelector("small").textContent = "заявка есть";
  statusText.textContent = `Вы уже забрали подарок: ${lead.prize}`;
}

async function spinWheel() {
  if (isSpinning) return;

  if (getExistingLead()) {
    applyAlreadyUsedState();
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  statusText.textContent = "Колесо крутится...";

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

  const finalRotation = rotation + delta + full * (7.8 + Math.random() * 1.25);
  const anticipationRotation = rotation - 0.24;

  const anticipationDuration = 220;
  const spinDuration = 4550;
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
        rotation += Math.sin((progress - 0.86) * 34) * 0.010 * (1 - progress);
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
        await goToView(prizeView, "prize", "ваш подарок", "Получить подарок");
        isSpinning = false;
      }, 420);
    }

    requestAnimationFrame(animateSpin);
  }

  requestAnimationFrame(animateAnticipation);
}

async function handleMainAction() {
  if (currentState === "prize") {
    await goToView(contactView, "contact", "контактные данные", "Подтвердить");
    setTimeout(() => nameInput.focus(), 160);
    return;
  }

  if (currentState === "contact") {
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

    mainActionBtn.disabled = true;
    mainActionBtn.textContent = "Отправляем...";

    const lead = saveLead(name, phone);

    // Пока это GitHub Pages demo без подключения к боту.
    // Для финальной Telegram-версии включим:
    // if (tg) {
    //   tg.sendData(JSON.stringify({
    //     prize: lead.prize,
    //     name: lead.name,
    //     phone: lead.phone,
    //     source: lead.source,
    //     createdAt: lead.createdAt
    //   }));
    // }

    await goToView(successView, "success", "готово", null);

    createConfetti();
    playWinSound();

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred("success");
    }

    setTimeout(() => {
      if (tg) {
        tg.close();
      }
    }, 2200);
  }
}

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  soundOnIcon.classList.toggle("hidden", !soundEnabled);
  soundOffIcon.classList.toggle("hidden", soundEnabled);

  if (soundEnabled) playTick();
});

spinBtn.addEventListener("click", spinWheel);
mainActionBtn.addEventListener("click", handleMainAction);

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

resetDemoBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_LEAD_KEY);
  localStorage.removeItem(STORAGE_LEADS_KEY);

  selectedPrize = null;
  isSpinning = false;
  rotation = 0;

  [prizeView, contactView, successView].forEach(view => view.classList.remove("active-view"));
  wheelView.classList.add("active-view");
  currentView = wheelView;
  currentState = "wheel";

  mainActionBtn.classList.add("hidden");
  spinBtn.disabled = false;
  spinBtn.querySelector("span").textContent = "Крутить";
  spinBtn.querySelector("small").textContent = "1 попытка";
  sceneLabel.textContent = "подарок для клиента";
  statusText.textContent = "Демо сброшено. Можно крутить снова.";
  errorText.textContent = "";

  drawWheel();
});

prefillTelegramData();
drawWheel();
fakeLoad();
