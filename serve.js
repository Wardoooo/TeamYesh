import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const instruction = [
  "You are Piso Support, an intentionally useless comedy chatbot.",
  "Reply with short, confident and obviously fictional nonsense in one or two sentences.",
  "Invent ridiculous facts, overexplain simple ideas, occasionally mishear the question, and connect unrelated things.",
  "Use prior turns to vary jokes and avoid repeating them. Never offer genuine advice.",
  "Never frame made-up claims as real science or as medical, legal, or financial advice.",
  "For serious questions, briefly say you only provide fictional jokes and avoid actionable advice."
].join(" ");
const mime = {
  html: "text/html", js: "text/javascript", css: "text/css", jpg: "image/jpeg",
  png: "image/png", svg: "image/svg+xml", avif: "image/avif", webp: "image/webp",
  mp3: "audio/mpeg", mp4: "video/mp4"
};

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

export async function chat(request, response, { apiKey = process.env.GEMINI_API_KEY, fetchReply = fetch } = {}) {
  if (request.method !== "POST") return json(response, 405, { error: "Use POST." });
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] || "")) {
    return json(response, 415, { error: "Send JSON." });
  }
  const origin = request.headers.origin;
  if (origin && origin !== `http://${request.headers.host}` && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
    return json(response, 403, { error: "Origin not allowed." });
  }
  let messages;
  try {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 12000) return json(response, 413, { error: "Chat history is too large." });
    }
    ({ messages } = JSON.parse(body));
  } catch {
    return json(response, 400, { error: "Invalid chat request." });
  }
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 9
      || !messages.every((item, index) => item?.role === (index % 2 ? "model" : "user")
        && typeof item.text === "string" && item.text.trim() && item.text.length <= 1000)
      || messages.at(-1).role !== "user") {
    return json(response, 400, { error: "Invalid conversation." });
  }
  if (!apiKey) return json(response, 503, { error: "Gemini is unavailable." });
  const model = encodeURIComponent(process.env.GEMINI_MODEL || "gemini-3.5-flash-lite");
  try {
    const result = await fetchReply(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(11000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: messages.map(({ role, text }) => ({ role, parts: [{ text }] })),
        generationConfig: { temperature: 1.2, maxOutputTokens: 256 }
      })
    });
    if (!result.ok) return json(response, 502, { error: "Gemini is unavailable." });
    const data = await result.json();
    const reply = data.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text).join("").trim().slice(0, 1000);
    if (reply) return json(response, 200, { reply });
  } catch {
    // Keep upstream error details and credentials out of the response.
  }
  return json(response, 502, { error: "Gemini is unavailable." });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  createServer(async (request, response) => {
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(request.headers.host || "")) {
      return json(response, 403, { error: "Host not allowed." });
    }
    const { pathname } = new URL(request.url, "http://localhost");
    if (pathname === "/api/chat") return chat(request, response);
    const path = pathname === "/" ? "/index.html" : pathname;
    const type = mime[path.split(".").at(-1)];
    if (request.method !== "GET" || !type || !/^\/(?:index\.(?:html|js)|(?:assets|css|pages|shared|overlay)\/(?:[\w-]+\/)*[\w-]+\.[a-z]+)$/.test(path)) {
      return response.writeHead(404).end();
    }
    const file = new URL(`.${path}`, import.meta.url);
    if (!(await stat(file).catch(() => null))?.isFile()) return response.writeHead(404).end();
    response.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
    createReadStream(file).on("error", () => response.destroy()).pipe(response);
  }).listen(4173, "127.0.0.1", () => console.log("Piso Support is ready at http://127.0.0.1:4173/"));
}
