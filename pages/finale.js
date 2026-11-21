// Owner: M5
// Finale, expired, forced 5-star survey, and the graduation report.
// The clock is what ends the finale. Do not pause it.

import { send, onState } from "../shared/api.js";
import { mountPageTools } from "./god.js";
import { mount, unmount } from "../overlay/popups.js";

mountPageTools(document.getElementById("tools"));

const stars = document.getElementById("stars");
for (let value = 1; value <= 5; value += 1) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${value} star`;
  button.addEventListener("click", () => send({ type: "rate", stars: value }));
  stars.append(button);
}

document.getElementById("expired-next").addEventListener("click", () => {
  send({ type: "continueEnding" });
});

const screens = ["finale", "expired", "survey", "report"];
let conciergeOn = false;

onState((state) => {
  const ending = screens.includes(state.phase);
  document.getElementById("other").hidden = ending;
  document.querySelectorAll("[data-screen]").forEach((section) => {
    section.hidden = section.dataset.screen !== state.phase;
  });
  document.getElementById("stats").textContent = JSON.stringify({
    rating: state.rating,
    credit: state.credit,
    inserted: state.inserted,
    brightness: state.brightness,
    stats: state.stats
  }, null, 2);

  if (state.phase === "report" && !conciergeOn) {
    mount(document.getElementById("concierge"), state);
    conciergeOn = true;
  }
  if (state.phase !== "report" && conciergeOn) {
    unmount();
    conciergeOn = false;
  }
});

setInterval(() => send({ type: "tickCheck" }), 500);
