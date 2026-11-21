import { ADS, SCAM_VIDEO, MEME_ADS } from "./ads-data.js";
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
let videoTimer = 0;
let videoDismissals = 0;
let adsDeadline = 0;
let lastMeme = -1;
let lastMissedClick = 0;

export function mount(stage, state) {
  unmount();

  mode = state.phase === "browsing" ? "browsing" : "ads";
  skips = 0;
  lastMeme = -1;
  lastMissedClick = 0;
  videoDismissals = 0;
  adsDeadline = Number(state.adsUntil) || Date.now() + 60_000;

  root = document.createElement("div");
  root.className = "ads-root";
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "2147483646";
  root.style.pointerEvents = "none";

  document.documentElement.append(root);
  window.addEventListener("resize", repositionCards);

  if (mode === "ads") {
    const videos = ADS.filter(ad => ad.kind === "video");
    // The newest initial card is a video, so it is visible and playing.
    const firstVideo = videos[Math.floor(Math.random() * videos.length)];
    for (let count = 0; count < 3; count += 1) showAd(count === 2 ? firstVideo : null);
    scheduleScamVideo();
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
  clearTimeout(videoTimer);

  wait = 0;
  pulse = 0;
  rotate = 0;
  videoTimer = 0;

  root?.remove();
  root = null;
}

function showAd(adOverride = null) {
  if (!root || !ADS.length) return;

  clearTimeout(rotate);

  const ad = adOverride || pickAd();
  const card = document.createElement("article");
  card.className = "ads-card";
  if (ad.bonus) card.dataset.bonus = "true";
  if (ad.fullscreen) card.dataset.fullscreen = "true";

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

  if (ad.fullscreen) {
    root.querySelectorAll("video").forEach(video => video.pause());
    root.replaceChildren();
  }

  appendCard(card);
  sendStat("adsSeen");
  startSound(ad, media);

  if (ad === SCAM_VIDEO) {
    media.loop = false;
    media.addEventListener("click", () => {
      videoDismissals += 1;
      clearTimeout(rotate);
      showAd();
      scheduleScamVideo();
    });
    media.addEventListener("ended", () => {
      clearTimeout(rotate);
      showAd();
      scheduleScamVideo();
    }, { once: true });
  }

  installRageClose(card, [exit], note, exit);

  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      play("buzz");
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

  if (ad.kind !== "video") rotate = setTimeout(showAd, CONFIG.adHoldMs);
}

function scheduleScamVideo() {
  clearTimeout(videoTimer);
  const remaining = adsDeadline - Date.now();
  const frequency = Math.pow(0.65, videoDismissals);
  // Keep the first appearance early enough to be obvious, then shorten the
  // random window again each time the viewer dismisses the video.
  const maxDelay = Math.min(15_000 * frequency, remaining - 500);
  if (maxDelay <= 0) return;
  const minDelay = Math.min(3_000 * frequency, maxDelay);
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  videoTimer = setTimeout(() => {
    videoTimer = 0;
    showAd(SCAM_VIDEO);
  }, delay);
}

function showBrowsingCard() {
  if (!root || !ADS.length) return;

  const ad = pickAd();
  const card = document.createElement("article");
  card.className = "ads-card";

  paintShell(card);
  placeAd(card);

  const decoy = button("×", "ads-x");
  decoy.setAttribute("aria-label", "Close advertisement");
  decoy.style.top = "6px";
  decoy.style.left = "6px";

  const exit = button("×", "ads-x");
  exit.setAttribute("aria-label", "Close advertisement");
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

  // The second half is browsing time: either X simply closes this card.
  [decoy, exit].forEach(control => {
    control.addEventListener("click", () => {
      sendStat("closes");
      removeCard();
    });
  });

  skip.addEventListener("click", () => {
    if (skips >= CONFIG.skipCap) {
      play("buzz");
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

function showBonusAd(note) {
  if (!root || mode !== "ads" || !MEME_ADS.length || Date.now() >= adsDeadline) return;
  lastMeme = (lastMeme + 1) % MEME_ADS.length;
  const bonus = { ...MEME_ADS[lastMeme], bonus: true };
  note.textContent = "Close request denied. Bonus ad unlocked.";
  play("buzz");
  sendStat("closes");
  showAd(bonus);
}

function installRageClose(card, exits, note, fleeingExit = null) {
  let dodge = null;
  exits.forEach(exit => {
    exit.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      dodge = null;
      showBonusAd(note);
    });
  });
  if (!fleeingExit) return;

  card.addEventListener("pointermove", event => {
    if (covering(fleeingExit, event) || !near(fleeingExit, event)) return;
    const box = fleeingExit.getBoundingClientRect();
    dodge = { x: box.left + box.width / 2, y: box.top + box.height / 2, at: Date.now() };
    flee(fleeingExit, card, event);
    note.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  });

  // A click at the place where the fleeing X just was is an attempt too.
  card.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button, video, input")) return;
    const now = Date.now();
    if (!dodge || now - dodge.at > 1500 || now - lastMissedClick < 350) return;
    if (Math.hypot(event.clientX - dodge.x, event.clientY - dodge.y) > NEAR) return;
    dodge = null;
    lastMissedClick = now;
    showBonusAd(note);
  });
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
  if (card.dataset.fullscreen === "true") {
    card.style.inset = "0";
    card.style.width = "100vw";
    card.style.height = "100vh";
    return;
  }
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
  if (ad.kind === "meme") {
    const panel = document.createElement("div");
    panel.className = "ads-media ads-meme";
    paintMedia(panel);
    Object.assign(panel.style, {
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "18px 18px 100px", boxSizing: "border-box",
      background: ad.color || "#ffe14a", color: "#111", textAlign: "center"
    });
    const heading = document.createElement("strong");
    heading.textContent = ad.title;
    Object.assign(heading.style, { font: "900 clamp(14px, 2.1vw, 23px)/1.1 Arial, sans-serif", overflowWrap: "anywhere" });
    const message = document.createElement("p");
    message.textContent = ad.message;
    Object.assign(message.style, { font: "700 clamp(11px, 1.3vw, 15px)/1.25 Arial, sans-serif", margin: "12px 0 0" });
    panel.append(heading, message);
    return panel;
  }
  const path = ad.src || ad.image;

  // Empty path means a black placeholder.
  if (!path) return placeholder();

  const media = document.createElement(
    ad.kind === "video" ? "video" : "img"
  );

  media.className = "ads-media";
  paintMedia(media);
  if (ad.fit) media.style.objectFit = ad.fit;

  // Missing or broken media becomes a black placeholder.
  media.addEventListener(
    "error",
    () => media.replaceWith(placeholder()),
    { once: true }
  );

  if (ad.kind === "video") {
    media.autoplay = true;
    media.loop = !ad.fullscreen;
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
  } else {
    play("jingle");
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
