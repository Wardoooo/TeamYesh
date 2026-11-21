import assert from "node:assert/strict";
import { secondsForPesos } from "./config.js";
import { freshState, makeCode, reduce } from "./phase.js";

assert.equal(secondsForPesos(1), 60);
assert.equal(secondsForPesos(4), 240);
assert.equal(secondsForPesos(5), 180);
assert.equal(secondsForPesos(9), 180);
assert.equal(secondsForPesos(10), 300);
assert.equal(secondsForPesos(11), 360);
assert.equal(secondsForPesos(15), 480);
assert.equal(secondsForPesos(20), 600);

const now = 1_000_000;
let state = freshState();

assert.equal(makeCode().length, 6);

state = reduce(state, { type: "entered", page: "purse" }, now).state;
assert.equal(state.phase, "purse");
assert.equal(state.accessCode.length, 6);

state = reduce(state, { type: "insertCoin" }, now).state;
state = reduce(state, { type: "insertCoin", amount: 1 }, now).state;
assert.equal(state.inserted, 2);
const stacked = reduce(state, { type: "insertCoin", amount: 5 }, now);
assert.equal(stacked.state.inserted, 7);
assert.equal(reduce(state, { type: "insertCoin", amount: 3 }, now).error, "That coin does not fit.");

const early = reduce(state, { type: "startSession", code: state.accessCode }, now);
assert.equal(early.error, "Enter the code on the portal page.");

state = reduce(state, { type: "entered", page: "portal" }, now).state;
assert.equal(state.phase, "portal");

const wrong = reduce(state, { type: "startSession", code: "NOPE00" }, now);
assert.equal(wrong.state.phase, "portal");

const started = reduce(state, { type: "startSession", code: state.accessCode.toLowerCase() }, now);
assert.equal(started.effect, "open-landing");
state = started.state;
assert.equal(state.phase, "ads");
assert.equal(state.endsAt, now + 120_000);
assert.equal(state.adsUntil, now + 60_000);

state = reduce(state, { type: "tickCheck" }, now + 60_000).state;
assert.equal(state.phase, "captcha");

state = reduce(state, { type: "captchaDone" }, now + 61_000).state;
assert.equal(state.phase, "browsing");

const loaded = reduce(state, { type: "pageLoaded", url: "https://www.google.com" }, now + 70_000);
assert.equal(loaded.state.phase, "browsing");
assert.equal(loaded.effect, null);
state = loaded.state;

const expired = reduce(state, { type: "tickCheck" }, now + 120_000);
assert.equal(expired.state.phase, "expired");
assert.equal(expired.effect, "show-ending");
state = expired.state;

state = reduce(state, { type: "tickCheck" }, now + 999_000).state;
assert.equal(state.phase, "expired");

state = reduce(state, { type: "continueEnding" }, now + 130_000).state;
assert.equal(state.phase, "survey");
state = reduce(state, { type: "rate", stars: 1 }, now + 130_000).state;
assert.equal(state.phase, "report");
assert.equal(state.rating, 5);
assert.equal(state.stats.attemptedStars, 1);
assert.equal(state.stats.forcedStars, 5);

let ads = freshState();
ads = reduce(ads, { type: "entered", page: "purse" }, now).state;
ads = reduce(ads, { type: "insertCoin", amount: 1 }, now).state;
ads = reduce(ads, { type: "entered", page: "portal" }, now).state;
const armed = reduce(ads, { type: "startSession", code: ads.accessCode }, now);
assert.equal(armed.state.phase, "ads");
const hit = reduce(armed.state, { type: "expireNow" }, now + 1000);
assert.equal(hit.state.phase, "expired");
assert.equal(hit.effect, "show-ending");
const denied = reduce(freshState(), { type: "expireNow" }, now);
assert.equal(denied.error, "The exit only works during an ad.");
assert.equal(denied.state.phase, "store");

let fromStore = freshState();
fromStore = reduce(fromStore, { type: "entered", page: "purse" }, now).state;
fromStore = reduce(fromStore, { type: "insertCoin", amount: 1 }, now).state;
fromStore.phase = "store";
fromStore = reduce(fromStore, { type: "entered", page: "portal" }, now).state;
assert.equal(fromStore.phase, "portal");

const blocked = reduce(freshState(), { type: "insertCoin" }, now);
assert.equal(blocked.error, "Coins only go in on the purse page.");

let rich = freshState();
rich = reduce(rich, { type: "addCredit", amount: 2 }, now).state;
assert.equal(rich.credit, 2);
const broke = reduce(rich, { type: "addCredit", amount: -3 }, now);
assert.equal(broke.error, "Not enough credit.");
assert.equal(broke.state.credit, 2);
rich = reduce(rich, { type: "addCredit", amount: -1 }, now).state;
assert.equal(rich.credit, 1);

// Every review choice is recorded as five stars, including free-text feedback.
for (let stars = 1; stars <= 5; stars += 1) {
  const reviewed = reduce({ ...freshState(), phase: "survey" },
    { type: "rate", stars, review: "The ads were outrageous." }, now).state;
  assert.equal(reviewed.phase, "report");
  assert.equal(reviewed.rating, 5);
  assert.equal(reviewed.stats.attemptedStars, stars);
  assert.equal(reviewed.stats.forcedStars, 5);
  assert.equal(reviewed.review, "The ads were outrageous.");
  const restarted = reduce(reviewed, { type: "restartSession" }, now);
  assert.equal(restarted.error, "");
  assert.equal(restarted.state.phase, "purse");
  assert.equal(restarted.state.inserted, 0);
  assert.equal(restarted.state.endsAt, 0);
  assert.equal(restarted.state.adsUntil, 0);
  assert.equal(restarted.state.rating, 0);
  assert.equal(restarted.state.review, "");
  assert.equal(restarted.state.accessCode.length, 6);
  const coin = reduce(restarted.state, { type: "insertCoin", amount: 1 }, now).state;
  const portal = reduce(coin, { type: "entered", page: "portal" }, now).state;
  const second = reduce(portal, { type: "startSession", code: portal.accessCode }, now);
  assert.equal(second.state.phase, "ads");
  assert.equal(second.state.endsAt, now + 60000);
}
assert.ok(reduce(freshState(), { type: "restartSession" }, now).error);
assert.ok(reduce(freshState(), { type: "rate", stars: 1 }, now).error);
const long = reduce({ ...freshState(), phase: "survey" },
  { type: "rate", stars: 1, review: "x".repeat(1100) }, now).state;
assert.equal(long.review.length, 1000);
console.log("phase rules and ending/restart flow ok");
