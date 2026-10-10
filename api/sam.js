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

חוקי זהב להחזרת תשובות:
1. **הזזת יום אימון (למשל "אני לא יכול להתאמן ביום חמישי"):**
   זהה את היום (1=ראשון, 2=שני, 3=שלישי, 4=רביעי, 5=חמישי, 6=שישי, 7=שבת) והחזר אך ורק:
   {"type": "SWAP_REST_DAY", "targetDay": 5}

2. **הוספת תרגיל:**
   {"type": "ADD_EXERCISE", "day": 1, "exercise": {"name": "לאנג'ים בקפיצה", "sets": 3, "work": 40, "rest": 45, "reps": "12 חזרות"}}

3. **הסרת/החזרת תרגיל:**
   - הסרה: {"type": "REMOVE_EXERCISE", "day": 1, "exerciseName": "שכיבות סמיכה"}
   - החזרה: {"type": "RESTORE_EXERCISE", "day": 1, "exerciseName": "שכיבות סמיכה"}

4. **תזונה:**
   - ניקוי ארוחה: {"type": "CLEAR_MEAL_SLOT", "timeSlot": "עשר"}
   - הסרת פריט: {"type": "REMOVE_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך"}
   - הוספת פריט: {"type": "ADD_MEAL_ITEM", "timeSlot": "עשר", "item": "כריך טונה"}

חובה להחזיר JSON תקין בלבד בדיוק במבנה הזה:
{
  "reply": "הסבר מקצועי, קצר ומעודד בעברית המסביר שסדרת מחדש את השבוע והעברת את התרגילים מיום חמישי ליום אחר כדי לשמור על האפקטיביות",
  "action": null או אובייקט הפעולה
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
        temperature: 0.5,
        max_tokens: 400
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
