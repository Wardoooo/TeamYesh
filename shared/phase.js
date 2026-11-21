// Owner: M1
// Pure session rules. background.js applies the result. No chrome APIs here,
// so the rules can be checked without loading the extension.

import { CONFIG, ENDING_PHASES, STAT_KEYS, secondsForPesos } from "./config.js";

const PIPE = [
  "store",
  "purse",
  "portal",
  "ads",
  "captcha",
  "browsing",
  "finale",
  "expired",
  "survey",
  "report"
];

const LIVE = ["ads", "captcha", "browsing", "finale"];
const BRIGHTNESS_PHASES = ["ads", "captcha", "browsing"];
const BRIGHTNESS_DROP_INTERVAL_MS = 1000;
const BRIGHTNESS_DROP_PER_INTERVAL = 2;

export function emptyStats() {
  return {
    adsSeen: 0,
    skips: 0,
    closes: 0,
    captchas: 0,
    brightnessTaps: 0,
    disconnects: 0,
    surveyAnswers: 0,
    attemptedStars: 0,
    forcedStars: 0
  };
}

export function freshState() {
  return {
    phase: "store",
    coins: CONFIG.startingCoins,
    inserted: 0,
    endsAt: 0,
    adsUntil: 0,
    accessCode: "",
    credit: 0,
    brightness: 1,
    brightnessTickAt: null,
    clearToken: 0,
    rating: 0,
    review: "",
    sessionTabId: 0,
    stats: emptyStats()
  };
}

export function makeCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < CONFIG.codeLength; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sessionMs(inserted) {
  return secondsForPesos(inserted) * 1000;
}

function armSession(state, now) {
  const ms = sessionMs(Math.max(1, state.inserted));
  state.inserted = Math.max(1, state.inserted);
  state.endsAt = now + ms;
  state.adsUntil = now + Math.floor(ms * CONFIG.adsPhaseRatio);
}

// The clock never pauses. Survey, report, and an already expired session stay put.
function applyClock(state, now) {
  if (!state.endsAt || now < state.endsAt) {
    if (state.phase === "ads" && state.adsUntil && now >= state.adsUntil) {
      state.phase = "captcha";
    }
    return;
  }
  if (LIVE.includes(state.phase)) state.phase = "expired";
}

function endingEffect(before, after) {
  if (before !== after && ENDING_PHASES.includes(after)) return "show-ending";
  return null;
}

export function reduce(state, message, now) {
  const type = message?.type || "tickCheck";
  const before = state.phase;
  const next = structuredClone(state);
  let error = "";

  if (type === "entered") {
    const page = message.page;
    if (page === "store" && !next.endsAt) next.phase = "store";
    if (page === "purse" && !next.endsAt && ["store", "purse"].includes(next.phase)) {
      next.phase = "purse";
      if (!next.accessCode) next.accessCode = makeCode();
    }
    if (page === "portal" && !next.endsAt && ["store", "purse", "portal"].includes(next.phase)) {
      if (next.inserted < 1) error = "Insert a coin first.";
      else next.phase = "portal";
    }
  }

  if (type === "insertCoin") {
    const amount = message.amount == null ? 1 : Number(message.amount);
    if (next.phase !== "purse") error = "Coins only go in on the purse page.";
    else if (![1, 5, 10].includes(amount)) error = "That coin does not fit.";
    else next.inserted += amount;
  }

  if (type === "startSession") {
    const typed = String(message.code || "").trim().toUpperCase();
    if (next.phase !== "portal") error = "Enter the code on the portal page.";
    else if (next.inserted < 1) error = "Insert a coin first.";
    else if (typed !== next.accessCode) error = "That code does not match the LED.";
    else {
      armSession(next, now);
      next.phase = "ads";
    }
  }

  if (type === "expireNow") {
    if (next.phase !== "ads") error = "The exit only works during an ad.";
    else next.phase = "expired";
  }

  if (type === "captchaDone" && next.phase === "captcha") next.phase = "browsing";

  // Loading a webpage does not end the paid session. Expiry opens the diploma.

  if (type === "addCredit") {
    const amount = Math.floor(Number(message.amount));
    if (!Number.isFinite(amount) || amount === 0) {
      error = "Credit amount is not usable.";
    } else if (next.credit + amount < 0) {
      error = "Not enough credit.";
    } else {
      next.credit += amount;
    }
  }

  if (BRIGHTNESS_PHASES.includes(next.phase) && now < next.endsAt) {
    const brightness = next.brightness ?? 1;

    if (brightness > 1) {
      const lastTick = next.brightnessTickAt ?? now;
      const elapsed = Math.max(0, Math.floor((now - lastTick) / BRIGHTNESS_DROP_INTERVAL_MS));

      next.brightness = Math.max(1, brightness - elapsed * BRIGHTNESS_DROP_PER_INTERVAL);
      next.brightnessTickAt = lastTick + elapsed * BRIGHTNESS_DROP_INTERVAL_MS;
    }

    if (type === "increaseBrightness" && (next.brightness ?? 1) < 100) {
      const current = next.brightness ?? 1;

      if (current === 1) next.brightnessTickAt = now;
      next.brightness = current + 1;
      next.stats.brightnessTaps = (next.stats.brightnessTaps ?? 0) + 1;
    }
  }

  if (type === "addStat") {
    const key = message.key;
    const amount = Number(message.amount);
    const gain = Number.isFinite(amount) ? amount : 1;
    if (STAT_KEYS.includes(key)) next.stats[key] += gain;
  }

  if (type === "continueEnding") {
    if (["expired", "finale"].includes(next.phase)) next.phase = "survey";
    else if (next.phase === "survey") next.phase = "report";
  }

  if (type === "rate") {
    if (next.phase !== "survey") {
      error = "Open the review screen first.";
    } else {
      const stars = Number(message.stars);
      next.stats.attemptedStars = Number.isFinite(stars)
        ? Math.max(1, Math.min(5, Math.round(stars))) : 5;
      next.stats.forcedStars = 5;
      next.rating = 5;
      next.review = String(message.review || "").slice(0, 1000);
      next.phase = "report";
    }
  }

  if (type === "restartSession") {
    if (next.phase !== "report") {
      error = "Finish your review before starting again.";
    } else {
      Object.assign(next, freshState(), { phase: "purse", accessCode: makeCode() });
    }
  }

  if (type === "god") applyGod(next, message, now);

  if (error) return { state, error, effect: null };

  applyClock(next, now);
  let effect = endingEffect(before, next.phase);
  if (before !== "ads" && next.phase === "ads") effect = "open-landing";
  return { state: next, error: "", effect };
}

function applyGod(state, message, now) {
  const action = message.action;

  if (action === "reset") {
    const clean = freshState();
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, clean);
    return;
  }

  if (action === "addTime") {
    if (!state.endsAt || state.endsAt < now) armSession(state, now);
    else state.endsAt += CONFIG.godAddMs;
    return;
  }

  if (action === "clearAds") {
    state.clearToken += 1;
    return;
  }

  if (action === "setBrightness") {
    const value = Math.round(Number(message.value));
    if (Number.isFinite(value)) {
      state.brightness = Math.min(100, Math.max(1, value));
      state.brightnessTickAt = now;
    }
    return;
  }

  if (action === "passCaptcha") {
    if (state.phase === "ads" || state.phase === "captcha") state.phase = "browsing";
    return;
  }

  if (action === "skip") {
    const index = PIPE.indexOf(state.phase);
    if (index < 0 || index >= PIPE.length - 1) return;
    const upcoming = PIPE[index + 1];
    if (!state.accessCode) state.accessCode = makeCode();
    if (upcoming === "portal" && state.inserted < 1 && state.coins > 0) {
      state.coins -= 1;
      state.inserted += 1;
    }
    if (["ads", "captcha", "browsing", "finale"].includes(upcoming) && !state.endsAt) {
      armSession(state, now);
    }
    state.phase = upcoming;
  }
}