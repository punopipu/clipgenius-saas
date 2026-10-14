const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prompts del Sistema según el Nivel de Suscripción
const SYSTEM_PROMPTS = {
  basic: `Eres ClipGenius AI (Plan Básico). Genera:
  1. 📌 Resumen Ejecutivo (1 párrafo corto).
  2. ⏱️ 3 a 5 Marcas de Tiempo Principales [MM:SS].
  3. 💡 3 Conclusiones Clave.`,

  pro: `Eres ClipGenius AI (Plan Pro Creador). Genera:
  1. 📑 Desglose Temático por Capítulos con timestamps [MM:SS].
  2. 🔥 Top 5 Viral Hooks (Shorts / TikTok / Reels) con timestamp, frase y razón.
  3. 📦 Kit Completo para Redes Sociales (3 Títulos de Alto CTR, Descripción SEO y Hashtags).`,

  business: `Eres AuditAI Enterprise. Genera:
  1. 🏛️ Resumen de Dirección & Minuta Ejecutiva.
  2. 🚨 Matriz de Alerta de Riesgos (🔴 Riesgo Alto, 🟡 Riesgo Medio, 🟢 Favorable).
  3. 📋 Plan de Acción Recomendado antes de firmar.`
};

module.exports = async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido. Usa POST.' });

  try {
    const { textData, passcode } = req.body || {};

    if (!textData || !textData.trim()) {
      return res.status(400).json({ error: 'No se envió texto para analizar.' });
    }

    if (!passcode || !passcode.trim()) {
      return res.status(401).json({ 
        error: '⚠️ Código de acceso requerido. Ingresa la clave enviada a tu correo.' 
      });
    }

    const cleanCode = passcode.trim().toUpperCase();

    // REGEX ESTRICTA: Exige EXACTAMENTE el nombre del plan, un guión y 6 letras/números aleatorios
    const basicRegex = /^BASIC-[A-Z0-9]{6}$/;
    const proRegex = /^PRO-[A-Z0-9]{6}$/;
    const businessRegex = /^BUSINESS-[A-Z0-9]{6}$/;

    let planAutorizado = null;

    if (basicRegex.test(cleanCode)) {
      planAutorizado = "basic";
    } else if (proRegex.test(cleanCode)) {
      planAutorizado = "pro";
    } else if (businessRegex.test(cleanCode)) {
      planAutorizado = "business";
    }

    // Si NO coincide con la regla estricta de 6 caracteres aleatorios, RECHAZAR inmediatamente
    if (!planAutorizado) {
      return res.status(403).json({ 
        error: '❌ Código inválido. Debe tener el formato PLAN-XXXXXX (ejemplo: PRO-A8X9K2).' 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Falta la variable GEMINI_API_KEY en Vercel.' 
      });
    }

    const promptSeleccionado = SYSTEM_PROMPTS[planAutorizado];
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const result = await model.generateContent([
      promptSeleccionado,
      `Texto a analizar:\n${textData}`
    ]);

    const response = await result.response;
    return res.status(200).json({ 
      success: true, 
      planApplied: planAutorizado,
      analysis: response.text() 
    });

  } catch (error) {
    console.error("Error en backend Vercel:", error);
    return res.status(500).json({ 
      error: 'Error interno al procesar con Gemini: ' + (error.message || 'Error desconocido') 
    });
  }
};
