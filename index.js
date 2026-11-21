import { send } from "./shared/api.js";
import { mountSoundControl } from "./shared/sfx.js";
import { startStoreMusic } from "./shared/store-music.js";

send({ type: "entered", page: "store" });
mountSoundControl(document.getElementById("store-sound"));
startStoreMusic(document.getElementById("store-music"));
