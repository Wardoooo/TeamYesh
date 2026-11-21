// Owner: M1
// The digits are the real session tools. The red GOD MODE button is a decoy.
// Overlay has its own copy for real web pages. Extension pages use this one.

import { mountSoundControl } from "../shared/sfx.js";
import { CONFIG } from "../shared/config.js";
import { send, onState, canUseExtension } from "../shared/api.js";

export function mountPageTools(parent) {
  parent.innerHTML = `
    <button class="hud-time" type="button">00:00</button>
    <button class="hud-decoy" type="button">GOD MODE</button>
    <div class="god-panel" hidden>
      <div>session tools</div>
      <button type="button" data-god="skip">Next phase</button>
      <button type="button" data-god="addTime">Add 30 seconds</button>
      <button type="button" data-god="clearAds">Clear ads</button>
      <button type="button" data-god="passCaptcha">Pass CAPTCHA</button>
      <label>Brightness <input data-bright type="number" min="1" max="100" value="1"></label>
      <button type="button" data-god="reset">Reset demo</button>
    </div>
  `;

  mountSoundControl(parent);

  const time = parent.querySelector(".hud-time");
  const panel = parent.querySelector(".god-panel");
  const bright = parent.querySelector("[data-bright]");
  const toast = document.querySelector(".toast");
  let latest = null;

  time.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  parent.querySelector(".hud-decoy").addEventListener("click", () => {
    if (toast) toast.textContent = "ACCESS DENIED. Clap 3 times and say the magic word.";
  });

  panel.addEventListener("click", (event) => {
    const action = event.target?.dataset?.god;
    if (!action) return;
    send({ type: "god", action });
    if (action === "reset") panel.hidden = true;
  });

  bright.addEventListener("change", () => {
    send({ type: "god", action: "setBrightness", value: bright.value });
  });

  onState((state) => {
    latest = state;
    bright.value = String(state.brightness || 1);
  });

  setInterval(() => {
    if (canUseExtension()) send({ type: "tickCheck" });
    paint();
  }, 500);

  function paint() {
    if (!latest) return;
    if (latest.endsAt) {
      const left = Math.max(0, latest.endsAt - Date.now());
      time.textContent = format(Math.ceil(left / 1000));
      return;
    }
    time.textContent = format(latest.inserted * CONFIG.secondsPerCoin);
  }
}

function format(total) {
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
