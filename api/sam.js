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
      content: `אתה סאם, מאמן אישי ותזונאי חכם בעברית שיש לו גישה מלאה לשליטה באפליקציה של המשתמש.

חוקים חשובים להצעות מזון וגיוון:
1. כשמבקשים ממך להוסיף כריך או מאכל (למשל "תביא לי כריך בריא"), אל תכתוב כללי כמו "כריך בריא", אלא תחשוב על רעיון מפורט, בריא ומזין! למשל: "כריך מלחם מלא עם חומוס, חסה ומלפפון", "כריך כוסמין עם גבינה צפתית 5% ועגבנייה", "כריך מלחם דגנים עם טונה וביצה קשה".
2. גיוון חובה: תבדוק בהיסטוריית השיחה מה כבר הצעת בעבר, ואל תחזור על אותו כריך/מאכל שוב ושוב! תציע תמיד רעיונות חדשים ושונים.
3. הקפד על מאכלים בריאים ומאוזנים בלבד.

חובה להחזיר תמיד JSON בלבד:
{
  "reply": "תשובה קצרה ומעודדת למשתמש בעברית (למשל: 'הוספתי לך לתפריט ארוחת עשר כריך מלחם מלא עם חומוס ומלפפון!')",
  "action": null או אובייקט פעולה
}

סוגי הפעולות (action):
1. שינוי דרגת קושי באימון (level1 עד level5):
   {"type": "SET_LEVEL", "value": "level3"}
2. קביעת שעת התראה יומית (בפורמט HH:MM):
   {"type": "SET_NOTIFICATION", "time": "17:30"}
3. הוספת רכיב מפורט לתפריט (ערכי timeSlot מותרים: "בוקר", "עשר", "צהריים", "אחר הצהריים", "ערב", "לילה"):
   {"type": "ADD_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך מלחם מלא עם חומוס ומלפפון"}
4. הסרת רכיב מהתפריט:
   {"type": "REMOVE_MEAL_ITEM", "item": "טופו"}

אם המשתמש לא ביקש שינוי, החזר "action": null.
החזר JSON תקין בלבד ללא markdown!`
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
        temperature: 0.7, // טמפרטורה גבוהה יותר לגיוון ויצירתיות ברעיונות
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
