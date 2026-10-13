const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

// Prompts del Sistema según el Nivel de Suscripción
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

// Credenciales de Supabase para validar usuarios en el servidor
const SUPABASE_URL = process.env.SUPABASE_URL || "https://TU_PROYECTO.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "TU_SERVICE_ROLE_KEY";

module.exports = async function handler(req, res) {
  // Configuración de CORS
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
    const { textData } = req.body || {};

    if (!textData || !textData.trim()) {
      return res.status(400).json({ error: 'No se envió texto para analizar.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Falta la variable GEMINI_API_KEY en Vercel.' 
      });
    }

    // --- VALIDACIÓN DE PLAN DEL USUARIO ---
    let planUsuario = "pro"; // Plan por defecto para pruebas si no hay Supabase aún

    const authHeader = req.headers.authorization;
    if (authHeader && SUPABASE_URL.indexOf('TU_PROYECTO') === -1) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Verificar el usuario con el token recibido desde el frontend
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return res.status(401).json({ error: 'Sesión no válida o expirada. Por favor inicia sesión nuevamente.' });
      }

      // Consultar la tabla "profiles" o los metadatos para obtener su plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profile && profile.plan) {
        planUsuario = profile.plan; // "basic", "pro" o "business"
      } else {
        // Si la cuenta no tiene plan activo ni pagado
        return res.status(403).json({ 
          error: 'No tienes una suscripción activa. Por favor selecciona un plan en la sección de Precios para habilitar la consola.' 
        });
      }
    }

    // Seleccionar el Prompt de Gemini según el plan determinado
    const promptSeleccionado = SYSTEM_PROMPTS[planUsuario] || SYSTEM_PROMPTS.pro;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const result = await model.generateContent([
      promptSeleccionado,
      `Texto a analizar:\n${textData}`
    ]);

    const response = await result.response;
    return res.status(200).json({ 
      success: true, 
      planApplied: planUsuario,
      analysis: response.text() 
    });

  } catch (error) {
    console.error("Error en backend Vercel:", error);
    return res.status(500).json({ 
      error: 'Error interno al procesar con Gemini: ' + (error.message || 'Error desconocido') 
    });
  }
};
