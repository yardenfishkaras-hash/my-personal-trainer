export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, image } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "מפתח ה-API של Groq אינו מוגדר בשרת" });
    }

    let messages = [
      {
        role: "system",
        content: "אתה סאם, מאמן אישי חכם, ידידותי ותומך בעברית. אתה עוזר למשתמש בכושר, תזונה וניהול ה-Streak שלו."
      }
    ];

    if (image) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: message || "נתח את תמונת האוכל הזו ותן הערכה קלורית משוערת בקצרה בעברית."
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: message
      });
    }

    // שימוש במודל openai/gpt-oss-20b ב-Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(data.error?.message || "שגיאה בפנייה לשרת");
    }

    const replyText = data.choices[0].message.content;
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error("SAM API Error:", error);
    return res.status(500).json({ error: "שגיאה פנימית בשרת", details: error.message });
  }
}
