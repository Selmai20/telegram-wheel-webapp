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
  company: "КрутаниРемонт",
  variant: "krutaniremont-v19-fair",
  sourceDefault: "github-pages-demo",
  prizes: [
    {
      label: "5 м² плитки",
      lines: ["5 м²", "плитки"],
      iconType: "tile",
      weight: 1
    },
    {
      label: "Зеркало с подсветкой",
      lines: ["зеркало", "свет"],
      iconType: "mirror",
      weight: 1
    },
    {
      label: "Монтаж дверей",
      lines: ["монтаж", "дверей"],
      iconType: "door",
      weight: 1
    },
    {
      label: "Водонагреватель",
      lines: ["водо", "нагреватель"],
      iconType: "heater",
      weight: 1
    },
    {
      label: "Смеситель",
      lines: ["смеситель"],
      iconType: "faucet",
      weight: 1
    },
    {
      label: "Монтаж натяжных потолков в подарок",
      lines: ["натяжные", "потолки"],
      iconType: "ceiling",
      weight: 1
    }
  ],
  sectorColors: [
    ["#24140D", "#513419", "#120A08"],
    ["#D2A755", "#F1D28A", "#8C6126"],
    ["#3B2614", "#9A6A2A", "#1A0F0B"],
    ["#FFF0B8", "#D3A652", "#8A6027"],
    ["#6E481D", "#C9963D", "#2B190F"],
    ["#C79640", "#FFE5A0", "#80551F"]
  ]
};

const ADMIN_FALLBACK = {
  // Заполни только если хочешь отправлять админу напрямую даже если Telegram WebApp sendData не сработал.
  // ВАЖНО: токен бота будет виден в коде сайта, поэтому для финальной версии лучше использовать backend.
  enabled: false,
  botToken: "",
  adminId: ""
};

const ADMIN_DIRECT_SEND = {
  // РЕЗЕРВНАЯ отправка админу напрямую.
  // Для теста можно включить true и вставить BOT_TOKEN + ADMIN_ID.
  // Минус: BOT_TOKEN будет виден в коде сайта. Для продакшена лучше backend.
  enabled: false,
  botToken: "",
  adminId: ""
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
const possiblePrizes = document.getElementById("possiblePrizes");

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

function hideMainAction() {
  mainActionBtn.classList.add("hidden");
  mainActionBtn.style.opacity = "";
  mainActionBtn.style.transform = "";
}

async function showMainAction(text) {
  mainActionBtn.textContent = text;
  mainActionBtn.disabled = false;
  mainActionBtn.classList.remove("hidden");

  await mainActionBtn.animate(
    [
      { opacity: 0, transform: "translateY(22px) scale(0.96)" },
      { opacity: 1, transform: "translateY(-4px) scale(1.012)", offset: 0.74 },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ],
    {
      duration: 520,
      easing: "cubic-bezier(0.22, 1.12, 0.32, 1)",
      fill: "both"
    }
  ).finished;
}

async function goToView(nextView, state, label, actionText = null) {
  if (currentView === nextView) return;

  mainActionBtn.disabled = true;

  if (!mainActionBtn.classList.contains("hidden")) {
    await mainActionBtn.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(18px) scale(0.96)" }
      ],
      { duration: 220, easing: "ease", fill: "both" }
    ).finished;
    hideMainAction();
  }

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
    await showMainAction(actionText);
  } else {
    hideMainAction();
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

function getRandomFloat() {
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / 4294967296;
  }

  return Math.random();
}

function weightedRandomPrizeIndex() {
  const total = CONFIG.prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = getRandomFloat() * total;

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

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function strokeRoundRect(ctx, x, y, w, h, r) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function fillRoundRect(ctx, x, y, w, h, r) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawSpark(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  drawStar(ctx, 4, size, size * 0.4);
  ctx.fill();
  ctx.restore();
}

function drawTileIcon(ctx, x, y, scale) {
  const w = 34 * scale;
  const h = 24 * scale;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.fillStyle = "#FDF5D9";
  fillRoundRect(ctx, left, top, w, h, 4 * scale);

  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.3 * scale;
  strokeRoundRect(ctx, left, top, w, h, 4 * scale);

  ctx.beginPath();
  ctx.moveTo(left + w / 3, top);
  ctx.lineTo(left + w / 3, top + h);
  ctx.moveTo(left + 2 * w / 3, top);
  ctx.lineTo(left + 2 * w / 3, top + h);
  ctx.moveTo(left, top + h / 2);
  ctx.lineTo(left + w, top + h / 2);
  ctx.stroke();
}

function drawMirrorIcon(ctx, x, y, scale) {
  const w = 28 * scale;
  const h = 36 * scale;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  fillRoundRect(ctx, left - 2 * scale, top - 2 * scale, w + 4 * scale, h + 4 * scale, 10 * scale);

  ctx.fillStyle = "#FAF7EC";
  fillRoundRect(ctx, left, top, w, h, 9 * scale);

  ctx.fillStyle = "rgba(207,166,90,0.26)";
  fillRoundRect(ctx, left + 4 * scale, top + 4 * scale, w - 8 * scale, h - 8 * scale, 7 * scale);

  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.3 * scale;
  strokeRoundRect(ctx, left, top, w, h, 9 * scale);

  drawSpark(ctx, x - 15 * scale, y - 7 * scale, 4 * scale, "#FFF0B8");
  drawSpark(ctx, x + 16 * scale, y + 6 * scale, 3.2 * scale, "#FFF0B8");
}

function drawDoorIcon(ctx, x, y, scale) {
  const w = 24 * scale;
  const h = 38 * scale;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.fillStyle = "#F0D082";
  fillRoundRect(ctx, left, top, w, h, 4 * scale);

  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.4 * scale;
  strokeRoundRect(ctx, left, top, w, h, 4 * scale);

  ctx.beginPath();
  ctx.moveTo(left + 4 * scale, top + 7 * scale);
  ctx.lineTo(left + w - 4 * scale, top + 7 * scale);
  ctx.moveTo(left + 4 * scale, top + 14 * scale);
  ctx.lineTo(left + w - 4 * scale, top + 14 * scale);
  ctx.moveTo(left + 7 * scale, top + 4 * scale);
  ctx.lineTo(left + 7 * scale, top + h - 4 * scale);
  ctx.stroke();

  ctx.fillStyle = "#7A541F";
  ctx.beginPath();
  ctx.arc(left + w - 6 * scale, y, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawDoubleDoorIcon(ctx, x, y, scale) {
  drawDoorIcon(ctx, x - 9 * scale, y, 0.85 * scale);
  drawDoorIcon(ctx, x + 9 * scale, y, 0.85 * scale);
}

function drawHeaterIcon(ctx, x, y, scale) {
  const w = 30 * scale;
  const h = 34 * scale;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.fillStyle = "#FBF8EE";
  fillRoundRect(ctx, left, top, w, h, 6 * scale);
  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.2 * scale;
  strokeRoundRect(ctx, left, top, w, h, 6 * scale);

  ctx.beginPath();
  ctx.moveTo(left + 6 * scale, top + 9 * scale);
  ctx.lineTo(left + w - 6 * scale, top + 9 * scale);
  ctx.stroke();

  ctx.fillStyle = "#D2A755";
  ctx.beginPath();
  ctx.arc(x, y + 3 * scale, 4.3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 6 * scale, top + h);
  ctx.lineTo(x - 6 * scale, top + h + 6 * scale);
  ctx.moveTo(x + 6 * scale, top + h);
  ctx.lineTo(x + 6 * scale, top + h + 6 * scale);
  ctx.stroke();
}

function drawCeilingIcon(ctx, x, y, scale) {
  const w = 36 * scale;
  const h = 12 * scale;
  const left = x - w / 2;
  const top = y - 12 * scale;

  ctx.fillStyle = "#FBF8EE";
  fillRoundRect(ctx, left, top, w, h, 5 * scale);
  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.2 * scale;
  strokeRoundRect(ctx, left, top, w, h, 5 * scale);

  ctx.beginPath();
  ctx.moveTo(x, top + h);
  ctx.lineTo(x, top + h + 12 * scale);
  ctx.stroke();

  drawSpark(ctx, x - 10 * scale, y + 8 * scale, 3.2 * scale, "#FFF0B8");
  drawSpark(ctx, x + 10 * scale, y + 8 * scale, 3.2 * scale, "#FFF0B8");
  drawSpark(ctx, x, y + 11 * scale, 4.2 * scale, "#FFF0B8");
}

function drawFaucetIcon(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#7A541F";
  ctx.fillStyle = "#FBF8EE";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  fillRoundRect(ctx, -14, 11, 28, 8, 4);
  strokeRoundRect(ctx, -14, 11, 28, 8, 4);

  ctx.beginPath();
  ctx.moveTo(-3, 11);
  ctx.lineTo(-3, -8);
  ctx.lineTo(17, -8);
  ctx.quadraticCurveTo(24, -8, 24, -1);
  ctx.lineTo(24, 3);
  ctx.moveTo(18, 2);
  ctx.lineTo(28, 2);
  ctx.stroke();

  fillRoundRect(ctx, -11, -18, 22, 7, 3);
  strokeRoundRect(ctx, -11, -18, 22, 7, 3);

  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, -8);
  ctx.stroke();

  ctx.fillStyle = "#D2A755";
  ctx.beginPath();
  ctx.moveTo(27, 8);
  ctx.quadraticCurveTo(22, 14, 27, 18);
  ctx.quadraticCurveTo(32, 14, 27, 8);
  ctx.fill();

  ctx.restore();
}

function drawMeasureIcon(ctx, x, y, scale) {
  const w = 34 * scale;
  const h = 20 * scale;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.fillStyle = "#FBF8EE";
  fillRoundRect(ctx, left, top, w, h, 6 * scale);
  ctx.strokeStyle = "#7A541F";
  ctx.lineWidth = 2.2 * scale;
  strokeRoundRect(ctx, left, top, w, h, 6 * scale);

  ctx.beginPath();
  for (let i = 1; i <= 5; i++) {
    const xx = left + (w / 6) * i;
    ctx.moveTo(xx, top + h * 0.35);
    ctx.lineTo(xx, top + h * (i % 2 === 0 ? 0.82 : 0.62));
  }
  ctx.stroke();

  ctx.fillStyle = "#D2A755";
  ctx.beginPath();
  ctx.arc(left + w - 5 * scale, top + 5 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPrizeIcon(ctx, iconType, x, y, scale = 1) {
  switch (iconType) {
    case "tile":
      drawTileIcon(ctx, x, y, scale);
      break;
    case "mirror":
      drawMirrorIcon(ctx, x, y, scale);
      break;
    case "door":
      drawDoorIcon(ctx, x, y, scale);
      break;
    case "doubleDoor":
      drawDoubleDoorIcon(ctx, x, y, scale);
      break;
    case "heater":
      drawHeaterIcon(ctx, x, y, scale);
      break;
    case "ceiling":
      drawCeilingIcon(ctx, x, y, scale);
      break;
    case "measure":
      drawMeasureIcon(ctx, x, y, scale);
      break;
    case "faucet":
      drawFaucetIcon(ctx, x, y, scale);
      break;
  }
}

function drawPrizeLines(ctx, lines, x, y, scale = 1) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(15 * scale)}px Manrope, system-ui`;
  const lineHeight = 16 * scale;
  const widths = lines.map(line => ctx.measureText(line).width);
  const boxWidth = Math.max(...widths) + 22 * scale;
  const boxHeight = lineHeight * lines.length + 12 * scale;

  ctx.fillStyle = "rgba(11,7,7,0.42)";
  ctx.strokeStyle = "rgba(255,240,184,0.28)";
  ctx.lineWidth = 1.5 * scale;
  fillRoundRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 11 * scale);
  strokeRoundRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 11 * scale);

  ctx.fillStyle = "#FFF6DD";
  ctx.shadowColor = "rgba(0,0,0,0.72)";
  ctx.shadowBlur = 7;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });

  ctx.restore();
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

    const medalX = radius - 106;
    const medalY = -12;

    ctx.beginPath();
    ctx.arc(medalX, medalY, 50, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,6,5,0.34)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(medalX, medalY, 43, 0, Math.PI * 2);
    const medalGradient = ctx.createRadialGradient(medalX - 14, medalY - 14, 5, medalX, medalY, 48);
    medalGradient.addColorStop(0, "#FFFFFF");
    medalGradient.addColorStop(0.28, "#FFF0B8");
    medalGradient.addColorStop(1, "#CFA65A");
    ctx.fillStyle = medalGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(medalX, medalY, 35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();

    drawPrizeIcon(ctx, prize.iconType, medalX, medalY - 1, 1.18);
    drawPrizeLines(ctx, prize.lines, medalX, 66, 1.05);

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

function renderPossiblePrizes() {
  if (!possiblePrizes) return;

  const iconMap = {
    tile: "▦",
    mirror: "◯",
    door: "▯",
    doubleDoor: "▯",
    heater: "◍",
    ceiling: "✦",
    measure: "⌁",
    faucet: "◌"
  };

  possiblePrizes.innerHTML = CONFIG.prizes.map(prize => `
    <div class="prize-chip">
      <span class="prize-chip-icon">${iconMap[prize.iconType] || "◆"}</span>
      <span class="prize-chip-text">${prize.label}</span>
    </div>
  `).join("");
}

function getPhoneUtils() {
  return window.libphonenumber || window.libphonenumberJs || window.libphonenumberJS || null;
}

// Жёсткие лимиты: количество цифр ВМЕСТЕ с кодом страны.
// +375 29 123 45 67 = 12 цифр: 375291234567.
// После 12-й цифры ввод физически запрещён.
const COUNTRY_TOTAL_DIGITS_LIMITS = [
  { code: "375", max: 12, min: 12 }, // Belarus
  { code: "371", max: 11, min: 11 }, // Latvia
  { code: "370", max: 11, min: 11 }, // Lithuania
  { code: "372", max: 11, min: 10 }, // Estonia
  { code: "7", max: 11, min: 11 },   // RU/KZ
  { code: "380", max: 12, min: 12 }, // Ukraine
  { code: "48", max: 11, min: 11 },  // Poland
  { code: "49", max: 13, min: 10 },  // Germany
  { code: "44", max: 12, min: 12 },  // UK
  { code: "33", max: 11, min: 11 },  // France
  { code: "34", max: 11, min: 11 },  // Spain
  { code: "39", max: 12, min: 11 },  // Italy
  { code: "1", max: 11, min: 11 },   // US/Canada
  { code: "90", max: 12, min: 12 },  // Turkey
  { code: "995", max: 12, min: 12 }, // Georgia
  { code: "374", max: 11, min: 11 }, // Armenia
  { code: "994", max: 12, min: 12 }, // Azerbaijan
  { code: "998", max: 12, min: 12 }, // Uzbekistan
  { code: "996", max: 12, min: 12 }, // Kyrgyzstan
  { code: "992", max: 12, min: 12 }, // Tajikistan
  { code: "993", max: 11, min: 11 }, // Turkmenistan
];

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function detectCountryLimit(rawDigits) {
  const digits = digitsOnly(rawDigits);

  return COUNTRY_TOTAL_DIGITS_LIMITS
    .filter(item => digits.startsWith(item.code))
    .sort((a, b) => b.code.length - a.code.length)[0] || null;
}

function clampDigits(rawDigits) {
  let digits = digitsOnly(rawDigits);

  const limit = detectCountryLimit(digits);
  if (limit) {
    return digits.slice(0, limit.max);
  }

  // Пока код страны не определён — международный максимум E.164.
  return digits.slice(0, 15);
}

function formatBelarus(digits) {
  // 375291234567 -> +375 29 123 45 67
  const cc = digits.slice(0, 3);
  const op = digits.slice(3, 5);
  const a = digits.slice(5, 8);
  const b = digits.slice(8, 10);
  const c = digits.slice(10, 12);

  return ["+" + cc, op, a, b, c].filter(Boolean).join(" ");
}

function fallbackPhoneMask(rawDigits) {
  const digits = clampDigits(rawDigits);
  if (!digits) return "+";

  if (digits.startsWith("375")) {
    return formatBelarus(digits);
  }

  const limit = detectCountryLimit(digits);
  const countryCodeLength = limit ? limit.code.length : Math.min(3, digits.length);

  const groups = [];
  let index = 0;

  groups.push(digits.slice(index, index + countryCodeLength));
  index += countryCodeLength;

  const pattern = [2, 3, 2, 2, 3];

  for (const size of pattern) {
    if (index >= digits.length) break;
    groups.push(digits.slice(index, index + size));
    index += size;
  }

  return "+" + groups.filter(Boolean).join(" ");
}

function formatPhone(value) {
  const digits = clampDigits(value);

  if (!digits) {
    return "+";
  }

  if (digits.startsWith("375")) {
    return formatBelarus(digits);
  }

  const phoneUtils = getPhoneUtils();

  if (phoneUtils?.AsYouType) {
    try {
      return new phoneUtils.AsYouType().input("+" + digits) || ("+" + digits);
    } catch {}
  }

  return fallbackPhoneMask(digits);
}

function validatePhone(phone) {
  const clean = String(phone || "").trim();

  if (!clean || clean === "+") {
    return { valid: false, message: "Введите номер телефона" };
  }

  if (!clean.startsWith("+")) {
    return { valid: false, message: "Номер должен начинаться с + и кода страны" };
  }

  const digits = digitsOnly(clean);
  const limit = detectCountryLimit(digits);

  if (limit) {
    if (digits.length < limit.min) {
      return { valid: false, message: "Номер ещё не полный" };
    }

    if (digits.length > limit.max) {
      return { valid: false, message: "Лишние цифры в номере" };
    }
  }

  const phoneUtils = getPhoneUtils();

  if (phoneUtils?.parsePhoneNumberFromString) {
    const parsed = phoneUtils.parsePhoneNumberFromString(clean);

    if (!parsed) {
      return { valid: false, message: "Не удалось определить код страны" };
    }

    if (!parsed.country) {
      return { valid: false, message: "Код страны не распознан" };
    }

    if (!parsed.isPossible()) {
      return { valid: false, message: `Номер для страны ${parsed.country} ещё не полный` };
    }

    if (!parsed.isValid()) {
      return { valid: false, message: `Проверьте номер страны ${parsed.country}` };
    }

    return {
      valid: true,
      normalized: parsed.formatInternational(),
      country: parsed.country,
      countryCode: parsed.countryCallingCode
    };
  }

  if (digits.length < 8) {
    return { valid: false, message: "Слишком короткий номер" };
  }

  if (digits.length > 15) {
    return { valid: false, message: "Слишком длинный номер" };
  }

  return { valid: true, normalized: fallbackPhoneMask(digits) };
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
  // Повторные заявки разрешены. Не блокируем пользователя после первой отправки.
  return null;
}

async function sendLeadDirectToAdmin(lead) {
  if (!ADMIN_DIRECT_SEND.enabled || !ADMIN_DIRECT_SEND.botToken || !ADMIN_DIRECT_SEND.adminId) {
    return false;
  }

  const text = [
    "🎁 Новый подарок забрали!",
    "",
    `🏆 Приз: ${lead.prize}`,
    `👤 Имя: ${lead.name}`,
    `📞 Телефон: ${lead.phone}`,
    "",
    "⚠️ Отправлено резервным способом из WebApp"
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${ADMIN_DIRECT_SEND.botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: ADMIN_DIRECT_SEND.adminId,
        text
      })
    });

    return response.ok;
  } catch (error) {
    console.error("Direct admin send failed:", error);
    return false;
  }
}

async function sendLeadToBotAndAdmin(lead) {
  let sentToTelegramWebApp = false;

  if (tg) {
    try {
      tg.sendData(JSON.stringify({
        prize: lead.prize,
        name: lead.name,
        phone: lead.phone
      }));
      sentToTelegramWebApp = true;
    } catch (error) {
      console.error("tg.sendData failed:", error);
    }
  }

  // Резервный способ можно включить на время теста через ADMIN_DIRECT_SEND.enabled = true.
  await sendLeadDirectToAdmin(lead);

  return sentToTelegramWebApp;
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

async function notifyAdminFallback(lead) {
  if (!ADMIN_FALLBACK.enabled || !ADMIN_FALLBACK.botToken || !ADMIN_FALLBACK.adminId) {
    return;
  }

  const text =
    "🎁 Новый подарок забрали!%0A%0A" +
    `🏆 Приз: ${encodeURIComponent(lead.prize)}%0A` +
    `👤 Имя: ${encodeURIComponent(lead.name)}%0A` +
    `📞 Телефон: ${encodeURIComponent(lead.phone)}%0A` +
    `📌 Источник: ${encodeURIComponent(lead.source)}%0A` +
    `🕒 Дата: ${encodeURIComponent(lead.createdAt)}`;

  const url =
    `https://api.telegram.org/bot${ADMIN_FALLBACK.botToken}/sendMessage` +
    `?chat_id=${ADMIN_FALLBACK.adminId}&text=${text}`;

  try {
    await fetch(url);
  } catch {}
}

function applyAlreadyUsedState() {
  const lead = getExistingLead();
  if (!lead) return;

  spinBtn.disabled = true;
  spinBtn.querySelector("span").textContent = "Готово";
  spinBtn.querySelector("small").textContent = "";
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
  if (delta < 0) delta += full;

  // ВАЖНО: добавляем только ЦЕЛОЕ число оборотов.
  // Если добавить 7.8 + random оборотов, колесо визуально остановится не на рассчитанном секторе.
  const extraSpins = 7 + Math.floor(getRandomFloat() * 3);
  const finalRotation = rotation + delta + full * extraSpins;
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

      const prizeIndex = targetIndex;
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

function prefillBelarusPhone() {
  if (!phoneInput.value.trim()) {
    phoneInput.value = "+375 ";
  }
}

async function handleMainAction() {
  if (currentState === "prize") {
    await goToView(contactView, "contact", "контактные данные", "Подтвердить");
    prefillBelarusPhone();
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

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      errorText.textContent = phoneCheck.message;
      return;
    }

    mainActionBtn.disabled = true;
    mainActionBtn.textContent = "Отправляем...";

    const lead = saveLead(name, phoneCheck.normalized || phone);

    await sendLeadToBotAndAdmin(lead);

    await goToView(successView, "success", "готово", null);
    createConfetti();
    playWinSound();

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred("success");
    }

    setTimeout(() => {
      if (tg) tg.close();
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

phoneInput.addEventListener("focus", () => {
  if (!phoneInput.value.trim()) {
    phoneInput.value = "+375 ";
  }
});

phoneInput.addEventListener("keydown", event => {
  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End"
  ];

  if (allowedControlKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
    return;
  }

  if (event.key === "+") {
    if (phoneInput.value.includes("+")) {
      event.preventDefault();
    }
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }

  const currentDigits = digitsOnly(phoneInput.value);
  const selectedDigits = digitsOnly(
    phoneInput.value.slice(
      phoneInput.selectionStart ?? phoneInput.value.length,
      phoneInput.selectionEnd ?? phoneInput.value.length
    )
  );

  const baseDigits = selectedDigits.length
    ? currentDigits.slice(0, currentDigits.length - selectedDigits.length)
    : currentDigits;

  const predictedDigits = baseDigits + event.key;
  const clampedDigits = clampDigits(predictedDigits);

  if (predictedDigits.length > clampedDigits.length) {
    event.preventDefault();
  }
});

phoneInput.addEventListener("beforeinput", event => {
  if (!event.data || !/\d/.test(event.data)) {
    return;
  }

  const currentDigits = digitsOnly(phoneInput.value);
  const insertedDigits = digitsOnly(event.data);
  const predictedDigits = currentDigits + insertedDigits;
  const clampedDigits = clampDigits(predictedDigits);

  if (predictedDigits.length > clampedDigits.length) {
    event.preventDefault();
  }
});

phoneInput.addEventListener("paste", event => {
  event.preventDefault();
  const pastedText = (event.clipboardData || window.clipboardData).getData("text");
  const nextDigits = clampDigits(digitsOnly(phoneInput.value) + digitsOnly(pastedText));
  phoneInput.value = formatPhone(nextDigits);
});

phoneInput.addEventListener("input", () => {
  const clampedDigits = clampDigits(phoneInput.value);
  phoneInput.value = formatPhone(clampedDigits);

  const check = validatePhone(phoneInput.value);
  if (check.valid) {
    errorText.textContent = "";
  }
});

phoneInput.addEventListener("blur", () => {
  if (phoneInput.value.trim() && phoneInput.value.trim() !== "+") {
    phoneInput.value = formatPhone(phoneInput.value);
  }
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
  spinBtn.querySelector("small").textContent = "";
  sceneLabel.textContent = "подарок для клиента";
  statusText.textContent = "Демо сброшено. Можно крутить снова.";
  errorText.textContent = "";
  phoneInput.value = "";
  nameInput.value = "";

  drawWheel();
});

prefillTelegramData();
renderPossiblePrizes();
drawWheel();
fakeLoad();
