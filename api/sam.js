export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, image } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured on server' });
  }

  try {
    let contentPayload = [];

    if (message) {
      contentPayload.push({ type: "text", text: message });
    }

    if (image) {
      contentPayload.push({
        type: "image_url",
        image_url: { url: image }
      });
    } else if (!message) {
      contentPayload.push({ type: "text", text: "נתח את התמונה הזו מבחינת תזונה וקלוריות, ותן הערכה קצרה בעברית." });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { 
            role: 'system', 
            content: 'אתה סאם (SAM), עוזר כושר ותזונה אישי חכם בעברית. כאשר המשתמש שולח תמונה של אוכל, נתח אותה, הערך את הרכיבים והקלוריות שלה בקצרה ובתמיכה.' 
          },
          { role: 'user', content: contentPayload }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ reply: 'שגיאה מהשרת: ' + (data.error?.message || 'Unknown error') });
    }

    const reply = data.choices && data.choices[0] ? data.choices[0].message.content : 'תקלה בקבלת תשובה מסאם.';
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ reply: 'שגיאה בהתחברות לשרת.' });
  }
}
