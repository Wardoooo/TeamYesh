import { CONFIG } from "../shared/config.js";
import { send } from "../shared/api.js";
import { play } from "../shared/sfx.js";

let root = null;
let challenges = [];
let index = 0;
let completing = false;
let generation = 0;

const CSS = `
.cap-card {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 128px);
  overflow: auto;
  box-sizing: border-box;
  padding: 58px 24px 24px;
  background: #f3f3f3;
  color: #171717;
  border: 1px solid #777;
  box-shadow: 0 12px 32px #0008;
  font: 16px/1.5 "Segoe UI", Arial, sans-serif;
}

.cap-card * {
  box-sizing: border-box;
}

.cap-card::before {
  content: "Pisonet Verification";
  position: absolute;
  inset: 0 0 auto;
  height: 40px;
  padding: 10px 14px;
  box-sizing: border-box;
  background: #e8e8e8;
  border-bottom: 1px solid #ccc;
  font-size: 14px;
  font-weight: 600;
}

.cap-card h2 {
  font-size: 24px;
  line-height: 1.2;
  margin: 12px 0;
}

.cap-card h2:focus {
  outline: none;
}

.cap-card p {
  margin: 12px 0;
}

.cap-card .cap-progress {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: .08em;
}

.cap-card button {
  cursor: pointer;
  padding: 10px 14px;
  min-height: 44px;
  border: 1px solid #777;
  color: #171717;
  background: #f8f8f8;
  font: 600 14px "Segoe UI", Arial, sans-serif;
}

.cap-card button[type=submit],
.cap-card .cap-next {
  background: #e5e5e5;
  color: #171717;
}

.cap-card button:hover {
  background: #dedede;
}

.cap-card button:disabled {
  opacity: .65;
  cursor: wait;
}

.cap-card button:focus-visible,
.cap-card input:focus-visible {
  outline: 3px solid #236ac5;
  outline-offset: 3px;
}

.cap-card .cap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.cap-card .cap-grid button[aria-pressed=true] {
  background: #dcecff;
  border-color: #236ac5;
}

.cap-card label {
  display: block;
  margin: 12px 0;
}

.cap-card input[type=text] {
  display: block;
  width: 100%;
  font: 16px "Segoe UI", Arial, sans-serif;
  padding: 12px;
  border: 1px solid #777;
}

.cap-card .cap-reply {
  background: #fff4c7;
  padding: 12px;
  border: 1px solid #777;
}

.cap-card [hidden] {
  display: none !important;
}
`;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function mount(stage, state = {}) {
  unmount();

  const remaining = Math.max(0, (Number(state.endsAt) - Date.now()) / 1000);
  const count = remaining <= 15 ? 1 : remaining <= 35 ? 2 : 3;
  const cap = Math.max(1, Math.min(count, Number(CONFIG.captchaCap) || 3));

  challenges = ["financial", "anger", "human", "speed"];

  // Shuffle a bounded pool; no challenge can spawn an endless chain.
  for (let i = challenges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [challenges[i], challenges[j]] = [challenges[j], challenges[i]];
  }

  challenges = challenges.slice(0, cap);
  index = 0;
  completing = false;

  root = node("section", "", "cap-card");
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Absurd human verification");
  stage.append(root);

  showChallenge();
  play("boot");
}

export function unmount() {
  generation += 1;
  root?.remove();
  root = null;
  completing = false;
}

function showChallenge() {
  if (!root) return;

  root.replaceChildren();

  const style = node("style", CSS);
  const progress = node(
    "p",
    `HUMAN VERIFICATION ${index + 1} / ${challenges.length}`,
    "cap-progress"
  );

  const title = node("h2");
  title.tabIndex = -1;

  const form = node("form");
  const reply = node("p", "", "cap-reply");
  reply.setAttribute("role", "status");
  reply.hidden = true;

  const next = node(
    "button",
    index === challenges.length - 1
      ? "Finally, let me browse"
      : "Another verification? Fine.",
    "cap-next"
  );
  next.type = "button";
  next.hidden = true;

  root.append(style, progress, title, form, reply, next);

  const kind = challenges[index];
  let response = () =>
    "Verification accepted. Against our better judgment.";

  if (kind === "financial") {
    title.textContent =
      "Select everything containing financial stability.";

    const selected = new Set();
    const grid = node("div", "", "cap-grid");

    for (const item of [
      "Empty wallet",
      "Rent due",
      "₱1 coin",
      "Unpaid bills",
      "Instant noodles",
      "A very nice rock"
    ]) {
      const tile = node("button", item);
      tile.type = "button";
      tile.setAttribute("aria-pressed", "false");

      tile.addEventListener("click", () => {
        if (selected.has(item)) {
          selected.delete(item);
        } else {
          selected.add(item);
        }
        tile.setAttribute("aria-pressed", String(selected.has(item)));
      });

      grid.append(tile);
    }

    const verify = node("button", "None of these / Verify");
    verify.type = "submit";

    form.append(
      node("p", "Select any tiles that qualify, or verify without selecting any."),
      grid,
      verify
    );

    response = () =>
      selected.size
        ? "Financial stability not found. We admire your optimism. Accepted anyway."
        : "Correct. Financial stability is not included in this subscription.";
  } else if (kind === "anger") {
    title.textContent = 'Type “I am not angry” to continue.';

    const label = node("label", "Your very calm response");
    const input = node("input");
    input.type = "text";
    input.required = true;
    input.maxLength = 80;
    input.autocomplete = "off";
    label.append(input);

    const verify = node("button", "Verify my patience");
    verify.type = "submit";
    form.append(label, verify);

    response = () =>
      input.value.trim().toLowerCase() === "i am not angry"
        ? "Your typing suggests otherwise. Accepted anyway."
        : "That sounds angry too. Accepted to prevent further damage.";
  } else {
    title.textContent =
      kind === "human"
        ? "Prove you are human."
        : "Which connection is the fastest?";

    const choices =
      kind === "human"
        ? ["Yes", "Probably", "Ask my mother"]
        : ["Dial-up", "Carrier pigeon", "My imagination"];

    let choice = choices[0];

    choices.forEach((text, i) => {
      const label = node("label");
      const input = node("input");
      input.type = "radio";
      input.name = "cap-choice";
      input.checked = i === 0;
      input.addEventListener("change", () => {
        choice = text;
      });
      label.append(input, document.createTextNode(` ${text}`));
      form.append(label);
    });

    const verify = node("button", "Submit extremely scientific evidence");
    verify.type = "submit";
    form.append(verify);

    response = () =>
      kind === "human"
        ? `“${choice}” is exactly what a human would say. Suspicious. Approved.`
        : `“${choice}” is faster than our internet. Approved.`;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const submit = form.querySelector("button[type=submit]");
    if (submit.disabled || !form.reportValidity()) return;

    submit.disabled = true;
    reply.textContent = response();
    reply.hidden = false;
    next.hidden = false;

    form.querySelectorAll("input, button").forEach(control => {
      control.disabled = true;
    });

    play("buzz");

    try {
      await send({ type: "addStat", key: "captchas", amount: 1 });
    } catch {
      // Continue button can still retry the session.
    }

    if (root?.contains(next)) next.focus();
  });

  next.addEventListener("click", async () => {
    if (completing) return;

    if (index < challenges.length - 1) {
      index += 1;
      showChallenge();
      return;
    }

    completing = true;
    play("ding");
    next.disabled = true;

    const token = generation;

    try {
      const result = await send({ type: "captchaDone" });
      if (token !== generation || !root) return;

      if (!result?.ok) {
        throw new Error(
          result?.error || "Connection hiccup. Try that button again."
        );
      }
    } catch (err) {
      if (token !== generation || !root) return;
      completing = false;
      next.disabled = false;
      reply.textContent = err.message;
    }
  });

  title.focus();
}