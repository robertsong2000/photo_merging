const canvas = document.querySelector("#mergeCanvas");
const ctx = canvas.getContext("2d");
const photoInput = document.querySelector("#photoInput");
const thumbList = document.querySelector("#thumbList");
const emptyState = document.querySelector("#emptyState");
const downloadBtn = document.querySelector("#downloadBtn");
const clearPhotosBtn = document.querySelector("#clearPhotosBtn");
const addTextBtn = document.querySelector("#addTextBtn");
const deleteTextBtn = document.querySelector("#deleteTextBtn");
const textContent = document.querySelector("#textContent");
const fontSize = document.querySelector("#fontSize");
const textColor = document.querySelector("#textColor");
const textBg = document.querySelector("#textBg");
const ratioSelect = document.querySelector("#ratioSelect");
const fitSelect = document.querySelector("#fitSelect");
const gapInput = document.querySelector("#gapInput");
const pinHeightInput = document.querySelector("#pinHeightInput");
const pinHeightValue = document.querySelector("#pinHeightValue");
const selectedPhotoLabel = document.querySelector("#selectedPhotoLabel");
const photoScaleInput = document.querySelector("#photoScaleInput");
const photoOffsetXInput = document.querySelector("#photoOffsetXInput");
const photoOffsetYInput = document.querySelector("#photoOffsetYInput");
const photoScaleValue = document.querySelector("#photoScaleValue");
const photoOffsetXValue = document.querySelector("#photoOffsetXValue");
const photoOffsetYValue = document.querySelector("#photoOffsetYValue");
const resetPhotoBtn = document.querySelector("#resetPhotoBtn");
const layoutButtons = [...document.querySelectorAll("[data-layout]")];

const ratios = {
  wide: [1200, 800],
  square: [1000, 1000],
  poster: [960, 1200],
};

const state = {
  photos: [],
  layout: "pin",
  draggingPhotoId: null,
  activePhotoId: null,
  activeTextId: null,
  movingText: false,
  moveOffset: { x: 0, y: 0 },
  texts: [],
};

const imageCache = new Map();

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const id = crypto.randomUUID();
        imageCache.set(id, img);
        resolve({
          id,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          url: reader.result,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setCanvasRatio() {
  const [width, height] = ratios[ratioSelect.value];
  canvas.width = width;
  canvas.height = height;
}

function coverDraw(img, x, y, w, h, photo) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * Math.max(photo.scale, 1);
  const sw = w / scale;
  const sh = h / scale;
  const sx = clamp((img.naturalWidth - sw) / 2 + photo.offsetX * img.naturalWidth * 0.0025, 0, img.naturalWidth - sw);
  const sy = clamp((img.naturalHeight - sh) / 2 + photo.offsetY * img.naturalHeight * 0.0025, 0, img.naturalHeight - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function containDraw(img, x, y, w, h, photo) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight) * photo.scale;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + photo.offsetX * w * 0.004;
  const dy = y + (h - dh) / 2 + photo.offsetY * h * 0.004;

  ctx.fillStyle = "#eee6d8";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPhoto(img, photo, x, y, w, h) {
  if (fitSelect.value === "cover") {
    coverDraw(img, x, y, w, h, photo);
    return;
  }
  containDraw(img, x, y, w, h, photo);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPhotoSlots(count) {
  const gap = Number(gapInput.value);
  const slots = [];

  if (state.layout === "vertical") {
    const h = (canvas.height - gap * (count - 1)) / count;
    for (let i = 0; i < count; i += 1) {
      slots.push({ x: 0, y: i * (h + gap), w: canvas.width, h });
    }
    return slots;
  }

  if (state.layout === "pin" && count === 3) {
    const topH = (canvas.height - gap) * (Number(pinHeightInput.value) / 100);
    const bottomH = canvas.height - topH - gap;
    const bottomW = (canvas.width - gap) / 2;
    slots.push({ x: 0, y: 0, w: canvas.width, h: topH });
    slots.push({ x: 0, y: topH + gap, w: bottomW, h: bottomH });
    slots.push({ x: bottomW + gap, y: topH + gap, w: bottomW, h: bottomH });
    return slots;
  }

  if (state.layout === "grid" || state.layout === "pin") {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const w = (canvas.width - gap * (cols - 1)) / cols;
    const h = (canvas.height - gap * (rows - 1)) / rows;
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      slots.push({ x: col * (w + gap), y: row * (h + gap), w, h });
    }
    return slots;
  }

  const w = (canvas.width - gap * (count - 1)) / count;
  for (let i = 0; i < count; i += 1) {
    slots.push({ x: i * (w + gap), y: 0, w, h: canvas.height });
  }
  return slots;
}

function drawTextLayer(item) {
  ctx.save();
  ctx.font = `700 ${item.size}px Georgia, "Songti SC", serif`;
  ctx.textBaseline = "top";
  const paddingX = Math.max(16, item.size * 0.34);
  const paddingY = Math.max(10, item.size * 0.2);
  const metrics = ctx.measureText(item.value);
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = item.size * 1.25 + paddingY * 2;

  ctx.fillStyle = item.bg;
  ctx.globalAlpha = 0.82;
  roundRect(item.x, item.y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = item.color;
  ctx.fillText(item.value, item.x + paddingX, item.y + paddingY);
  ctx.restore();

  item.bounds = { x: item.x, y: item.y, w: boxWidth, h: boxHeight };

  if (item.id === state.activeTextId) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    roundRect(item.x - 8, item.y - 8, boxWidth + 16, boxHeight + 16, 10);
    ctx.stroke();
    ctx.strokeStyle = "rgba(24, 33, 42, 0.78)";
    ctx.lineWidth = 2;
    roundRect(item.x - 8, item.y - 8, boxWidth + 16, boxHeight + 16, 10);
    ctx.stroke();
    ctx.restore();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderCanvas() {
  setCanvasRatio();
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.photos.length) {
    const slots = getPhotoSlots(state.photos.length);
    state.photos.forEach((photo, index) => {
      const img = imageCache.get(photo.id);
      const slot = slots[index];
      if (!img || !slot) return;
      drawPhoto(img, photo, slot.x, slot.y, slot.w, slot.h);
    });
  }

  ctx.fillStyle = "rgba(24, 33, 42, 0.18)";
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);

  state.texts.forEach(drawTextLayer);
  emptyState.classList.toggle("hidden", state.photos.length > 0);
  downloadBtn.disabled = state.photos.length === 0;
  clearPhotosBtn.disabled = state.photos.length === 0;
  deleteTextBtn.disabled = !state.activeTextId;
  updatePhotoControls();
}

function renderThumbs() {
  thumbList.innerHTML = "";

  state.photos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "thumb-item";
    item.classList.toggle("active", photo.id === state.activePhotoId);
    item.draggable = true;
    item.dataset.id = photo.id;
    item.innerHTML = `
      <img alt="" src="${photo.url}">
      <div class="thumb-meta">
        <strong>${index + 1}. ${escapeHtml(photo.name)}</strong>
        <small>${photo.width} x ${photo.height}</small>
      </div>
      <button class="remove-photo" type="button" aria-label="移除 ${escapeHtml(photo.name)}">x</button>
    `;
    thumbList.append(item);
  });
}

function getActivePhoto() {
  return state.photos.find((photo) => photo.id === state.activePhotoId) || null;
}

function selectPhoto(photoId) {
  state.activePhotoId = photoId;
  renderThumbs();
  renderCanvas();
}

function updatePhotoControls() {
  const photo = getActivePhoto();
  const hasPhoto = Boolean(photo);
  [photoScaleInput, photoOffsetXInput, photoOffsetYInput, resetPhotoBtn].forEach((control) => {
    control.disabled = !hasPhoto;
  });

  if (!photo) {
    selectedPhotoLabel.textContent = "先点击一张缩略图";
    photoScaleValue.textContent = "100%";
    photoOffsetXValue.textContent = "0";
    photoOffsetYValue.textContent = "0";
    return;
  }

  selectedPhotoLabel.textContent = photo.name;
  photoScaleInput.value = Math.round(photo.scale * 100);
  photoOffsetXInput.value = Math.round(photo.offsetX);
  photoOffsetYInput.value = Math.round(photo.offsetY);
  photoScaleValue.textContent = `${Math.round(photo.scale * 100)}%`;
  photoOffsetXValue.textContent = String(Math.round(photo.offsetX));
  photoOffsetYValue.textContent = String(Math.round(photo.offsetY));
}

function updateActivePhotoAdjustments() {
  const photo = getActivePhoto();
  if (!photo) return;
  photo.scale = Number(photoScaleInput.value) / 100;
  photo.offsetX = Number(photoOffsetXInput.value);
  photo.offsetY = Number(photoOffsetYInput.value);
  updatePhotoControls();
  renderCanvas();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function addText() {
  const item = {
    id: crypto.randomUUID(),
    value: textContent.value.trim() || "团队合影",
    size: Number(fontSize.value),
    color: textColor.value,
    bg: textBg.value,
    x: Math.round(canvas.width * 0.08),
    y: Math.round(canvas.height * 0.78),
    bounds: null,
  };
  state.texts.push(item);
  state.activeTextId = item.id;
  renderCanvas();
}

function selectText(item) {
  state.activeTextId = item ? item.id : null;
  if (item) {
    textContent.value = item.value;
    fontSize.value = item.size;
    textColor.value = item.color;
    textBg.value = item.bg;
  }
  renderCanvas();
}

function updateActiveText() {
  const active = state.texts.find((item) => item.id === state.activeTextId);
  if (!active) return;
  active.value = textContent.value.trim() || "团队合影";
  active.size = Number(fontSize.value);
  active.color = textColor.value;
  active.bg = textBg.value;
  renderCanvas();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function findTextAt(point) {
  return [...state.texts].reverse().find((item) => {
    const b = item.bounds;
    return b && point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h;
  });
}

photoInput.addEventListener("change", async (event) => {
  const files = [...event.target.files].filter((file) => file.type.startsWith("image/"));
  const photos = await Promise.all(files.map(readPhoto));
  state.photos.push(...photos);
  if (!state.activePhotoId && photos.length) {
    state.activePhotoId = photos[0].id;
  }
  photoInput.value = "";
  renderThumbs();
  renderCanvas();
});

layoutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.layout = button.dataset.layout;
    layoutButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderCanvas();
  });
});

[ratioSelect, fitSelect, gapInput].forEach((control) => control.addEventListener("input", renderCanvas));
pinHeightInput.addEventListener("input", () => {
  pinHeightValue.textContent = `${pinHeightInput.value}%`;
  renderCanvas();
});
[photoScaleInput, photoOffsetXInput, photoOffsetYInput].forEach((control) => {
  control.addEventListener("input", updateActivePhotoAdjustments);
});
[textContent, fontSize, textColor, textBg].forEach((control) => control.addEventListener("input", updateActiveText));

addTextBtn.addEventListener("click", addText);

deleteTextBtn.addEventListener("click", () => {
  if (!state.activeTextId) return;
  const currentIndex = state.texts.findIndex((item) => item.id === state.activeTextId);
  state.texts = state.texts.filter((item) => item.id !== state.activeTextId);
  const fallback = state.texts[Math.min(currentIndex, state.texts.length - 1)] || null;
  selectText(fallback);
});

clearPhotosBtn.addEventListener("click", () => {
  state.photos = [];
  state.activePhotoId = null;
  imageCache.clear();
  renderThumbs();
  renderCanvas();
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `team-photo-merge-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

thumbList.addEventListener("click", (event) => {
  const item = event.target.closest(".thumb-item");
  if (!item) return;
  const removeButton = event.target.closest(".remove-photo");
  if (!removeButton) {
    selectPhoto(item.dataset.id);
    return;
  }
  state.photos = state.photos.filter((photo) => photo.id !== item.dataset.id);
  imageCache.delete(item.dataset.id);
  if (state.activePhotoId === item.dataset.id) {
    state.activePhotoId = state.photos[0]?.id || null;
  }
  renderThumbs();
  renderCanvas();
});

resetPhotoBtn.addEventListener("click", () => {
  const photo = getActivePhoto();
  if (!photo) return;
  photo.scale = 1;
  photo.offsetX = 0;
  photo.offsetY = 0;
  renderCanvas();
});

thumbList.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".thumb-item");
  if (!item) return;
  state.draggingPhotoId = item.dataset.id;
  item.classList.add("dragging");
});

thumbList.addEventListener("dragend", () => {
  state.draggingPhotoId = null;
  document.querySelectorAll(".thumb-item").forEach((item) => item.classList.remove("dragging"));
});

thumbList.addEventListener("dragover", (event) => {
  event.preventDefault();
  const overItem = event.target.closest(".thumb-item");
  if (!overItem || overItem.dataset.id === state.draggingPhotoId) return;
  const from = state.photos.findIndex((photo) => photo.id === state.draggingPhotoId);
  const to = state.photos.findIndex((photo) => photo.id === overItem.dataset.id);
  if (from < 0 || to < 0) return;
  const [moved] = state.photos.splice(from, 1);
  state.photos.splice(to, 0, moved);
  renderThumbs();
  renderCanvas();
});

canvas.addEventListener("pointerdown", (event) => {
  const point = getCanvasPoint(event);
  const item = findTextAt(point);
  if (!item) {
    selectText(null);
    return;
  }
  selectText(item);
  state.movingText = true;
  state.moveOffset = { x: point.x - item.x, y: point.y - item.y };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.movingText) return;
  const item = state.texts.find((entry) => entry.id === state.activeTextId);
  if (!item) return;
  const point = getCanvasPoint(event);
  item.x = Math.max(0, Math.min(canvas.width - 20, point.x - state.moveOffset.x));
  item.y = Math.max(0, Math.min(canvas.height - 20, point.y - state.moveOffset.y));
  renderCanvas();
});

canvas.addEventListener("pointerup", (event) => {
  state.movingText = false;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

addText();
renderCanvas();
