export default async function handler(req, res) {
  // --- CORS (allow both www + non-www) ---
  const origin = String(req.headers.origin || "").trim().replace(/\/$/, "");
  const allowed = new Set([
    "https://onlinecourseformlm.com",
    "https://www.onlinecourseformlm.com",
  ]);

  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // --- end CORS ---

  if (req.method === "OPTIONS") return res.status(200).end();

  // Friendly check in browser
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "POST /api/chat with JSON: { message: \"...\" }"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    const body = req.body || {};
    const text = (body.message || "").toString().trim();
    if (!text) return res.status(400).json({ reply: "Please type a message." });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ reply: "Server missing API key." });

    const instructions =
      "You are Zazi, an APLGO Q&A assistant for onlinecourseformlm.com. " +
      "Be short, clear, and practical. " +
      "If asked medical questions: give general wellness info and recommend seeing a qualified health professional. " +
      "Never claim to cure. If unsure, ask ONE short follow-up question.";

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions,
        input: text
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        "OpenAI returned an error (unknown).";
      console.log("OpenAI error:", r.status, msg);
      return res.status(502).json({ reply: "Backend error: " + msg });
    }

    const reply =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output.flatMap(o => o.content || [])
            .filter(c => c.type === "output_text" && c.text)
            .map(c => c.text)
            .join("\n")
            .trim()
        : "") ||
      "I couldn’t answer that. Please try again.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.log("Server exception:", err?.message || err);
    return res.status(500).json({ reply: "Server error. Please try again." });
  }
}
