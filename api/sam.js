import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // הגדרת CORS כדי שהאפליקציה תוכל לפנות לשרת מכל מקום
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

    // חיבור למפתח ה-API מתוך הגדרות השרת ב-Vercel
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let promptParts = [];

    // אם נשלחה תמונה - ממירים אותה לפורמט שהמודל מקבל
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    }

    // הוספת הטקסט לערכה
    promptParts.push(message || "נתח את התמונה הזו");

    const result = await model.generateContent(promptParts);
    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error("SAM API Error:", error);
    return res.status(500).json({ error: "שגיאה פנימית בשרת", details: error.message });
  }
}
