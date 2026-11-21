// The browser's wait cursor is a frozen picture. This one is a real element,
// so the ring can keep turning while a page change is in progress.

const KEY = "pisonet-nav-cursor";
const HOLD_MS = 1400;

export function mountNavCursor() {
  const cursor = document.createElement("div");
  cursor.className = "nav-cursor";
  cursor.hidden = true;
  cursor.setAttribute("aria-hidden", "true");
  const ring = document.createElement("span");
  ring.className = "nav-cursor-spin";
  cursor.append(ring);
  document.body.append(cursor);

  const style = document.createElement("style");
  style.textContent = `
    html.nav-busy, html.nav-busy * { cursor: none !important; }
    .nav-cursor {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 2147483646;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    .nav-cursor[hidden] { display: none; }
    .nav-cursor-spin {
      display: block;
      width: 28px;
      height: 28px;
      margin: -14px 0 0 -14px;
      box-sizing: border-box;
      border: 4px solid rgba(17, 17, 17, 0.28);
      border-top-color: #2f7bff;
      border-right-color: #ffe14a;
      border-radius: 50%;
      animation: nav-cursor-spin 0.55s linear infinite;
    }
    @keyframes nav-cursor-spin { to { transform: rotate(360deg); } }
  `;
  document.head.append(style);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let hideTimer = 0;

  function place(nextX, nextY) {
    x = nextX;
    y = nextY;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  function show(ms) {
    cursor.hidden = false;
    document.documentElement.classList.add("nav-busy");
    sessionStorage.setItem(KEY, JSON.stringify({ x, y, until: Date.now() + ms }));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, ms);
  }

  function hide() {
    cursor.hidden = true;
    document.documentElement.classList.remove("nav-busy");
    sessionStorage.removeItem(KEY);
  }

  document.addEventListener("pointermove", (event) => {
    place(event.clientX, event.clientY);
  }, { passive: true });

  function arm(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("a[href], #connect, #yes")) return;
    if (event.clientX || event.clientY) place(event.clientX, event.clientY);
    show(HOLD_MS);
  }

  document.addEventListener("pointerdown", arm, true);
  document.addEventListener("click", arm, true);

  const saved = readSaved();
  if (saved && saved.until > Date.now()) {
    place(saved.x, saved.y);
    show(saved.until - Date.now());
  }
}

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}
