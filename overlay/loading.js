// Owner: M4
// Fake loading cover: slow bar, stuck at 99%, disconnects capped at
// CONFIG.disconnectCap (2). Stat key: "disconnects".
// When the real load has survived your cap, send:
// { type: "pageLoaded", url: location.href }
// Browsing now continues until the session timer expires.

let root = null;

export function mount(stage) {
  root = document.createElement("button");
  root.type = "button";
  root.className = "shell-temp";
  root.textContent = "TEMPORARY page loaded";
  root.addEventListener("click", () => {
    root.textContent = "Page loaded. Enjoy your remaining time.";
    root.disabled = true;
    chrome.runtime.sendMessage({ type: "pageLoaded", url: location.href });
  });
  stage.append(root);
}

export function unmount() {
  root?.remove();
  root = null;
}
