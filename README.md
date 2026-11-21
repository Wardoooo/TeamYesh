"# TeamYesh" 

## Piso Support chatbot

Load or reload the unpacked extension at `chrome://extensions` and click **Pisonet From Hell** in the extension menu. Click **Piso Support** to chat in place. After entering the LED code, click **sugot ko, yes** to open Google with the session countdown and ads.

The extension works on its own with canned jokes. For optional live replies, set `GEMINI_API_KEY` in the environment and run `node serve.js`. Keep the key out of the project files.

After editing an overlay module, run `node build-overlay.js` before reloading the extension. The packaged content script is checked in, so players can load it directly.

## Page animations

GSAP and ScrollTrigger are bundled in `assets/vendor/`. Load or reload the unpacked extension at `chrome://extensions`. The extension loads the animations directly from that folder, with no installation command or network connection.

The animation layer respects the system's reduced-motion setting. If the GSAP files are absent, the game and chat remain usable.
