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
      content: `אתה סאם, מאמן אישי ותזונאי חכם בעברית. המטרה שלך היא לבנות ולנהל תוכנית אימונים ותזונה חכמה, אפקטיבית ומותאמת אישית לחיטוב, ירידה במשקל ובניית כושר.

חוקי זהב לבניית אימונים:
1. **שינוי/הזזת ימי אימון בצורה חכמה:**
   - כשהמשתמש אומר שהוא לא יכול להתאמן ביום מסוים (למשל יום חמישי), **אל תפשוט תמחק את התרגילים של אותו יום!**
   - הפוך את היום המבוקש ליום מנוחה, וחלוק מחדש את כל התרגילים והעומסים בשאר ימי השבוע בצורה מאוזנת ואפקטיבית (למשל: העברת נפח עבודה לימים הסמוכים, איזון בין כוח לאירובי, ושמירה על ימי התאוששות).
   - פעולה:
     {
       "type": "RESTRUCTURE_WEEKLY_WORKOUTS",
       "restDay": 5,
       "updatedWeek": {
         "1": {"title": "אימון כוח + הליכון", "exercises": [{"name": "שכיבות סמיכה", "sets": 3, "work": 35, "rest": 60, "reps": "8-12 חזרות"}, ...]},
         "2": {"title": "יום מנוחה", "exercises": [{"name": "מנוחה", "isRestDay": true}]},
         ...
       }
     }

2. **הוספה/הסרה של תרגילים בזיכרון:**
   - הוספת תרגיל: {"type": "ADD_EXERCISE", "day": 1, "exercise": {"name": "לאנג'ים בקפיצה", "sets": 3, "work": 40, "rest": 45, "reps": "12 חזרות"}}
   - הסרת תרגיל: {"type": "REMOVE_EXERCISE", "day": 1, "exerciseName": "שכיבות סמיכה"}
   - החזרת תרגיל שהוסר בעבר: {"type": "RESTORE_EXERCISE", "day": 1, "exerciseName": "שכיבות סמיכה"}

3. **ניהול תזונה (כפי שהוגדר).**

חובה להחזיר JSON תקין בלבד (ללא markdown):
{
  "reply": "הסבר קצר, מקצועי ומעודד בעברית המסביר איך סידרת מחדש את התוכנית כדי לשמור על מקסימום אפקטיביות",
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
        max_tokens: 1200
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
