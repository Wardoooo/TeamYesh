// Owner: M3
let cleanup = null;

export function mount(stage, state) {
  unmount();

  const shade = document.createElement("div");
  shade.setAttribute("aria-hidden", "true");
  Object.assign(shade.style, {
    position: "absolute",
    inset: "0",
    zIndex: "1000",
    backgroundColor: "black",
    pointerEvents: "none"
  });

  const wheel = document.createElement("button");
  wheel.type = "button";
  wheel.title = "Scroll up to increase brightness";
  Object.assign(wheel.style, {
    position: "absolute",
    left: "50%",
    bottom: "44px",
    transform: "translateX(-50%)",
    zIndex: "1001",
    pointerEvents: "auto",
    padding: "10px 18px",
    border: "3px solid #e2b34a",
    borderRadius: "24px",
    background: "#19140e",
    color: "#fff",
    font: "bold 14px system-ui, sans-serif",
    cursor: "ns-resize"
  });

  function paint(value) {
    const brightness = value ?? 1;
    shade.style.opacity = String(1 - brightness / 100);
    wheel.textContent = `↑ Scroll up · Brightness ${brightness}%`;
  }

  function increase() {
    chrome.runtime.sendMessage({ type: "increaseBrightness" });
  }

  wheel.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();

    if (event.deltaY < 0) increase();
  }, { passive: false });

  // Clicking, Enter, and Space also work.
  wheel.addEventListener("click", increase);

  function onStorageChange(changes, area) {
    const updated = changes.state?.newValue;
    if (area === "local" && updated) {
      paint(updated.brightness);
    }
  }

  paint(state.brightness);
  stage.append(shade, wheel);
  chrome.storage.onChanged.addListener(onStorageChange);

  cleanup = () => {
    chrome.storage.onChanged.removeListener(onStorageChange);
    shade.remove();
    wheel.remove();
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}