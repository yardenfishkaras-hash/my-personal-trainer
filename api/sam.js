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
      content: `אתה סאם, מאמן אישי ותזונאי חכם בעברית עם שליטה מלאה באפליקציית האימונים והתזונה של המשתמש.

חוקים ויכולות ניהול אימונים חדשות:
1. **שינוי/הזזת ימי אימון ובנייה מחדש:**
   - אם המשתמש אומר שהוא לא יכול להתאמן ביום מסוים (למשל: "אני לא יכול להתאמן ביום חמישי"), הפוך את היום הזה ליום מנוחה, ותכנן מחדש את שאר ימי השבוע בצורה חכמה ואפקטיבית (מבלי לפגוע ביעדי החיטוב והירידה במשקל).
   - פעולה: {"type": "SWAP_REST_DAY", "restDay": 5, "newSchedule": {...}} (restDay מקבל מספר 1-7 עבור ראשון-שבת).

2. **הוספת תרגילים חדשים (למשל כשהרמה קלה מדי):**
   - אם המשתמש אומר שהאימון קל לו אך הוא לא רוצה לעלות דרגה, הוסף תרגיל חדש ומאתגר ליום מסוים או לכל ימי האימון.
   - פעולה: {"type": "ADD_EXERCISE", "day": 1, "exercise": {"name": "לאנג'ים בקפיצה", "sets": 3, "work": 40, "rest": 45, "reps": "12 חזרות"}}

3. **הורדת תרגילים וזיכרון:**
   - אם המשתמש מדווח שקשה לו מדי או מבקש להוריד תרגיל מסוים, הסר את התרגיל מהתקציר היומי. תזכור בהיסטוריית השיחה איזה תרגיל הסרת, וכאשר המשתמש יבקש "להחזיר את התרגיל שהורדת", תדע בדיוק איזה תרגיל להחזיר!
   - פעולה להסרה: {"type": "REMOVE_EXERCISE", "day": 1, "exerciseName": "שכיבות סמיכה"}
   - פעולה להחזרה: {"type": "RESTORE_EXERCISE", "day": 1, "exercise": {...}}

4. **ניהול תפריט התזונה (כפי שהוגדר):**
   - הוספת רכיב: {"type": "ADD_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך מלחם מלא..."}
   - הסרת רכיבים: {"type": "REMOVE_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך"}
   - ניקוי ארוחה: {"type": "CLEAR_MEAL_SLOT", "timeSlot": "עשר"}

חובה להחזיר JSON תקין בלבד (ללא markdown):
{
  "reply": "תשובה קצרה, מקצועית ומעודדת בעברית",
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
