module.exports = async (req, res) => {
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN || "https://onlinecourseformlm.com";

  // CORS so your website can call this endpoint
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    // Vercel sometimes gives req.body as string; handle both
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const text = (body.message || "").toString().trim();

    if (!text) return res.status(400).json({ reply: "Please type a message." });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ reply: "Server missing API key." });
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
                  "Never claim to cure. If unsure, ask ONE short follow-up question.",
              },
            ],
          },
          { role: "user", content: [{ type: "text", text }] },
        ],
      }),
    });

    const data = await r.json();
    const reply = data.output_text || "I couldn’t answer that. Please try again.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Server error. Please try again." });
  }
};
