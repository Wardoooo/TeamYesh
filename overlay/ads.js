import { ADS } from "./ads-data.js";
import { CONFIG } from "../shared/config.js";
import { play } from "../shared/sfx.js";

const TAUNTS = [
  "Too slow.",
  "Almost.",
  "The X has places to be.",
  "Missed. The ad feels loved."
];

const NEAR = 90;
const FLEE_GAP = 160;

let root = null;
let mode = "ads";
let skips = 0;
let lastPick = -1;
let wait = 0;
let pulse = 0;
let rotate = 0;
let fledAt = 0;

export function mount(stage, state) {
  unmount();

  mode = state.phase === "browsing" ? "browsing" : "ads";
  skips = 0;

  root = document.createElement("div");
  root.className = "ads-root";
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "2147483646";
  root.style.pointerEvents = "none";

  document.documentElement.append(root);
  window.addEventListener("resize", repositionCards);

  if (mode === "ads") {
    for (let count = 0; count < 3; count += 1) showAd();
    return;
  }

  wait = setTimeout(() => {
    showBrowsingCard();
    pulse = setInterval(showBrowsingCard, 15000);
  }, 5000);
}

export function unmount() {
  window.removeEventListener("resize", repositionCards);

  root?.querySelectorAll("video").forEach(video => {
    video.pause();
  });

  clearTimeout(wait);
  clearInterval(pulse);
  clearTimeout(rotate);

  wait = 0;
  pulse = 0;
  rotate = 0;

  root?.remove();
  root = null;
}

function showAd() {
  if (!root || !ADS.length) return;

  clearTimeout(rotate);

  const ad = pickAd();
  const card = document.createElement("article");
  card.className = "ads-card";

  paintShell(card);
  placeAd(card);

  const exit = button("×", "ads-x");
  exit.setAttribute("aria-label", "Exit ads");
  exit.style.top = "56px";
  exit.style.right = "56px";

  const media = buildMedia(ad);

  const dock = document.createElement("div");
  dock.className = "ads-dock";
  paintDock(dock);

  const note = document.createElement("p");
  note.className = "ads-note";
  paintNote(note);

  const row = document.createElement("div");
  row.className = "ads-row";
  paintRow(row);

  const skip = button("Skip", "ads-skip");
  const pay = button("Pay ₱1 to close", "ads-pay");

  row.append(skip, pay);
  dock.append(note, row);
  card.append(exit, media, dock);

  appendCard(card);
  sendStat("adsSeen");
  startSound(ad, media);

  card.addEventListener("pointermove", event => {
    if (covering(exit, event) || !near(exit, event)) return;

    flee(exit, card, event);
    note.textContent =
      TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  });

  exit.addEventListener("click", () => {
    sendStat("closes");
    clearTimeout(rotate);

    root.querySelectorAll("video").forEach(video => {
      video.pause();
    });

    root.replaceChildren();

    chrome.runtime.sendMessage({
      type: "expireNow"
    });
  });

  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      note.textContent = "Skip is tired.";
      return;
    }

    skips += 1;
    sendStat("skips");

    // Another ad appears above the previous ones.
    showAd();
  });

  pay.addEventListener("click", () => {
    note.textContent = "Premium unlocked. Nothing closed.";
  });

  rotate = setTimeout(showAd, CONFIG.adHoldMs);
}

function showBrowsingCard() {
  if (!root || !ADS.length) return;

  const ad = pickAd();
  const card = document.createElement("article");
  card.className = "ads-card";

  paintShell(card);
  placeAd(card);

  const decoy = button("×", "ads-x");
  decoy.style.top = "6px";
  decoy.style.left = "6px";

  const exit = button("×", "ads-x");
  exit.style.top = "6px";
  exit.style.right = "6px";

  const media = buildMedia(ad);

  const dock = document.createElement("div");
  dock.className = "ads-dock";
  paintDock(dock);
  dock.style.background = "#111";

  const note = document.createElement("p");
  note.className = "ads-note";
  paintNote(note);

  const row = document.createElement("div");
  row.className = "ads-row";
  paintRow(row);

  const skip = button("Skip", "ads-skip");
  const pay = button("Pay ₱1 to close", "ads-pay");

  row.append(skip, pay);
  dock.append(note, row);
  card.append(decoy, exit, media, dock);

  function removeCard() {
    card.querySelectorAll("video").forEach(video => {
      video.pause();
    });

    card.remove();
  }

  decoy.addEventListener("click", showBrowsingCard);

  exit.addEventListener("click", () => {
    sendStat("closes");
    removeCard();
  });

  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      note.textContent = "Skip is tired. The ad stays.";
      return;
    }

    skips += 1;
    sendStat("skips");
    removeCard();
  });

  pay.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      { type: "addCredit", amount: -1 },
      result => {
        if (!result?.ok) {
          note.textContent = "No credit. The ad stays.";
          return;
        }

        sendStat("closes");
        removeCard();
      }
    );
  });

  appendCard(card);
  sendStat("adsSeen");
  startSound(ad, media);
}

function pickAd() {
  if (ADS.length === 1) {
    lastPick = 0;
    return ADS[0];
  }

  let index = Math.floor(Math.random() * ADS.length);

  if (index === lastPick) {
    index = (index + 1) % ADS.length;
  }

  lastPick = index;
  return ADS[index];
}

function appendCard(card) {
  // Pause earlier videos so they do not all play at once.
  root.querySelectorAll("video").forEach(video => {
    video.pause();
  });

  // Append keeps previous ads underneath the new one.
  root.append(card);

  // Keep the latest 12 cards.
  while (root.children.length > 12) {
    root.firstElementChild.remove();
  }
}

function placeAd(card, placed = [...root.children]) {
  const margin = 12;
  const top = Math.min(72, window.innerHeight * 0.12);
  const width = Math.max(1, Math.min(420, window.innerWidth * 0.44));
  const height = Math.max(1, Math.min(280, (window.innerHeight - top) * 0.46));
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(top, window.innerHeight - height - margin);
  let best = { x: margin, y: top, separation: -1 };

  // Try spots across the whole viewport and favor the least crowded one.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x = margin + Math.random() * (maxX - margin);
    const y = top + Math.random() * (maxY - top);
    const separation = Math.min(...placed.map((other) => Math.hypot(
      (x - parseFloat(other.style.left)) / width,
      (y - parseFloat(other.style.top)) / height
    )));
    if (separation > best.separation) best = { x, y, separation };
  }

  card.style.width = `${width}px`;
  card.style.height = `${height}px`;
  card.style.left = `${best.x}px`;
  card.style.top = `${best.y}px`;
}

function repositionCards() {
  const placed = [];
  for (const card of root?.children || []) {
    placeAd(card, placed);
    placed.push(card);
  }
}

function placeholder() {
  const screen = document.createElement("div");
  screen.className = "ads-media";
  screen.setAttribute("role", "img");
  screen.setAttribute("aria-label", "Video placeholder");

  paintMedia(screen);
  screen.style.background = "#000";

  return screen;
}

function buildMedia(ad) {
  const path = ad.src || ad.image;

  // Empty path means a black placeholder.
  if (!path) return placeholder();

  const media = document.createElement(
    ad.kind === "video" ? "video" : "img"
  );

  media.className = "ads-media";
  paintMedia(media);

  // Missing or broken media becomes a black placeholder.
  media.addEventListener(
    "error",
    () => media.replaceWith(placeholder()),
    { once: true }
  );

  if (ad.kind === "video") {
    media.autoplay = true;
    media.loop = true;
    media.playsInline = true;
    media.muted = true;
    media.controls = true;
    media.style.pointerEvents = "auto";
  } else {
    media.alt = "Advertisement";
  }

  media.src = chrome.runtime.getURL(path);

  return media;
}

function startSound(ad, media) {
  if (media.tagName === "VIDEO") {
    media.play().catch(() => {});
  }

  if (typeof ad.sound === "string") {
    play(ad.sound);
  }
}

function covering(control, event) {
  const box = control.getBoundingClientRect();

  return (
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  );
}

function near(control, event) {
  const box = control.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);

  return dx * dx + dy * dy < NEAR * NEAR;
}

function flee(control, card, event) {
  const now = Date.now();

  if (now - fledAt < 140) return;
  fledAt = now;

  const rect = card.getBoundingClientRect();

  const pad = Math.min(
    56,
    Math.max(
      8,
      Math.floor(Math.min(rect.width, rect.height) / 10)
    )
  );

  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;

  let x = pad;
  let y = pad;

  for (let attempt = 0; attempt < 8; attempt++) {
    x =
      pad +
      Math.random() *
        Math.max(10, rect.width - 36 - pad * 2);

    y =
      pad +
      Math.random() *
        Math.max(10, rect.height - 36 - pad * 2);

    const dx = x - localX;
    const dy = y - localY;

    if (dx * dx + dy * dy > FLEE_GAP * FLEE_GAP) {
      break;
    }
  }

  control.style.left = `${x}px`;
  control.style.top = `${y}px`;
  control.style.right = "auto";
}

function button(text, className) {
  const node = document.createElement("button");

  node.type = "button";
  node.className = className;
  node.textContent = text;

  node.style.pointerEvents = "auto";
  node.style.cursor = "pointer";
  node.style.fontWeight = "800";
  node.style.border = "3px solid #111";
  node.style.background = "#ffe14a";
  node.style.color = "#111";

  if (className.includes("ads-x")) {
    node.style.position = "absolute";
    node.style.zIndex = "2";
    node.style.width = "36px";
    node.style.height = "36px";
    node.style.background = "#fff";
    node.style.lineHeight = "1";
    node.style.fontSize = "22px";
  } else {
    node.style.padding = "8px 12px";
  }

  return node;
}

function paintShell(card) {
  card.style.position = "fixed";
  card.style.zIndex = "2147483646";
  card.style.pointerEvents = "auto";
  card.style.overflow = "hidden";
  card.style.boxSizing = "border-box";
  card.style.background = "#111";
  card.style.color = "#fff";
  card.style.border = "6px solid #111";
  card.style.boxShadow = "8px 8px 0 #c81e1e";
  card.style.fontFamily = "Arial, sans-serif";
}

function paintMedia(node) {
  node.style.display = "block";
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.objectFit = "cover";
  node.style.background = "#000";
  node.style.pointerEvents = "none";
}

function paintDock(dock) {
  dock.style.position = "absolute";
  dock.style.left = "0";
  dock.style.right = "0";
  dock.style.bottom = "0";
  dock.style.display = "flex";
  dock.style.flexDirection = "column";
  dock.style.gap = "8px";
  dock.style.padding = "12px";
  dock.style.background =
    "linear-gradient(transparent, rgba(0,0,0,.85))";
  dock.style.pointerEvents = "auto";
}

function paintRow(row) {
  row.style.display = "flex";
  row.style.gap = "8px";
}

function paintNote(note) {
  note.style.minHeight = "1.2em";
  note.style.margin = "0";
  note.style.color = "#fff";
  note.style.fontSize = "14px";
  note.style.fontWeight = "800";
  note.style.textShadow = "0 1px 0 #111";
}

function sendStat(key) {
  chrome.runtime.sendMessage({
    type: "addStat",
    key,
    amount: 1
  });
}
