# 🪙 PISONET FROM HELL: Premium Suffering Edition

> **"Pay more. Browse less. Suffer always."**
> Malfunction 2026 · iDE.A Club · Team of 5

---

## Summary

A satirical Piso WiFi simulator built as a **Chrome extension**. The user "inserts coins" at a tarpaulin-style kiosk, reads T&C and types a faulty LED code, then lands in **real Chrome** with a constant overlay: a live countdown, ads popping up over parts of the screen, CAPTCHAs, a brightness blackout, and a useless support chatbot.

**Goal:** load a real webpage before the WiFi time runs out.
**Twist:** it loads, the user gets "Congratulations! You are now officially qualified to use the internet", the certificate takes too long, the session expires, and a forced 5-star review leads to a graduation-certificate Suffering Report.

**Why it fits Malfunction:** it technically gives you internet, but every feature makes it harder. It's a digital detox so annoying you give up.

| Award | How we hit it |
|---|---|
| A. Most Frustrating | One webpage becomes a full-time job |
| B. Creative Use of AI | AI ad network, never-right support chat, suffering concierge |
| C. Funniest | Pisonet culture, tarpaulin humor, forced 5 stars |
| D. Pointless, Yet Brilliant | A "digital detox" that works by being unusable |

---

## Flow

```
PURSE → PORTAL → ADS → CAPTCHA → BROWSING → FINALE → EXPIRED → SURVEY → REPORT
```

1. **Purse:** drag flat 2D coins from a coin purse into the slot; the faulty LED shows a blinking code
2. **Portal:** Piso WiFi-style page with T&C maze and code entry, then redirect to real Chrome
3. **Ads:** overlay blocks the browser; half the time is ads
4. **CAPTCHA:** chain of absurd CAPTCHAs
5. **Browsing:** overlay turns see-through; brightness blackout, fake 99% loading, random ads and disconnects, support chat
6. **Finale → Expired → Survey → Report:** the punchline
7. No back button anywhere; the report is the end screen

No hints about the next step. Instructions are misleading on purpose.

---

## Features

### Kiosk (before Chrome)
- **Coin purse:** simple flat 2D piso coins, drag into the slot; balance visible
- **Tarpaulin UI:** bold red/yellow/blue with thick borders, used for instructions and the portal
- **Misleading instructions:** "1. Connect and clap 3x, 2. Insert coin and say the magic word, 3. Enjoy suffering..."
- **Faulty LED code display:** code shown on a blinking LED instead of a receipt, hard to type
- **Portal + T&C maze:** wall of nonsense text (random words or AI-written, no real lyrics); the Agree button is hidden somewhere unexpected, with decoy Agree buttons that open ads. It stops moving after ~3 tries.

### Overlay (inside real Chrome)
- **Constant HUD:** live countdown on every tab
- **Click-through layer:** the page underneath stays usable except on ads and obstacles
- **Ads:** fake ads as small popup cards at random spots; skip leads to another ad, closing forfeits time to 0
- **Magnet X (Golden Snitch):** the close button flees the cursor; decoy X's open more ads. Optional: fictional politician tarpaulin faces on the X (avoid real people)
- **Pay to close ads:** costs PHP1 of earned credit
- **Earn coins through surveys:** pointless surveys give PHP1 per 5 answered
- **CAPTCHA chain:** may spawn more CAPTCHAs, always ends
- **Brightness from Hell:** starts at 1%; each +1% triggers an instant blackout (no loading)
- **Unreliable internet:** fake loading bar over the real page, stuck at 99%, fake disconnects (capped)
- **Fake Premium:** shows the user's coin balance, replaces ads with surveys, barely improves anything
- **Support AI chat:** answers confidently but never correctly, with typing delay and canned fallback

### Ending
- **Finale:** certificate generation outlasts the session, so it expires
- **Expired:** "SESSION EXPIRED. PLEASE INSERT ANOTHER COIN."
- **Survey:** any rating becomes 5 stars
- **Report:** graduation certificate ("Certified Suffering Graduate") with the stats
- **AI Suffering Concierge:** short roast popup based on the user's stats

### Extras
- **SFX:** coin, ad jingle, error buzz, boot chime, success ding
- **GOD skip:** omnipotent debug object (skip phases, add time, clear ads, pass CAPTCHA, set brightness). It sits behind a team-only password/puzzle and is for judges if the run goes too long.
- **About / credits page:** purpose and intent
- **How to Use guide:** the real, honest instructions

---

## Code Stack

| Layer | Tech |
|---|---|
| Platform | **Chrome Extension, Manifest V3** (Edge/Brave also work) |
| Pages (kiosk, portal, about, guide) | HTML + CSS + vanilla JavaScript |
| Overlay | **Content script + Shadow DOM** injected into every page |
| Shared timer/state | **Background service worker** + `chrome.storage` (one "ends at" timestamp) |
| Messaging | `chrome.runtime` messages between background, overlay, and pages |
| Ads/obstacles | Plain DOM elements inside the overlay |
| Audio | HTML Audio / Web Audio, local files |
| AI | Pre-generated content (ads, replies, roasts) + optional live call through a serverless proxy, 3s timeout, canned fallback. No API key in the frontend |
| Version control | Git + GitHub, one branch per member |
| Dev tools | AI coding assistant for each member, Chrome DevTools, separate Chrome profile for the demo |

No frameworks, no build step, no npm.

### Folder structure
```
pisonet-from-hell/
├── manifest.json            M1
├── background.js            M1  (timer, phases, messaging, GOD)
├── overlay/
│   ├── overlay.js           M1  (shadow DOM, HUD, click-through)
│   ├── overlay.css          M1
│   ├── ads.js / ads.css     M2
│   ├── ads-data.js          M2
│   ├── captcha.js           M3
│   ├── brightness.js        M3
│   ├── loading.js           M4  (99% bar, disconnects)
│   ├── chatbot.js           M4
│   └── popups.js / .css     M5  (concierge popup)
├── pages/
│   ├── purse.html / .js     M1  (coin purse + LED code)
│   ├── portal.html / .js    M3  (T&C maze + code entry)
│   ├── survey-earn.html     M4  (earn coins, Premium surveys)
│   ├── finale.html / .js    M5  (finale, expired, rating, certificate report)
│   ├── about.html           M5
│   └── guide.html           M5
├── assets/
│   ├── sounds/              M5
│   ├── img/                 shared (prefix ads_, cap_, ui_)
│   └── fonts/               M1
└── docs/pitch/              M5
```

### Shared rules
- One owner per file; never edit someone else's file
- Prefix every CSS class with your module name (`ads-`, `cap-`, `ld-`)
- Each overlay module exports `mount()` and `unmount()` and cleans up all timers and DOM
- Modules only talk through messages sent via `background.js`, never by calling each other
- Shared values in `chrome.storage`: `phase`, `endsAt`, `credit`, `brightness`, `stats`
- Every obstacle has a cap or auto-pass so the run is always finishable

---

## Task Delegation

### M1 · Lead / Core
- [ ] **First:** push the skeleton (manifest, background, overlay shell, stub files for everyone)
- [ ] Background: timer, phase machine, messaging, storage
- [ ] Overlay shell: Shadow DOM, HUD timer, click-through layer, opacity control
- [ ] Purse page: 2D coin purse, coin slot, faulty LED code
- [ ] GOD skip + password
- [ ] Integration, merging, final deploy

### M2 · Ads
- [ ] 30+ fake ads (invented brands) as popup cards
- [ ] Skip chain, close = forfeit, ads end at 50% of time
- [ ] Magnet X + decoy X's
- [ ] Pay-to-close button
- [ ] Random popup scheduling during Browsing

### M3 · Obstacles
- [ ] CAPTCHA chain (4+ types, guaranteed end)
- [ ] Brightness blackout, +1% per change
- [ ] Portal page: T&C maze, tarpaulin layout, code entry

### M4 · Internet & Support
- [ ] Fake loading cover: slow, stuck at 99%, capped disconnects
- [ ] Detect real page load to start the finale
- [ ] Support AI chat + canned fallback
- [ ] Fake Premium with coin balance
- [ ] Earn-coin surveys

### M5 · Finale, Polish & Pitch
- [ ] Finale certificate timing, expired screen, forced 5-star survey
- [ ] Graduation-certificate report + AI Suffering Concierge popup
- [ ] SFX files and hooks
- [ ] About/credits and How to Use pages
- [ ] Pitch deck + demo script + rehearsal

---

## Build Order

1. **Layer 1: pages and modules as plain HTML.** Each module can be tested alone by opening its page.
2. **Layer 2: wrap in the extension.** M1 adds the overlay shell, shared timer, and real-page detection.
3. **Merge order:** M5 → M4 → M3 → M2, testing after each.
4. **Fallback:** keep a plain web version and a screen-recorded demo video.

### Priority
- **Must:** coin purse, portal, ads + Magnet X, CAPTCHA chain, 99% loading, finale twist, report
- **Should:** brightness blackout, chatbot, SFX, T&C maze, GOD skip
- **Could:** Premium, surveys for coins, pay-to-close, politician X, live AI