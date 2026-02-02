// Vercel Serverless Function: /api/chat
// Test with POST JSON: { "message": "Hi" }

module.exports = async (req, res) => {
  // 1) CORS (fix invalid header chars by trimming)
  const allowedOrigin = String(
    process.env.ALLOWED_ORIGIN || "https://onlinecourseformlm.com"
  )
    .trim()
    .replace(/\/$/, "");

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  // Helpful GET (so browser visit doesn't confuse you)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Use POST /api/chat with JSON body: { message: \"...\" }",
    });
  }

  // Only POST does chat
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    // 2) Read body safely
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }

    const text = String(body?.message || "").trim();
    if (!text) return res.status(400).json({ reply: "Please type a message." });

    // 3) Key check
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ reply: "Server missing API key." });

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // 4) Call OpenAI Responses API
    const payload = {
      model,
      instructions:
        "You are Zazi, an APLGO Q&A assistant for onlinecourseformlm.com. " +
        "Be short, clear, and practical. " +
        "If asked medical questions: give general wellness info and recommend seeing a qualified health professional. " +
        "Never claim to cure. If unsure, ask ONE short follow-up question.",
      input: text,
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    // 5) If OpenAI returns an error, show it (helps debugging)
    if (!r.ok) {
      const msg = data?.error?.message || `OpenAI error (status ${r.status})`;
      return res.status(500).json({ reply: msg });
    }

    // 6) Extract text from response.output[].content[] (type: output_text)
    let reply = "";
    const output = Array.isArray(data?.output) ? data.output : [];

    for (const item of output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c?.type === "output_text" && typeof c.text === "string") {
            reply += c.text;
          }
        }
      }
    }

    reply = reply.trim() || "I couldn’t answer that. Please try again.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Server error. Please try again." });
  }
};
