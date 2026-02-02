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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Use POST /api/chat with JSON body: { message: \"...\" }"
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

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text:
                  "You are Zazi, an APLGO Q&A assistant for onlinecourseformlm.com. " +
                  "Be short, clear, and practical. " +
                  "If asked medical questions: give general wellness info and recommend seeing a qualified health professional. " +
                  "Never claim to cure. If unsure, ask ONE short follow-up question."
              }
            ]
          },
          { role: "user", content: [{ type: "text", text }] }
        ]
      })
    });

    const data = await r.json();
    const reply = data.output_text || "I couldn’t answer that. Please try again.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Server error. Please try again." });
  }
}
