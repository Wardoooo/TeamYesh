import { onSoundPreference } from "./sfx.js";

export function startStoreMusic(audio) {
  const volume = 0.22;
  let active = true;
  let muted = true;
  let starting = false;
  let frame;
  audio.volume = 0;

  function silence() {
    cancelAnimationFrame(frame);
    audio.pause();
    audio.volume = 0;
  }

  function fade(target, done = () => {}) {
    cancelAnimationFrame(frame);
    const initial = audio.volume;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / 220);
      audio.volume = initial + (target - initial) * progress;
      if (progress < 1) frame = requestAnimationFrame(tick);
      else done();
    }
    frame = requestAnimationFrame(tick);
  }

  async function play() {
    if (!active || document.hidden || muted || starting) return;
    if (!audio.paused) return;
    starting = true;
    try {
      await audio.play();
      if (active && !document.hidden && !muted) fade(volume);
      else silence();
    } catch {
      // A blocked autoplay will be retried on the next user gesture.
    } finally {
      starting = false;
    }
  }

  onSoundPreference((nextMuted) => {
    if (nextMuted === muted) return;
    muted = nextMuted;
    if (muted) {
      if (active && !document.hidden && !audio.paused) fade(0, silence);
      else silence();
    } else if (!starting && active && !document.hidden && !audio.paused) {
      fade(volume);
    } else {
      play();
    }
  });
  document.addEventListener("pointerdown", play, { capture: true });
  document.addEventListener("keydown", play, { capture: true });
  document.addEventListener("visibilitychange", () => document.hidden ? silence() : play());
  window.addEventListener("pagehide", () => {
    active = false;
    silence();
  });
  window.addEventListener("pageshow", () => {
    active = true;
    play();
  });
}
