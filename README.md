# Pisonet From Hell

> Pay more. Browse less. Suffer always.

**Pisonet From Hell: Premium Suffering Edition** is TeamYesh's satirical Piso WiFi simulator for Malfunction 2026. It turns a familiar sari-sari store kiosk into a timed Chrome game. Insert virtual pesos, decipher a blinking access code, and try to browse while ads, CAPTCHAs, and a dimming screen eat into your session. The joke is simple. You pay for internet time and spend most of it trying to use the internet.

## Play the Chrome extension

1. Open `chrome://extensions` in desktop Chrome and turn on **Developer mode**.
2. Click **Load unpacked** and select the project folder containing `manifest.json`.
3. Open **Pisonet From Hell** from Chrome's Extensions menu. Click the Piso WiFi machine in the store.
4. Drag a virtual coin into the slot or use a coin button. Read the six-character code on the blinking LED, then continue to the portal.
5. Enter the code, find the agreement in the terms, and click **sugot ko, yes**. The session opens Google in the same tab with the timer and ad overlay.

The checked-in extension is ready to load without installing npm packages or running a build. Click the extension icon again to start a fresh run. This resets the current session and closes its demo tab.

| Virtual payment | Session time |
| --- | --- |
| 1 peso | 60 seconds |
| 5 pesos | 3 minutes |
| 10 pesos | 5 minutes |

The kiosk calculates time from the total inserted, so five 1-peso coins also buy 3 minutes.

## What happens during a session

- **Ads.** The first half of the session is reserved for fake ads. Skipping brings up another ad, and catching the fleeing close button during this phase forfeits the remaining time.
- **CAPTCHAs and browsing.** A short CAPTCHA chain stands between the ad phase and browsing. The clock keeps running as pop-up ads interrupt the active session tab. The dim screen starts at 1% brightness, and any brightness you regain fades over time.
- **Piso Support.** The deliberately unhelpful chatbot serves canned jokes by default. The kiosk and browsing overlay also include sound controls.
- **Ending.** When time runs out, the extension replaces the session tab with the diploma screen. The review turns your chosen rating into five stars, then shows a receipt-style session report.

## Web preview and project status

The full game uses Chrome extension APIs for tab navigation, storage, timers, and overlays on real webpages. Static hosting such as Vercel can display the site's artwork and prototype pages. The old click-through prototype begins at [page2.html](page2.html), with a mock code form and ad screen in [page3.html](page3.html) and [page4.html](page4.html). The current store entry point links to the extension-backed kiosk.

[plan.md](plan.md) contains the original design, feature priorities, and team assignments. The planned 99% loading and fake disconnect sequence, survey-based rewards, and AI Suffering Concierge are unfinished. In the current flow, the session runs until expiry even after a webpage loads.

## Development

| Path | Purpose |
| --- | --- |
| [manifest.json](manifest.json) and [background.js](background.js) | Manifest V3 configuration and service worker for session state, alarms, and navigation |
| [pages/](pages/) | Coin kiosk, portal, support pages, and the ending |
| [overlay/](overlay/) | Shadow DOM overlay, live timer, ads, CAPTCHAs, brightness controls, and chat |
| [shared/](shared/) | Session rules, rates, messaging helpers, sound, and motion |
| [assets/](assets/) and [css/](css/) | Local artwork, audio, video, styles, and bundled GSAP and ScrollTrigger |
| [serve.js](serve.js) | Optional local web and Gemini chat server |

The UI uses HTML, CSS, and vanilla JavaScript. Page animations respect the system's reduced-motion setting.

Run the session-rule tests from the project root.

```sh
npm test
```

After editing an overlay module or one of its bundled dependencies, regenerate the content script before reloading the extension.

```sh
node build-overlay.js
```

### Optional live chat

The local chat server is currently blocked by unresolved merge markers in `serve.js`. Once these are resolved, set `GEMINI_API_KEY` in the environment and run `npm start`. The extension looks for the chat endpoint at `http://127.0.0.1:4173/api/chat` and falls back to canned replies when the endpoint is unavailable. Keep the API key in the server environment.
