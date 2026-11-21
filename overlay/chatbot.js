import { askNonsense } from "../shared/ai.js";

const jokes = [
  "A refrigerator loses every staring contest because it keeps giving the microwave the cold shoulder.",
  "A potato has fourteen unfinished dreams. Twelve are about becoming a hash brown.",
  "A square glass gives water four corners to think about. This has delayed several meetings.",
  "The ceiling filed a complaint because the floor keeps taking all the steps.",
  "WiFi signals slow down near a spoon because they assume it is a toll booth."
];
let host;
let fallbackIndex = Math.floor(Math.random() * jokes.length);
const messages = [];

function node(tag, content) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  return element;
}


export function mount(stage) {
  if (host) return;
  host = node("div");
  const shadow = host.attachShadow({ mode: "open" });
  const css = node("link");
  css.rel = "stylesheet";
  css.href = new URL("./chatbot.css", import.meta.url).href;
  const dock = node("div");
  dock.className = "chat-dock";
  const toggle = node("button", "Piso Support");
  toggle.type = "button";
  toggle.className = "chat-toggle";
  toggle.setAttribute("aria-controls", "piso-chat");
  toggle.setAttribute("aria-expanded", "false");
  const panel = node("section");
  panel.id = "piso-chat";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Piso Support chat");
  const heading = node("h2", "Piso Support");
  const intro = node("p", "Certified nonsense. Every fact is made up.");
  const log = node("ol");
  log.setAttribute("role", "log");
  log.setAttribute("aria-label", "Chat history");
  const progress = node("p");
  progress.setAttribute("role", "status");
  const form = node("form");
  const input = node("input");
  input.maxLength = 500;
  input.placeholder = "Ask something pointless…";
  input.setAttribute("aria-label", "Your message");
  const submit = node("button", "Send");
  submit.type = "submit";
  const currentHost = host;
  let pending = false;

  function append({ role, text }) {
    const line = node("li", text);
    line.className = role;
    log.append(line);
    log.scrollTop = log.scrollHeight;
  }

  for (const message of messages) append(message);
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    if (panel.hidden) return;
    input.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || pending) return;
    pending = submit.disabled = true;
    input.value = "";
    const message = { role: "user", text };
    messages.push(message);
    append(message);
    progress.textContent = "Consulting a very confident router…";
    const liveReply = await askNonsense(messages.slice(-9));
    const fallback = jokes[fallbackIndex++ % jokes.length];
    const reply = { role: "model", text: liveReply || fallback };
    messages.push(reply);
    if (messages.length > 50) messages.splice(0, 2);
    if (host !== currentHost) return;
    append(reply);
    progress.textContent = liveReply ? "" : "Gemini is unavailable. Showing a canned joke.";
    pending = submit.disabled = false;
  });
  form.append(input, submit);
  panel.append(heading, intro, log, progress, form);
  dock.append(panel, toggle);
  shadow.append(css, dock);
  stage.append(host);
}

export function unmount() {
  host?.remove();
  host = null;
}
