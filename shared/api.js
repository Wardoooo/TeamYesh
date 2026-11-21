// Owner: M1
// Small helper for extension pages. Modules talk to background.js through this.

export function canUseExtension() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

export function send(message) {
  if (!canUseExtension()) {
    return Promise.resolve({ ok: false, offline: true });
  }
  return chrome.runtime.sendMessage(message);
}

export function getState() {
  return send({ type: "getState" }).then((result) => result?.state || null);
}

export function onState(callback) {
  if (!canUseExtension()) return () => {};
  const listener = (changes, area) => {
    if (area === "local" && changes.state) callback(changes.state.newValue);
  };
  chrome.storage.onChanged.addListener(listener);
  getState().then((state) => {
    if (state) callback(state);
  });
  return () => chrome.storage.onChanged.removeListener(listener);
}
