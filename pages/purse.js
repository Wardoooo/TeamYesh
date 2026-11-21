// Drag a peso from the tarpaulin into the metal slot.
// The LED holds the wifi name, the access code, and the time due.
// ₱1 = 60s, ₱5 = 3 min, ₱10 = 5 min. The total picks the rate.

import { secondsForPesos } from "../shared/config.js";
import { send, onState } from "../shared/api.js";
import { play } from "../shared/sfx.js";
import { mountPageTools } from "./god.js";

const led = document.getElementById("led");
const ledCode = document.getElementById("led-code");
const ledTime = document.getElementById("led-time");
const slot = document.getElementById("slot");
const toast = document.querySelector(".toast");

mountPageTools(document.getElementById("tools"));
send({ type: "entered", page: "purse" });

let latest = null;

onState((state) => {
  latest = state;
  paintLed(state);
});

document.getElementById("connect").addEventListener("click", async () => {
  if (!latest || latest.inserted < 1) {
    if (toast) toast.textContent = "Insert a coin first.";
    return;
  }
  const result = await send({ type: "entered", page: "portal" });
  if (result && result.ok === false) {
    if (toast) toast.textContent = result.error || "Not yet.";
    return;
  }
  window.location.href = "portal.html";
});

document.querySelectorAll(".peso").forEach((coin) => {
  coin.addEventListener("pointerdown", (event) => startDrag(coin, event));
});

function paintLed(state) {
  const inserted = Number(state.inserted || 0);
  const seconds = secondsForPesos(inserted);
  const showCode = inserted > 0 && state.accessCode;
  ledCode.hidden = !showCode;
  ledCode.textContent = showCode ? state.accessCode : "";
  ledTime.textContent = `PHP ${inserted.toFixed(2)} = ${format(seconds)}`;
  led.classList.toggle("code-on", Boolean(showCode));
}

function startDrag(coin, event) {
  event.preventDefault();
  const start = coin.getBoundingClientRect();
  const shiftX = event.clientX - start.left;
  const shiftY = event.clientY - start.top;
  coin.classList.add("dragging");
  coin.style.position = "fixed";
  coin.style.left = `${start.left}px`;
  coin.style.top = `${start.top}px`;
  coin.style.width = `${start.width}px`;
  coin.style.height = `${start.height}px`;
  coin.style.margin = "0";
  try { coin.setPointerCapture(event.pointerId); } catch (err) { /* still follow the pointer */ }

  function place(x, y) {
    coin.style.left = `${x - shiftX}px`;
    coin.style.top = `${y - shiftY}px`;
    slot.classList.toggle("hot", overlaps(coin.getBoundingClientRect(), slot.getBoundingClientRect()));
  }

  function onMove(ev) {
    if (ev.clientX == null) return;
    place(ev.clientX, ev.clientY);
  }

  async function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    const finger = {
      left: ev.clientX,
      right: ev.clientX,
      top: ev.clientY,
      bottom: ev.clientY
    };
    const dropped = overlaps(coin.getBoundingClientRect(), slot.getBoundingClientRect())
      || overlaps(finger, slot.getBoundingClientRect());
    slot.classList.remove("hot");
    release(coin);
    if (!dropped) return;
    const result = await send({ type: "insertCoin", amount: Number(coin.dataset.amount) });
    if (!result?.ok) {
      if (toast) toast.textContent = result?.error || "Coin jammed.";
      return;
    }
    play("coin");
    if (toast) toast.textContent = "";
    paintLed(result.state);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function release(coin) {
  coin.classList.remove("dragging");
  coin.style.position = "";
  coin.style.left = "";
  coin.style.top = "";
  coin.style.width = "";
  coin.style.height = "";
  coin.style.margin = "";
}

function overlaps(a, b) {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

function format(total) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
