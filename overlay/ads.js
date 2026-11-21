// Owner: M2
// Ads phase: one popup, either the full page or about two thirds of it.
// It stays for CONFIG.adHoldMs, then a random ad replaces it.
// Skip does that too, until CONFIG.skipCap. Pay is clickable and changes nothing.
// The X runs from the cursor. Catching it sends the session to the expired page.
// The bamboo frame is a separate layer and stays above this card.
// Browsing: the smaller card from before. Close dismisses that one.

import { ADS } from "./ads-data.js";
import { CONFIG } from "../shared/config.js";
import { play } from "../shared/sfx.js";

const TAUNTS = [
  "Too slow.",
  "Almost. That is the sad part.",
  "The X has places to be.",
  "Missed. The ad feels loved.",
  "Closer. Still no.",
  "Your peso called. It said no."
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

export function mount(stage, state) {
  mode = state.phase === "browsing" ? "browsing" : "ads";
  skips = 0;
  root = document.createElement("div");
  root.className = "ads-root";
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "2147483646";
  root.style.pointerEvents = "none";
  document.documentElement.append(root);

  if (mode === "ads") {
    showAd();
    return;
  }

  wait = setTimeout(() => {
    showBrowsingCard();
    pulse = setInterval(showBrowsingCard, 15000);
  }, 5000);
}

export function unmount() {
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
  root.replaceChildren(card);
  sendStat("adsSeen");
  startSound(ad, media);

  card.addEventListener("pointermove", (event) => {
    // Leave the button alone once the cursor is on it, so a caught click can land.
    if (covering(exit, event) || !near(exit, event)) return;
    flee(exit, card, event);
    note.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  });

  exit.addEventListener("click", () => {
    sendStat("closes");
    clearTimeout(rotate);
    root.replaceChildren();
    chrome.runtime.sendMessage({ type: "expireNow" });
  });

  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      note.textContent = "Skip is tired.";
      return;
    }
    skips += 1;
    sendStat("skips");
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
  const cardWidth = 320;
  const maxX = Math.max(16, window.innerWidth - cardWidth - 16);
  const maxY = Math.max(72, window.innerHeight - 460);
  paintShell(card);
  card.style.left = `${16 + Math.random() * (maxX - 16)}px`;
  card.style.top = `${72 + Math.random() * Math.max(1, maxY - 72)}px`;
  card.style.width = `${cardWidth}px`;
  card.style.height = "auto";

  const decoy = button("×", "ads-x");
  decoy.style.top = "6px";
  decoy.style.left = "6px";
  const exit = button("×", "ads-x");
  exit.style.top = "6px";
  exit.style.right = "6px";
  const media = buildMedia(ad);
  media.style.position = "relative";
  media.style.height = "220px";
  const dock = document.createElement("div");
  dock.className = "ads-dock";
  paintDock(dock);
  dock.style.position = "relative";
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

  decoy.addEventListener("click", () => showBrowsingCard());
  exit.addEventListener("click", () => {
    sendStat("closes");
    card.remove();
  });
  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      note.textContent = "Skip is tired. The ad stays.";
      return;
    }
    skips += 1;
    sendStat("skips");
    card.remove();
  });
  pay.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "addCredit", amount: -1 }, (result) => {
      if (!result?.ok) {
        note.textContent = "No credit. The ad stays.";
        return;
      }
      sendStat("closes");
      card.remove();
    });
  });

  root.replaceChildren(card);
  sendStat("adsSeen");
  startSound(ad, media);
}

function pickAd() {
  if (ADS.length === 1) {
    lastPick = 0;
    return ADS[0];
  }
  let index = Math.floor(Math.random() * ADS.length);
  if (index === lastPick) index = (index + 1) % ADS.length;
  lastPick = index;
  return ADS[index];
}

function placeAd(card) {
  const full = Math.random() < 0.5;
  if (full) {
    card.style.inset = "0";
    card.style.width = "100vw";
    card.style.height = "100vh";
    return;
  }
  const width = Math.round(window.innerWidth * 0.66);
  const height = Math.round(window.innerHeight * 0.66);
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  card.style.width = `${width}px`;
  card.style.height = `${height}px`;
  card.style.left = `${Math.round(Math.random() * maxLeft)}px`;
  card.style.top = `${Math.round(Math.random() * maxTop)}px`;
}

function buildMedia(ad) {
  const source = chrome.runtime.getURL(ad.src || ad.image || "");
  if (ad.kind === "video") {
    const video = document.createElement("video");
    video.className = "ads-media";
    video.src = source;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.muted = true;
    paintMedia(video);
    return video;
  }
  const photo = document.createElement("img");
  photo.className = "ads-media";
  photo.alt = "Advertisement";
  photo.src = source;
  paintMedia(photo);
  return photo;
}

function startSound(ad, media) {
  if (media.tagName === "VIDEO") {
    const pending = media.play();
    if (ad.sound === true && pending) {
      pending.then(() => {
        media.muted = false;
        return media.play();
      }).catch(() => {
        media.muted = true;
        media.play().catch(() => {});
      });
    }
  }
  if (typeof ad.sound === "string") play(ad.sound);
}

function covering(control, event) {
  const box = control.getBoundingClientRect();
  return event.clientX >= box.left && event.clientX <= box.right
    && event.clientY >= box.top && event.clientY <= box.bottom;
}

function near(control, event) {
  const box = control.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  return dx * dx + dy * dy < NEAR * NEAR;
}

let fledAt = 0;

function flee(control, card, event) {
  const now = Date.now();
  if (now - fledAt < 140) return;
  fledAt = now;
  const rect = card.getBoundingClientRect();
  const pad = Math.min(56, Math.max(8, Math.floor(Math.min(rect.width, rect.height) / 10)));
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  let x = pad;
  let y = pad;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    x = pad + Math.random() * Math.max(10, rect.width - 36 - pad * 2);
    y = pad + Math.random() * Math.max(10, rect.height - 36 - pad * 2);
    const dx = x - localX;
    const dy = y - localY;
    if (dx * dx + dy * dy > FLEE_GAP * FLEE_GAP) break;
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
  card.style.fontFamily = "Segoe UI, sans-serif";
}

function paintMedia(node) {
  node.style.display = "block";
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.objectFit = "cover";
  node.style.background = "#111";
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
  dock.style.background = "linear-gradient(transparent, rgba(0,0,0,.72))";
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
  chrome.runtime.sendMessage({ type: "addStat", key, amount: 1 });
}
