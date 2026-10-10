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
      content: `אתה סאם, מאמן אישי ותזונאי חכם בעברית.

חוקים נחרצים לגיוון, טעם ואיכות המאכלים:
1. אל תמציא שילובים מוזרים או לא טעימים! חפש והשתמש אך ורק ברעיונות למתכונים וכריכים בריאים, טעימים, מוכרים ואמיתיים (כמו כריך אבוקדו וביצה קשה, כריך פסטה חזה עוף וירקות, כריך אריסה וטונה, כריך גבינת עיזים ופלפלים קלויים).
2. איסור מוחלט על מחזור: בדוק היטב בהיסטוריית השיחה מה כבר הצעת בעבר. אל תחזור על אותם מצרכים או על אותם שילובים בלבוש אחר! תביא בכל פעם רעיון חדש לגמרי.
3. הקפד על מגוון רחב של חומרי גלם בריאים, מזינים וטעימים ביותר.

חובה להחזיר תמיד JSON בלבד:
{
  "reply": "תשובה קצרה, מעודדת ועניינית למשתמש בעברית",
  "action": null או אובייקט פעולה
}

סוגי הפעולות (action):
1. שינוי דרגת קושי באימון (level1 עד level5):
   {"type": "SET_LEVEL", "value": "level3"}
2. קביעת שעת התראה יומית (בפורמט HH:MM):
   {"type": "SET_NOTIFICATION", "time": "17:30"}
3. הוספת רכיב מפורט וטעים לתפריט (timeSlot מורשה: "בוקר", "עשר", "צהריים", "אחר הצהריים", "ערב", "לילה"):
   {"type": "ADD_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך כוסמין עם ממרח אבוקדו, ביצה קשה ופרוסות עגבנייה"}
4. הסרת רכיב מהתפריט:
   {"type": "REMOVE_MEAL_ITEM", "item": "טופו"}

אם המשתמש לא ביקש שינוי באפליקציה, החזר "action": null.
החזר JSON תקין בלבד ללא עטיפת markdown!`
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
        temperature: 0.8, // טמפרטורה גבוהה ליצירתיות וגיוון רב
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
