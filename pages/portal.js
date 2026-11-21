// The code stays on the machine LED.
// A correct code opens the terms. "sugot ko, yes" starts the browser.
// Give up only shows a clue.

import { getState, send } from "../shared/api.js";
import { play } from "../shared/sfx.js";
import { mountPageTools } from "./god.js";

mountPageTools(document.getElementById("tools"));
send({ type: "entered", page: "portal" });

const boxes = [...document.querySelectorAll(".boxes input")];
const message = document.getElementById("message");
const login = document.getElementById("login");
const terms = document.getElementById("terms");
const clue = document.getElementById("clue");
let accepted = "";

boxes.forEach((box, index) => {
  box.addEventListener("input", () => {
    box.value = box.value.slice(-1).toUpperCase();
    if (box.value && boxes[index + 1]) boxes[index + 1].focus();
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !box.value && boxes[index - 1]) {
      boxes[index - 1].focus();
    }
  });
});

document.getElementById("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const typed = code();
  if (typed.length < 6) {
    message.textContent = "Enter all 6 characters.";
    return;
  }
  const state = await getState();
  if (!state?.accessCode) {
    message.textContent = "Insert a coin on the machine first.";
    return;
  }
  if (typed !== String(state.accessCode).toUpperCase()) {
    message.textContent = "That code does not match the LED.";
    play("buzz");
    return;
  }
  accepted = typed;
  message.textContent = "";
  login.hidden = true;
  terms.hidden = false;
  window.scrollTo(0, 0);
});

document.getElementById("yes").addEventListener("click", async () => {
  const typed = accepted || code();
  await send({ type: "entered", page: "portal" });
  const result = await send({ type: "startSession", code: typed });
  if (result?.ok) return;
  terms.hidden = true;
  login.hidden = false;
  message.textContent = result?.error || "The portal only works inside the extension.";
  play("buzz");
});

document.getElementById("giveup").addEventListener("click", () => {
  clue.hidden = false;
  clue.textContent = "Look through the middle. The words I agree are heavier than the sentence around them.";
});

function code() {
  return boxes.map((box) => box.value).join("").trim().toUpperCase();
}
