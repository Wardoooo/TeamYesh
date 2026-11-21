// Owner: M5
// Suffering concierge. Call mount(parent, state) from pages/finale.js
// when the report is on screen. unmount() removes the card and its timers.
// Roast from askAi() in shared/ai.js, with a canned fallback.

let root = null;

export function mount(parent, state) {
  root = document.createElement("aside");
  root.className = "pop-root";
  const ads = state?.stats?.adsSeen ?? 0;
  root.textContent = `Concierge stub. Ads survived: ${ads}. Replace this with the roast.`;
  parent.append(root);
}

export function unmount() {
  root?.remove();
  root = null;
}
