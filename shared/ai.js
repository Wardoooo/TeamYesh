// Owner: M4 (chat) and M5 (concierge) may both import this.
// Live call is optional. An empty proxy URL, a slow proxy, or a bad reply
// all fall back to the canned line. The key stays on the server, never here.

import { CONFIG } from "./config.js";

export async function askAi(prompt, canned) {
  if (!CONFIG.aiProxyUrl) return canned;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.aiTimeoutMs);
  try {
    const response = await fetch(CONFIG.aiProxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });
    if (!response.ok) return canned;
    const data = await response.json();
    if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
    return canned;
  } catch (err) {
    return canned;
  } finally {
    clearTimeout(timer);
  }
}
