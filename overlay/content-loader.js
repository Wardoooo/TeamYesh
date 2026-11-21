(() => {
  import(chrome.runtime.getURL("overlay/overlay.js"))
    .catch(error => {
      console.error("Pisonet overlay failed to load:", error);
    });
})();