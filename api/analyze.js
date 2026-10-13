const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPTS = {
  basic: `Eres ClipGenius AI (Plan Básico). Genera:
  1. Resumen ejecutivo de 1 párrafo.
  2. 3 a 5 marcas de tiempo [MM:SS] principales.
  3. 3 conclusiones clave.`,

  pro: `Eres ClipGenius AI (Plan Pro Creador). Genera:
  1. Desglose completo por capítulos con timestamps [MM:SS].
  2. 3 a 5 Viral Hooks para Shorts/Reels/TikTok.
  3. Kit para redes sociales (títulos, descripción y hashtags).`,

  business: `Eres AuditAI Enterprise. Genera:
  1. Resumen ejecutivo formal.
  2. Matriz de Alerta de Riesgos (🔴 Alto, 🟡 Medio, 🟢 Favorable).
  3. Desglose financiero y minutas con responsables.`
};

module.exports = async function handler(req, res) {
  // Manejo de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { textData } = req.body || {};

    if (!textData) {
      return res.status(400).json({ error: 'No se envió texto para analizar.' });
    }

    // Lee la API Key guardada en las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Falta la variable GEMINI_API_KEY en Vercel. Ve a Settings > Environment Variables e agrégala.' 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Configurado con el modelo que elegiste en Google AI Studio
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const promptSeleccionado = SYSTEM_PROMPTS.pro;

    const result = await model.generateContent([
      promptSeleccionado,
      textData
    ]);

    const response = await result.response;
    return res.status(200).json({ success: true, analysis: response.text() });

  } catch (error) {
    console.error("Error en backend Vercel:", error);
    return res.status(500).json({ 
      error: 'Error al procesar con Gemini: ' + (error.message || 'Fallo interno') 
    });
  }
};
