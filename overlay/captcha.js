// Owner: M3
// CAPTCHA chain. Build 4 or more types. Always end by CONFIG.captchaCap (4).
// When the chain ends, send { type: "captchaDone" }.
// Count tries with { type: "addStat", key: "captchas" }.
// Delete the temporary button when the real chain is in.

let root = null;

export function mount(stage) {
  root = document.createElement("button");
  root.type = "button";
  root.className = "shell-temp";
  root.textContent = "TEMPORARY pass CAPTCHA";
  root.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "addStat", key: "captchas", amount: 1 });
    chrome.runtime.sendMessage({ type: "captchaDone" });
  });
  stage.append(root);
}

export function unmount() {
  root?.remove();
  root = null;
}
