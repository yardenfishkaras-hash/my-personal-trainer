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
    const { messages } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "מפתח ה-API של Groq אינו מוגדר בשרת" });
    }

    const systemInstruction = {
      role: "system",
      content: `אתה סאם, מאמן אישי ותזונאי חכם בעברית עם שליטה מלאה באפליקציה.

חוקי הפעולות:
1. אם המשתמש רוצה להפוך יום מסוים ליום מנוחה (למשל "אני לא יכול להתאמן ביום חמישי"), החזר אך ורק את הפעולה הזו (יום ראשון=1, שני=2, שלישי=3, רביעי=4, חמישי=5, שישי=6, שבת=7):
   {"type": "SWAP_REST_DAY", "restDay": 5}
2. הוספת תרגיל:
   {"type": "ADD_EXERCISE", "day": 1, "exercise": {"name": "שם התרגיל", "sets": 3, "work": 40, "rest": 45, "reps": "12 חזרות"}}
3. הסרת תרגיל:
   {"type": "REMOVE_EXERCISE", "day": 1, "exerciseName": "שם התרגיל"}
4. ניהול תזונה רגיל.

חובה להחזיר JSON תקין בלבד (ללא markdown):
{
  "reply": "תשובה קצרה ומעודדת בעברית",
  "action": null או אובייקט פעולה
}`
    };

    const validMessages = Array.isArray(messages) ? messages : [];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [systemInstruction, ...validMessages],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(data.error?.message || "שגיאה בפנייה לשרת");
    }

    let replyText = data.choices[0].message.content.trim();
    
    if (replyText.startsWith("```json")) {
      replyText = replyText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (replyText.startsWith("```")) {
      replyText = replyText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let parsedData;
    try {
      parsedData = JSON.parse(replyText);
    } catch (e) {
      parsedData = { reply: replyText, action: null };
    }

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("SAM API Error:", error);
    return res.status(500).json({ error: "שגיאה פנימית בשרת", details: error.message });
  }
}
