// Owner: M1
// Shared rules from the locked decisions. Import this. Do not copy the numbers
// into your own file, or the phases will drift apart.

export const CONFIG = {
  // One peso is 60 seconds. Five pesos is 3 minutes. Ten pesos is 5 minutes.
  // The total decides the rate. Reaching 5 or 10 replaces the stacked minutes.
  secondsPerCoin: 60,
  startingCoins: 5,
  codeLength: 6,
  landingUrl: "https://www.google.com",
  // First half of the purchased time is the ads phase. The clock never pauses.
  adsPhaseRatio: 0.5,
  // Each ad stays this long, then another random one replaces it.
  adHoldMs: 8000,
  // Skip loads another ad. After this many skips the button stops.
  // Catching the fleeing X ends the session. Pay does not.
  skipCap: 3,
  captchaCap: 4,
  disconnectCap: 2,
  // The portal Agree control may jump this many times, then it stays put.
  termsMoveLimit: 2,
  godAddMs: 30 * 1000,
  aiTimeoutMs: 3000,
  // M4/M5: a serverless proxy may be pasted here later. Leave empty until then.
  // The proxy must answer with JSON { "reply": "..." }. No API key in this repo.
  aiProxyUrl: "",
  sounds: ["coin", "jingle", "buzz", "boot", "ding"]
};

// Time follows the total inserted, not each coin added on its own.
// 1–4 pesos: 60 seconds each.
// 5–9 pesos: 3 minutes. Five ₱1 coins drop back to 3 minutes, not 5.
// Each full 10 pesos is 5 minutes, then the leftover uses the same rule.
// ₱5 + five ₱1 is ₱10, so 5 minutes. ₱11 is 5 minutes + 60 seconds.
export function secondsForPesos(total) {
  const pesos = Math.max(0, Math.floor(Number(total) || 0));
  const bundles = Math.floor(pesos / 10);
  const rest = pesos % 10;
  const restSeconds = rest >= 5 ? 3 * 60 : rest * CONFIG.secondsPerCoin;
  return bundles * 5 * 60 + restSeconds;
}

export const PHASES = [
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

export const ENDING_PHASES = ["finale", "expired", "survey", "report"];

export const STAT_KEYS = [
  "adsSeen",
  "skips",
  "closes",
  "captchas",
  "brightnessTaps",
  "disconnects",
  "surveyAnswers",
  "attemptedStars",
  "forcedStars"
];

// Messages (send these to background.js; do not call another module):
// getState
// entered            { page: "store" | "purse" | "portal" }
// insertCoin         { amount: 1 | 5 | 10 }  time comes from secondsForPesos(total)
// startSession       { code }
// captchaDone
// pageLoaded         { url }
// addCredit          { amount }
// addStat            { key, amount }
// tickCheck
// expireNow          caught the fleeing X during the ads phase -> expired
// continueEnding     expired -> survey, or survey -> report
// rate               { stars }  any value is stored, then forced to 5
// god                { action, value }
//   actions: skip | addTime | clearAds | passCaptcha | setBrightness | reset
// Sound is not a message. Call play() from shared/sfx.js on the page that
// received the click. Files live in assets/sounds/<name>.mp3.
