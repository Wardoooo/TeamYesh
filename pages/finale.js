import { send, onState } from "../shared/api.js";

const status = document.getElementById("status");
const error = document.getElementById("error");
const form = document.getElementById("review-form");
let latest = null;
let currentScreen = "";
let declined = false;

function show(screen) {
  document.querySelectorAll("[data-screen]").forEach(section => {
    section.hidden = section.dataset.screen !== screen;
  });
  if (screen !== currentScreen) {
    currentScreen = screen;
    document.querySelector(`[data-screen="${screen}"] h1`)?.focus();
  }
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

onState(state => {
  if (!state) return;
  latest = state;
  const screen = { expired: "diploma", finale: "diploma", survey: "survey", report: "report" }[state.phase];
  status.hidden = Boolean(screen);
  if (screen) {
    show(screen === "report" && declined ? "goodbye" : screen);
  } else {
    show("");
    status.textContent = "Finish your session to receive your diploma.";
  }
});

// Also replace the loading text if this file is opened outside the extension.
send({ type: "getState" }).then(result => {
  if (result?.offline) status.textContent = "Open this page through the Pisonet extension.";
}).catch(() => showError("Could not connect to your session. Reload the extension and try again."));

document.getElementById("diploma-next").addEventListener("click", event => {
  perform(event.currentTarget, { type: "continueEnding" });
});

form.addEventListener("submit", event => {
  event.preventDefault();
  if (latest?.phase !== "survey" || !form.reportValidity()) return;
  const chosen = new FormData(form).get("rating");
  perform(document.getElementById("submit-review"), {
    type: "rate",
    stars: Number(chosen),
    review: document.getElementById("feedback").value
  });
});

async function restart(event) {
  const button = event.currentTarget;
  const result = await perform(button, { type: "restartSession" });
  if (result) window.location.assign("purse.html");
}

document.getElementById("use-again").addEventListener("click", restart);
document.getElementById("changed-mind").addEventListener("click", restart);
document.getElementById("leave").addEventListener("click", () => {
  declined = true;
  show("goodbye");
});
