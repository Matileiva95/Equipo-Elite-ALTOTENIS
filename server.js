const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => res.send('Altotenis AI Server v2 OK'));

app.post('/ai', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/ai-vision', async (req, res) => {
  try {
    const { imageBase64, mediaType, formato } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Se requiere imageBase64' });

    const prompt = formato === 'atp'
      ? `Eres un asistente de tenis. Analiza esta imagen de estadísticas ATP/Challenger y extrae los datos. Responde SOLO con JSON válido con esta estructura: {"formato":"atp","sets":{"1":{"j":{},"r":{}},"2":{"j":{},"r":{}},"3":{"j":{},"r":{}}}}. Para j (jugador) y r (rival) usa estos keys: valoracionSaque, aces, doblesFaltas, primerSaque_num, primerSaque_den, pts1erSaque_num, pts1erSaque_den, pts2doSaque_num, pts2doSaque_den, roturasSalvadas_num, roturasSalvadas_den, juegosServicio, valoracionResto, ptsRestando1er_num, ptsRestando1er_den, ptsRestando2do_num, ptsRestando2do_den, roturasConvertidas_num, roturasConvertidas_den, juegosResto, ptsSaque_num, ptsSaque_den, ptsResto_num, ptsResto_den, ptsTotales_num, ptsTotales_den. Si son estadísticas globales pon todo en set 1. Omite keys sin valor. SOLO el JSON.`
      : `Eres un asistente de tenis. Analiza esta imagen de estadísticas ITF y extrae los datos por set. Responde SOLO con JSON válido: {"formato":"itf","sets":{"1":{"j":{},"r":{}},"2":{"j":{},"r":{}},"3":{"j":{},"r":{}}}}. Para j y r usa: aces, doblesFaltas, pct1erSaque, pts1erSaque, pct2doSaque, pts2doSaque, bpJugados, bpConvertidos, ptsGanados. Si no divide por set pon todo en set 1. Omite keys sin valor. SOLO el JSON.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      res.json({ success: true, data: parsed });
    } catch {
      res.json({ success: false, raw: text, error: 'No se pudo parsear JSON' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Altotenis AI Server v2 running on port ${PORT}`));
