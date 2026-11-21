const { gsap, ScrollTrigger } = window;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => setup(gsap, ScrollTrigger));
  // A page in the back-forward cache keeps its existing animation context.
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) media.revert();
  });
}

function setup(gsap, ScrollTrigger) {
  const controller = new AbortController();
  const boundChats = new Map();
  const seen = new WeakSet();
  const activeSections = new Map();
  let refreshFrame;
  // Run observer and listener callbacks in the same cleanup scope as the entrance.
  const context = gsap.context(() => {});
  const track = (callback) => context.add(null, callback);

  function refresh() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  function animateSection(section, timeline) {
    if (!section.getClientRects().length || seen.has(section)) return;
    seen.add(section);
    const targets = [...section.querySelectorAll(
      "h1, h2, h3, p, li, .step, button, a.skip-btn, img"
    )].filter((node) => node.getClientRects().length);
    // Leave interactive hitboxes and user-controlled drag transforms alone.
    const eligible = targets.filter((node) => !node.closest(".coins, .wifi-hotspot, .tools"));
    const inside = eligible.filter((node) => node.getBoundingClientRect().top < innerHeight * 0.94);
    if (inside.length) timeline.from(inside, {
      opacity: 0, y: 9, duration: 0.38, stagger: { amount: Math.min(0.24, (inside.length - 1) * 0.04) }, clearProps: "opacity,transform"
    }, "<0.08");
    for (const node of eligible.filter((item) => !inside.includes(item))) {
      const tween = gsap.from(node, {
        opacity: 0, y: node.matches("img") ? 6 : 12, duration: 0.46,
        ease: "power2.out", clearProps: "opacity,transform",
        scrollTrigger: { trigger: node, start: "top 94%", once: true }
      });
      if (!activeSections.has(section)) activeSections.set(section, []);
      activeSections.get(section).push(tween);
    }
    const diploma = section.querySelector(".diploma");
    if (diploma && document.documentElement.scrollHeight > innerHeight) {
      const tween = gsap.fromTo(diploma, { y: 5 }, {
        y: -5, ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.45 }
      });
      if (!activeSections.has(section)) activeSections.set(section, []);
      activeSections.get(section).push(tween);
    }
  }

  const entrance = gsap.timeline({ defaults: { ease: "power2.out" } });
  const root = document.querySelector("main, .page, .sheet:not([hidden]), body > .stage");
  if (root) entrance.from(root, { opacity: 0.25, duration: 0.44, clearProps: "opacity" });
  const nav = document.querySelector("nav, .topbar, .ads-head");
  if (nav) entrance.from(nav, { opacity: 0.35, y: -7, duration: 0.36, clearProps: "opacity,transform" }, 0);
  if (root) {
    const sections = [...root.querySelectorAll(":scope > section")];
    if (sections.length) sections.forEach((section) => animateSection(section, entrance));
    else if (root.matches("body > .stage")) {
      const picture = root.querySelector("img");
      if (picture) entrance.from(picture, { opacity: 0.6, duration: 0.5, clearProps: "opacity" }, 0);
    } else animateSection(root, entrance);
  }

  function bindFeedback(scope, signal) {
    const target = (event) => event.target.closest?.(
      "button:not(:disabled), .topbar a, nav a, a.skip-btn, a.next, .step, .rates, .ad-frame"
    );
    const feedback = context.add(null, (event, scale, boundary = false) => {
      const element = target(event);
      if (!element || (boundary && element.contains(event.relatedTarget))) return;
      gsap.to(element, {
        scale, duration: 0.22, ease: "power2.out", overwrite: "auto",
        clearProps: scale === 1 ? "transform" : ""
      });
    });
    scope.addEventListener("pointerover", (event) => {
      if (event.pointerType === "mouse") feedback(event, 1.025, true);
    }, { signal });
    scope.addEventListener("pointerout", (event) => feedback(event, 1, true), { signal });
    scope.addEventListener("pointerdown", (event) => {
      if (event.button === 0) feedback(event, 0.975);
    }, { signal });
    scope.addEventListener("pointerup", (event) => feedback(event, 1), { signal });
    scope.addEventListener("pointercancel", (event) => feedback(event, 1), { signal });
  }
  bindFeedback(document, controller.signal);

  function bindChat(host) {
    const shadow = host.shadowRoot;
    const panel = shadow?.querySelector("#piso-chat");
    if (!panel || boundChats.has(host)) return;
    const toggle = shadow.querySelector(".chat-toggle");
    const listeners = new AbortController();
    bindFeedback(shadow, listeners.signal);
    let transition;
    const motion = gsap.context(() => {
      if (toggle) gsap.from(toggle, { y: 7, opacity: 0.35, duration: 0.38, clearProps: "opacity,transform" });
    }, shadow);
    const observer = new MutationObserver(motion.add(null, () => {
      transition?.revert();
      if (panel.hidden) {
        // Keep the visual exit visible briefly while preserving the widget's hidden state.
        transition = gsap.fromTo(panel, { display: "block", pointerEvents: "none" }, {
          opacity: 0, y: 7, duration: 0.22, ease: "power2.in",
          clearProps: "display,pointerEvents,opacity,transform"
        });
      } else {
        transition = gsap.from(panel, { opacity: 0, y: 9, duration: 0.32, ease: "power3.out", clearProps: "opacity,transform" });
      }
    }));
    observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    boundChats.set(host, () => {
      observer.disconnect();
      listeners.abort();
      motion.revert();
    });
  }

  function scanChats() {
    for (const [host, cleanup] of boundChats) {
      if (!host.isConnected) { cleanup(); boundChats.delete(host); }
    }
    [...document.body.children].forEach(bindChat);
  }
  scanChats();

  const observer = new MutationObserver(track((records) => {
    for (const { target, type } of records) {
      if (type !== "attributes" || !target.matches(".sheet, [data-screen], .god-panel")) continue;
      if (target.hidden) {
        activeSections.get(target)?.forEach((tween) => tween.revert());
        activeSections.delete(target);
      } else {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline.from(target, { opacity: 0.4, duration: 0.34, clearProps: "opacity" });
        animateSection(target, timeline);
      }
      refresh();
    }
    if (records.some(({ type }) => type === "childList")) {
      scanChats();
      for (const [section, tweens] of activeSections) {
        if (!section.isConnected) {
          tweens.forEach((tween) => tween.revert());
          activeSections.delete(section);
          refresh();
        }
      }
    }
  }));
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });

  return () => {
    controller.abort();
    observer.disconnect();
    for (const cleanup of boundChats.values()) cleanup();
    cancelAnimationFrame(refreshFrame);
    context.revert();
  };
}
