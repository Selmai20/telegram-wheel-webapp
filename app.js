const tg = window.Telegram?.WebApp;

if (tg) {
  tg.expand();
  tg.ready();
}

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinBtn = document.getElementById("spinBtn");
const resultPanel = document.getElementById("resultPanel");
const formPanel = document.getElementById("formPanel");
const successPanel = document.getElementById("successPanel");

const prizeText = document.getElementById("prizeText");
const claimBtn = document.getElementById("claimBtn");
const sendBtn = document.getElementById("sendBtn");

const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const errorText = document.getElementById("errorText");

const prizes = [
  "Монтаж натяжных потолков в подарок",
  "От 3 до 5 м² плитки в подарок",
  "Скидка на электрику",
  "Бесплатная консультация",
  "Подарок к ремонту",
  "Скидка на сантехнику",
  "Бесплатный замер",
  "Бонус на материалы"
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

function drawRoundedText(text, x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 14px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.48)";
  ctx.shadowBlur = 4;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
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

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();

    const gradient = ctx.createRadialGradient(0, 0, 25, 0, 0, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.76)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + segmentAngle / 2);
    ctx.textAlign = "right";

    const shortText = prizes[i].length > 21
      ? prizes[i].slice(0, 21) + "..."
      : prizes[i];

    drawRoundedText(shortText, radius - 18, 5);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 61, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();

  ctx.restore();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getPrizeIndexByRotation(finalRotation) {
  const full = Math.PI * 2;
  const segmentAngle = full / prizes.length;
  const normalized = ((finalRotation % full) + full) % full;
  const pointerAngle = (Math.PI * 1.5 - normalized + full) % full;
  return Math.floor(pointerAngle / segmentAngle);
}

function spinWheel() {
  if (isSpinning) return;

  isSpinning = true;
  spinBtn.disabled = true;
  resultPanel.classList.add("hidden");
  formPanel.classList.add("hidden");
  successPanel.classList.add("hidden");
  errorText.textContent = "";

  const full = Math.PI * 2;
  const randomIndex = Math.floor(Math.random() * prizes.length);
  const segmentAngle = full / prizes.length;

  const targetAngle = Math.PI * 1.5 - (randomIndex * segmentAngle + segmentAngle / 2);
  const extraSpins = 6 + Math.floor(Math.random() * 3);

  const startRotation = rotation;
  const endRotation = extraSpins * full + targetAngle;

  const duration = 4300;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);

    rotation = startRotation + (endRotation - startRotation) * eased;

    drawWheel();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      spinBtn.disabled = false;

      const prizeIndex = getPrizeIndexByRotation(rotation);
      selectedPrize = prizes[prizeIndex];

      prizeText.textContent = selectedPrize;
      resultPanel.classList.remove("hidden");

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }
    }
  }

  requestAnimationFrame(animate);
}

spinBtn.addEventListener("click", spinWheel);

claimBtn.addEventListener("click", () => {
  resultPanel.classList.add("hidden");
  formPanel.classList.remove("hidden");
  nameInput.focus();
});

sendBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

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
    errorText.textContent = "Введите номер телефона";
    return;
  }

  const payload = {
    prize: selectedPrize,
    name,
    phone
  };

  if (tg) {
    tg.sendData(JSON.stringify(payload));
  }

  formPanel.classList.add("hidden");
  successPanel.classList.remove("hidden");

  setTimeout(() => {
    if (tg) {
      tg.close();
    }
  }, 1800);
});

drawWheel();
