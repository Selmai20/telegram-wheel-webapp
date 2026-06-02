const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinBtn = document.getElementById("spinBtn");
const resultCard = document.getElementById("resultCard");
const formCard = document.getElementById("formCard");
const successCard = document.getElementById("successCard");

const prizeText = document.getElementById("prizeText");
const claimBtn = document.getElementById("claimBtn");
const sendBtn = document.getElementById("sendBtn");

const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const errorText = document.getElementById("errorText");
const confetti = document.getElementById("confetti");

const prizes = [
  { label: "Монтаж натяжных потолков в подарок", short: "Потолки", emoji: "🏠" },
  { label: "От 3 до 5 м² плитки в подарок", short: "Плитка", emoji: "🧱" },
  { label: "Скидка на электрику", short: "Электрика", emoji: "💡" },
  { label: "Бесплатная консультация", short: "Консультация", emoji: "💬" },
  { label: "Подарок к ремонту", short: "Подарок", emoji: "🎁" },
  { label: "Скидка на сантехнику", short: "Сантехника", emoji: "🚿" },
  { label: "Бесплатный замер", short: "Замер", emoji: "📏" },
  { label: "Бонус на материалы", short: "Материалы", emoji: "🛠️" }
];

const colors = [
  "#FFB703",
  "#FB8500",
  "#FF006E",
  "#8338EC",
  "#3A86FF",
  "#06D6A0",
  "#FFD166",
  "#EF476F"
];

let rotation = 0;
let isSpinning = false;
let selectedPrize = null;

function hidePanels() {
  resultCard.classList.add("hidden");
  formCard.classList.add("hidden");
  successCard.classList.add("hidden");
}

function showPanel(panel) {
  hidePanels();
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  const segmentAngle = full / prizes.length;

  const normalized = getNormalizedRotation(finalRotation);
  const pointerAngle = (Math.PI * 1.5 - normalized + full) % full;

  return Math.floor(pointerAngle / segmentAngle);
}

function drawCenterCap(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 49, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 234, 170, 0.85)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 43, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 12;
  const segmentAngle = (Math.PI * 2) / prizes.length;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  for (let i = 0; i < prizes.length; i++) {
    const start = i * segmentAngle;
    const end = start + segmentAngle;
    const prize = prizes[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();

    const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 3;
    ctx.stroke();

    const mid = start + segmentAngle / 2;

    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 4;

    ctx.font = "900 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(prize.emoji, radius - 74, -4);

    ctx.font = "900 13px system-ui, -apple-system, sans-serif";
    ctx.fillText(prize.short, radius - 78, 18);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 10;
  ctx.stroke();

  drawCenterCap(0, 0);

  ctx.restore();
}

function createConfetti() {
  confetti.innerHTML = "";

  const confettiColors = [
    "#ffd166",
    "#ff6aa2",
    "#7bdff2",
    "#9b5de5",
    "#ffffff",
    "#ff9f1c"
  ];

  for (let i = 0; i < 42; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-20 - Math.random() * 20}px`;
    piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.transform = `translateY(-30px) rotate(${Math.random() * 180}deg)`;

    confetti.appendChild(piece);
  }

  setTimeout(() => {
    confetti.innerHTML = "";
  }, 5000);
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

function spinWheel() {
  if (isSpinning) {
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  errorText.textContent = "";
  hidePanels();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("medium");
  }

  const full = Math.PI * 2;
  const segmentAngle = full / prizes.length;

  const randomIndex = Math.floor(Math.random() * prizes.length);

  const currentNormalized = getNormalizedRotation(rotation);
  const targetAngle = Math.PI * 1.5 - (randomIndex * segmentAngle + segmentAngle / 2);

  let delta = targetAngle - currentNormalized;
  if (delta < 0) {
    delta += full;
  }

  const finalRotation = rotation + delta + full * (7 + Math.random() * 1.5);
  const anticipationRotation = rotation - 0.28;

  const anticipationDuration = 220;
  const spinDuration = 4100;

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

      const wobble =
        progress > 0.87
          ? Math.sin((progress - 0.87) * 32) * 0.01 * (1 - progress)
          : 0;

      rotation += wobble;

      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
        return;
      }

      rotation = finalRotation;
      drawWheel();

      isSpinning = false;
      spinBtn.disabled = false;

      const prizeIndex = getPrizeIndexByRotation(rotation);
      selectedPrize = prizes[prizeIndex];

      prizeText.textContent = selectedPrize.label;
      showPanel(resultCard);
      createConfetti();

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }
    }

    requestAnimationFrame(animateSpin);
  }

  requestAnimationFrame(animateAnticipation);
}

spinBtn.addEventListener("click", spinWheel);

claimBtn.addEventListener("click", () => {
  showPanel(formCard);

  setTimeout(() => {
    nameInput.focus();
  }, 250);
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

sendBtn.addEventListener("click", () => {
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

  const payload = {
    prize: selectedPrize.label,
    name,
    phone
  };

  if (tg) {
    tg.sendData(JSON.stringify(payload));
  }

  showPanel(successCard);

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred("success");
  }

  setTimeout(() => {
    if (tg) {
      tg.close();
    }
  }, 1800);
});

prefillTelegramData();
drawWheel();
