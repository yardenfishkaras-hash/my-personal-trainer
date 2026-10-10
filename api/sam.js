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

חוקים קשיחים לפעולות המשתמש:
1. כאשר המשתמש מבקש למחוק או לנקות ארוחה (למשל "תמחק הכל מארוחת עשר" או "תמחק את כל הכריכים"), **אתה חייב להחזיר ב-JSON את פעולת ה-action המתאימה**, אחרת הפעולה לא תבוצע באפליקציה!
2. שמור על גיוון מלא, מתכונים אמיתיים, טעימים ובריאים בלבד, ואל תחזור על עצמך.

חובה להחזיר תמיד JSON תקין בלבד (ללא markdown):
{
  "reply": "תשובה קצרה ומעודדת בעברית",
  "action": null או אובייקט פעולה
}

סוגי הפעולות (action) האפשריים:
1. הוספת רכיב מפורט (timeSlot: "בוקר", "עשר", "צהריים", "אחר הצהריים", "ערב", "לילה"):
   {"type": "ADD_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך כוסמין עם אבוקדו וביצה קשה"}
2. הסרת פריטים או סוג מאכל (למשל כל הכריכים):
   {"type": "REMOVE_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך"}
3. ניקוי מלא של ארוחה:
   {"type": "CLEAR_MEAL_SLOT", "timeSlot": "עשר"}
4. שינוי דרגת אימון:
   {"type": "SET_LEVEL", "value": "level3"}
5. קביעת התראה:
   {"type": "SET_NOTIFICATION", "time": "17:30"}

אם לא נדרש שינוי, החזר "action": null.`
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
        max_tokens: 600
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
