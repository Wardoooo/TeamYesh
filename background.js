// Owner: M1
// Timer, phases, and messages. Other files send messages here.
// They do not import each other to change the session.

import { CONFIG } from "./shared/config.js";
import { freshState, reduce } from "./shared/phase.js";

const LIVE = ["ads", "captcha", "browsing", "finale"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ state: freshState() });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.alarms.onAlarm.addListener(() => {
  enqueue({ type: "tickCheck" }, {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  enqueue(message, sender).then(sendResponse);
  return true;
});

let chain = Promise.resolve();

function enqueue(message, sender) {
  const run = chain.then(() => handle(message, sender));
  chain = run.then(() => {}, () => {});
  return run;
}

async function read() {
  const stored = await chrome.storage.local.get("state");
  return stored.state || freshState();
}

async function handle(message, sender) {
  if (message?.type === "getState") {
    return { ok: true, state: await read() };
  }

  const current = await read();
  const result = reduce(current, message, Date.now());
  const changed = !result.error && JSON.stringify(current) !== JSON.stringify(result.state);
  if (changed) {
    await chrome.storage.local.set({ state: result.state });
    await schedule(result.state);
  }

  if (result.effect === "open-landing") {
    try {
      const tabId = await senderTabId(sender);
      if (tabId) await chrome.tabs.update(tabId, { url: CONFIG.landingUrl });
    } catch (err) {
      console.error(err);
    }
  }
  if (result.effect === "show-ending") {
    await showEnding(await senderTabId(sender));
  }

  return { ok: !result.error, error: result.error || "", state: result.error ? current : result.state };
}

async function schedule(state) {
  await chrome.alarms.clear("ads-end");
  await chrome.alarms.clear("session-end");
  if (state.phase === "ads" && state.adsUntil > Date.now()) {
    chrome.alarms.create("ads-end", { when: state.adsUntil });
  }
  if (LIVE.includes(state.phase) && state.endsAt > Date.now()) {
    chrome.alarms.create("session-end", { when: state.endsAt });
  }
}

// A message from an extension page does not include sender.tab.
async function senderTabId(sender) {
  if (sender.tab?.id) return sender.tab.id;
  const here = sender.url || "";
  const tabs = await chrome.tabs.query({});
  const exact = tabs.find((tab) => tab.url === here);
  if (exact) return exact.id;
  const active = tabs.find((tab) => tab.active && tab.url && tab.url.startsWith(chrome.runtime.getURL("")));
  return active?.id || 0;
}

async function showEnding(tabId) {
  const url = chrome.runtime.getURL("pages/finale.html");
  if (tabId) {
    await openFinale(tabId, url);
    return;
  }
  const tabs = await chrome.tabs.query({});
  const web = tabs.find((tab) => /^https?:/i.test(tab.url || ""));
  if (web) await openFinale(web.id, url);
}

async function openFinale(tabId, url) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url && tab.url.startsWith(url)) return;
  await chrome.tabs.update(tabId, { url });
}
