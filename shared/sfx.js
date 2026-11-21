// Owner: M5 drops the mp3 files in. Anyone may call play().
// Expected files: assets/sounds/coin.mp3, jingle.mp3, buzz.mp3, boot.mp3, ding.mp3
// Missing files are ignored so the demo still runs before the audio exists.
// Play from the page that received the click. A content script cannot rely on
// audio that was started in the service worker.

import { canUseExtension } from "./api.js";

export function play(name) {
  if (!canUseExtension()) return;
  const audio = new Audio(chrome.runtime.getURL(`assets/sounds/${name}.mp3`));
  audio.play().catch(() => {});
}
