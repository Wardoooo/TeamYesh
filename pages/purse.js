// Owner: M1
// Drag a peso onto the metal slot. The code is not printed.
// It blinks on the machine LED. ₱1 = 60s, ₱5 = 5 min, ₱10 = 10 min.

import { CONFIG } from "../shared/config.js";
import { send, onState } from "../shared/api.js";
import { play } from "../shared/sfx.js";
import { mountPageTools } from "./god.js";

const led = document.getElementById("led");
const slot = document.getElementById("slot");
const balance = document.getElementById("balance");
const message = document.getElementById("message");
const next = document.getElementById("next");

mountPageTools(document.getElementById("tools"));
send({ type: "entered", page: "purse" });

let latest = null;

onState((state) => {
  latest = state;
  const seconds = state.inserted * CONFIG.secondsPerCoin;
  balance.textContent = `Inserted: ₱${state.inserted} · Time: ${format(seconds)}`;
  paintLed(state);
});

next.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!latest || latest.inserted < 1) {
    message.textContent = "The slot is still hungry.";
    return;
  }
  const result = await send({ type: "entered", page: "portal" });
  if (result && result.ok === false) {
    message.textContent = result.error || "Not yet.";
    return;
  }
  window.location.href = "portal.html";
});

document.querySelectorAll(".peso").forEach((coin) => {
  coin.addEventListener("pointerdown", (event) => startDrag(coin, event));
});

function paintLed(state) {
  if (!state.inserted) {
    led.classList.remove("code-on");
    led.innerHTML = "<div>WIFI NAME:</div><div>PISO_WIFI</div><div>PHP 1.00 = 30 MINS*</div>";
    return;
  }
  const seconds = state.inserted * CONFIG.secondsPerCoin;
  led.classList.add("code-on");
  led.innerHTML = `<div>CODE</div><div>${state.accessCode || "------"}</div><div>PHP ${state.inserted}.00 = ${format(seconds)}</div>`;
}

function startDrag(coin, event) {
  event.preventDefault();
  const home = coin.parentElement;
  const start = coin.getBoundingClientRect();
  const shiftX = event.clientX - start.left;
  const shiftY = event.clientY - start.top;
  coin.classList.add("dragging");
  coin.style.position = "fixed";
  coin.style.left = `${start.left}px`;
  coin.style.top = `${start.top}px`;
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
    if (!dropped) {
      release(coin);
      return;
    }
    const result = await send({ type: "insertCoin", amount: Number(coin.dataset.amount) });
    if (!result?.ok) {
      release(coin);
      message.textContent = result?.offline
        ? "Open this from the extension icon so the coin is counted."
        : (result?.error || "Coin jammed.");
      return;
    }
    play("coin");
    message.textContent = "";
    swallow(coin, home);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function swallow(coin, home) {
  const slit = document.getElementById("slit").getBoundingClientRect();
  coin.style.transition = "left 160ms linear, top 160ms linear, transform 160ms linear";
  coin.style.left = `${slit.left}px`;
  coin.style.top = `${slit.top}px`;
  coin.style.transform = "scale(0.15)";
  setTimeout(() => {
    coin.style.transition = "";
    coin.style.transform = "";
    release(coin);
    home.append(coin);
  }, 170);
}

function release(coin) {
  coin.classList.remove("dragging");
  coin.style.position = "";
  coin.style.left = "";
  coin.style.top = "";
  coin.style.margin = "";
}

function overlaps(a, b) {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

function format(total) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
