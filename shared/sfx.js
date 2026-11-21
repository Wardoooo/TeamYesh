// Short local tones work before the team's final sound assets are ready.
import { canUseExtension } from "./api.js";

let context = null;
let muted = false;
let pendingCue = null;
const controls = new Set();
const voices = new Set();
const lastPlayed = new Map();
const patterns = {
  coin: [[1400, 0.07], [2100, 0.09]],
  jingle: [[660, 0.09], [880, 0.09], [1100, 0.13]],
  buzz: [[140, 0.12], [110, 0.12]],
  boot: [[330, 0.1], [440, 0.1], [660, 0.16]],
  ding: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]]
};

function updateControls() {
  for (const button of controls) {
    button.textContent = muted ? "Sound: off" : "Sound: on";
    button.setAttribute("aria-label", muted ? "Unmute sound effects" : "Mute sound effects");
    button.setAttribute("aria-pressed", String(muted));
  }
}

const preferences = (async () => {
  try {
    if (canUseExtension()) {
      muted = Boolean((await chrome.storage.local.get("soundMuted")).soundMuted);
    } else {
      muted = localStorage.getItem("pisonetSoundMuted") === "true";
    }
  } catch { /* Sound must never block the demo. */ }
  updateControls();
})();

if (canUseExtension()) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.soundMuted) {
      muted = Boolean(changes.soundMuted.newValue);
      if (muted) stopSounds();
      updateControls();
    }
  });
}

function stopSounds() {
  pendingCue = null;
  for (const voice of voices) {
    try { voice.stop(); } catch { /* It may already have ended. */ }
  }
  voices.clear();
}

function unlock() {
  if (muted) return;
  try {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    context ||= new AudioContext();
    context.resume().then(() => {
      const cue = pendingCue;
      pendingCue = null;
      if (cue) play(cue);
    }).catch(() => {});
  } catch { /* A browser can decline audio; the game still works. */ }
}

// Each webpage needs its own user gesture to unlock browser audio.
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", unlock, { capture: true });
  document.addEventListener("keydown", unlock, { capture: true });
}

export async function play(name) {
  await preferences;
  if (muted || !patterns[name]) return false;
  if (!context || context.state !== "running") {
    pendingCue = name;
    return false;
  }
  const now = Date.now();
  if (now - (lastPlayed.get(name) || 0) < 600) return false;
  lastPlayed.set(name, now);
  let at = context.currentTime + 0.01;
  try {
    for (const [frequency, duration] of patterns[name]) {
      const voice = context.createOscillator();
      const volume = context.createGain();
      voice.type = name === "buzz" ? "sawtooth" : "triangle";
      voice.frequency.setValueAtTime(frequency, at);
      volume.gain.setValueAtTime(0.0001, at);
      volume.gain.exponentialRampToValueAtTime(0.035, at + 0.01);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      voice.connect(volume);
      volume.connect(context.destination);
      voices.add(voice);
      voice.onended = () => { voices.delete(voice); voice.disconnect(); volume.disconnect(); };
      voice.start(at);
      voice.stop(at + duration + 0.02);
      at += duration + 0.025;
    }
    return true;
  } catch { return false; }
}

export async function setMuted(value) {
  muted = Boolean(value);
  if (muted) stopSounds();
  updateControls();
  try {
    if (canUseExtension()) await chrome.storage.local.set({ soundMuted: muted });
    else localStorage.setItem("pisonetSoundMuted", String(muted));
  } catch { /* Keep the local toggle working even without storage. */ }
}

export function mountSoundControl(parent) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.soundControl = "";
  Object.assign(button.style, {
    pointerEvents: "auto", cursor: "pointer", border: "2px solid #222",
    background: "#fff", color: "#222", padding: "8px 10px", minHeight: "40px",
    font: "700 12px Arial, sans-serif", whiteSpace: "nowrap"
  });
  parent.append(button);
  controls.add(button);
  updateControls();
  button.addEventListener("click", async () => {
    const next = !muted;
    if (!next) { muted = false; unlock(); }
    await setMuted(next);
    if (!next) play("ding");
  });
  return () => { controls.delete(button); button.remove(); };
}
