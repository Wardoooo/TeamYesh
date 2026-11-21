import { CONFIG } from "./config.js";

function seconds(value) {
  const count = Math.max(0, Math.floor(value));
  return `${count} ${count === 1 ? "second" : "seconds"}`;
}

export function receiptRows(state) {
  const stats = state.stats || {};
  const purchased = Math.max(0, Number(state.inserted) || 0) * CONFIG.secondsPerCoin;
  const started = Number(state.startedAt) || 0;
  const ended = Number(state.endedAt) || Number(state.endsAt) || started;
  const elapsed = started ? Math.max(0, (ended - started) / 1000) : 0;
  const browsing = state.browsingStartedAt
    ? Math.max(0, (ended - Math.max(started, state.browsingStartedAt)) / 1000) : 0;
  const measured = started > 0;
  return [
    ["Pesos inserted", `₱${Math.max(0, Number(state.inserted) || 0)}`],
    ["Internet time purchased", seconds(purchased)],
    ["Time spent on obstacles", measured ? seconds(elapsed - browsing) : "Not recorded for this older session"],
    ["Browsing time unlocked", measured ? seconds(browsing) : "Not recorded for this older session"],
    ["Ads encountered", String(stats.adsSeen || 0)],
    ["Skip attempts", String(stats.skips || 0)],
    ["CAPTCHAs endured", String(stats.captchas || 0)],
    ["Patience remaining", "Not found"],
    ["Customer satisfaction", "Automatically 100%"]
  ];
}
