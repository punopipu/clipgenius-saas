const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prompts del Sistema según el Nivel de Suscripción Seleccionado
const SYSTEM_PROMPTS = {
  basic: `Eres ClipGenius AI (Plan Básico).
  Tu objetivo es entregar una síntesis rápida y esencial.
  Genera exactamente:
  1. 📌 Resumen Ejecutivo (1 párrafo corto, máximo 80 palabras).
  2. ⏱️ 3 a 5 Marcas de Tiempo Principales [MM:SS] con una descripción de 1 línea.
  3. 💡 3 Conclusiones Clave.`,

  pro: `Eres ClipGenius AI (Plan Pro Creador).
  Tu objetivo es maximizar la viralidad para creadores y podcasters.
  Genera exactamente:
  1. 📑 Desglose Temático por Capítulos con timestamps [MM:SS].
  2. 🔥 Top 5 Viral Hooks (para Shorts / TikTok / Reels) con timestamp, frase de enganche y justificación.
  3. 📦 Kit Completo para Redes Sociales (3 Títulos de Alto CTR, Descripción SEO y Hashtags).`,

  business: `Eres AuditAI Enterprise.
  Tu objetivo es realizar una auditoría corporativa y legal rigurosa.
  Genera exactamente:
  1. 🏛️ Resumen de Dirección & Minuta Ejecutiva.
  2. 🚨 Matriz de Alerta de Riesgos clasificando hallazgos en:
     - 🔴 Riesgo Alto (Cláusulas abusivas, multas, renovaciones implícitas).
     - 🟡 Riesgo Medio (Plazos ajustados o vacíos procesales).
     - 🟢 Condiciones Favorables / Estándar.
  3. 📋 Plan de Acción Recomendado antes de firmar.`
};

module.exports = async function handler(req, res) {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { textData, plan } = req.body || {};

    if (!textData || !textData.trim()) {
      return res.status(400).json({ error: 'No se envió texto para analizar.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Falta la variable GEMINI_API_KEY en Vercel. Ve a Settings > Environment Variables y agrégala.' 
      });
    }

    // Selecciona el plan enviado ("basic", "pro" o "business"), por defecto usa "pro"
    const planSeleccionado = plan && SYSTEM_PROMPTS[plan] ? plan : 'pro';
    const promptSeleccionado = SYSTEM_PROMPTS[planSeleccionado];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const result = await model.generateContent([
      promptSeleccionado,
      `Texto a analizar:\n${textData}`
    ]);

    const response = await result.response;
    return res.status(200).json({ 
      success: true, 
      planApplied: planSeleccionado,
      analysis: response.text() 
    });

  } catch (error) {
    console.error("Error en backend Vercel:", error);
    return res.status(500).json({ 
      error: 'Error interno al procesar con Gemini: ' + (error.message || 'Error desconocido') 
    });
  }
};
