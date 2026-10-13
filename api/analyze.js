const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define códigos fijos de respaldo por si necesitas usarlos manualmente
const ACCESS_CODES = {
  basic: ["BASIC2026", "CLIPS-BASIC"],
  pro: ["PRO2026", "CREADOR-PRO"],
  business: ["BUSINESS2026", "AUDIT-VIP"]
};

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
  // Manejo de cabeceras CORS
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
    const { textData, passcode } = req.body || {};

    if (!textData || !textData.trim()) {
      return res.status(400).json({ error: 'No se envió texto para analizar.' });
    }

    if (!passcode || !passcode.trim()) {
      return res.status(401).json({ 
        error: '⚠️ Código de acceso requerido. Ingresa la clave de tu suscripción o adquiere un plan en la sección de Precios.' 
      });
    }

    const cleanCode = passcode.trim().toUpperCase();

    // Validación flexible: acepta prefijos automáticos de Make (ej: PRO-xxxx) o códigos fijos
    let planAutorizado = null;
    if (cleanCode.startsWith("BASIC") || ACCESS_CODES.basic.includes(cleanCode)) {
      planAutorizado = "basic";
    } else if (cleanCode.startsWith("PRO") || ACCESS_CODES.pro.includes(cleanCode)) {
      planAutorizado = "pro";
    } else if (cleanCode.startsWith("BUSINESS") || ACCESS_CODES.business.includes(cleanCode)) {
      planAutorizado = "business";
    }

    if (!planAutorizado) {
      return res.status(403).json({ 
        error: '❌ Código de suscripción no válido o expirado. Por favor verifica tu clave o adquiere un plan.' 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Falta la variable GEMINI_API_KEY en Vercel. Ve a Settings > Environment Variables y agrégala.' 
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
