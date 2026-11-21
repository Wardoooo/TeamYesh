import { send, onState } from "../shared/api.js";
import { receiptRows } from "../shared/receipt.js";
import { play, mountSoundControl } from "../shared/sfx.js";

mountSoundControl(document.getElementById("sound-controls"));

const status = document.getElementById("status");
const error = document.getElementById("error");
const form = document.getElementById("review-form");
const goodbyeVideo = document.querySelector(".goodbye-background");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let latest = null;
let currentScreen = "";
let declined = false;
let reviewBusy = false;
let correctionTimer = 0;

function show(screen) {
  document.querySelectorAll("[data-screen]").forEach(section => {
    section.hidden = section.dataset.screen !== screen;
  });
  if (screen !== currentScreen) {
    currentScreen = screen;
    if (screen === "goodbye" && !reducedMotion.matches) {
      goodbyeVideo.play().then(() => {
        if (currentScreen === "goodbye") goodbyeVideo.hidden = false;
      }).catch(() => { goodbyeVideo.hidden = true; });
    } else {
      goodbyeVideo.pause();
      goodbyeVideo.hidden = true;
    }
    if (screen === "diploma" || screen === "report") play("ding");
    document.querySelector(`[data-screen="${screen}"] h1`)?.focus();
  }
}

function showIdle(message) {
  status.hidden = false;
  status.textContent = message;
  show("idle");
}

function showError(message) {
  error.textContent = message;
  error.hidden = false;
}

async function perform(button, message) {
  button.disabled = true;
  error.hidden = true;
  try {
    const result = await send(message);
    if (!result?.ok) {
      throw new Error(result?.error || "Open Pisonet from the extension icon and try again.");
    }
    return result;
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
    return null;
  } finally {
    button.disabled = false;
  }
}

function render(state) {
  if (!state) return;
  latest = state;
  const receipt = document.getElementById("receipt");
  receipt.replaceChildren();
  for (const [label, value] of receiptRows(state)) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    if (label === "TOTAL") {
      term.className = "receipt-total";
      detail.className = "receipt-total";
    }
    receipt.append(term, detail);
  }
  if (reviewBusy && state.phase === "survey") return;
  const screen = { expired: "diploma", finale: "diploma", survey: "survey", report: "report" }[state.phase];
  status.hidden = Boolean(screen);
  if (screen) {
    show(screen === "report" && declined ? "goodbye" : screen);
  } else {
    showIdle("Finish your session to receive your diploma.");
  }
}
onState(render);

// Also replace the loading text if this file is opened outside the extension.
send({ type: "getState" }).then(result => {
  if (!result?.ok) showIdle("Open this page through the Pisonet extension.");
}).catch(() => showIdle("Could not connect to your session. Reload the extension and try again."));

document.getElementById("diploma-next").addEventListener("click", event => {
  perform(event.currentTarget, { type: "continueEnding" });
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (reviewBusy || latest?.phase !== "survey" || !form.reportValidity()) return;
  const chosen = Number(new FormData(form).get("rating"));
  const review = document.getElementById("feedback").value;
  reviewBusy = true;
  error.hidden = true;
  play("buzz");
  document.getElementById("chosen-rating").textContent = `You selected ${chosen} out of 5. Our system is reconsidering.`;
  const stars = document.getElementById("correction-stars");
  stars.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const star = document.createElement("span");
    star.textContent = "★";
    star.setAttribute("aria-hidden", "true");
    star.className = i < chosen ? "already-filled" : "being-corrected";
    star.style.setProperty("--delay", `${250 + i * 160}ms`);
    stars.append(star);
  }
  show("correcting");
  await new Promise(resolve => { correctionTimer = setTimeout(resolve, 1500); });
  correctionTimer = 0;
  reviewBusy = false;
  // A developer reset or a change in another tab cancels this submission.
  if (latest?.phase !== "survey") { render(latest); return; }
  const result = await perform(document.getElementById("submit-review"), {
    type: "rate", stars: chosen, review
  });
  if (!result) render(latest);
});

window.addEventListener("pagehide", () => clearTimeout(correctionTimer));

async function restart(event) {
  const button = event.currentTarget;
  const result = await perform(button, { type: "restartSession" });
  if (result) window.location.assign("../index.html");
}

document.getElementById("use-again").addEventListener("click", restart);
document.getElementById("changed-mind").addEventListener("click", restart);
document.getElementById("leave").addEventListener("click", () => {
  declined = true;
  show("goodbye");
});
