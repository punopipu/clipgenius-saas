import crypto from 'crypto';

const SECRET_KEY = process.env.SAAS_SECRET_KEY || "MiClaveUltraSecreta2026";
const EXPIRATION_DAYS = 30;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { accessCode, content } = req.body;

  if (!accessCode || typeof accessCode !== 'string') {
    return res.status(400).json({ error: 'El código de acceso es obligatorio' });
  }

  const cleanCode = accessCode.trim();

  // Estructura: PLAN-TIMESTAMP_UNIX-FIRMA (Ej: BUSINESS-1792020397-62ece9)
  const codeRegex = /^(BASIC|PRO|BUSINESS)-(\d+)-([a-f0-9]{6})$/i;
  const match = cleanCode.match(codeRegex);

  if (!match) {
    return res.status(401).json({ error: 'Formato de código inválido o no reconocido' });
  }

  const plan = match[1].toUpperCase();
  const timestampStr = match[2];
  const providedSignature = match[3].toLowerCase();

  // 1. Validar la Firma Criptográfica SHA-256
  const payloadToSign = `${plan}${timestampStr}${SECRET_KEY}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(payloadToSign)
    .digest('hex')
    .substring(0, 6)
    .toLowerCase();

  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ error: 'Código de acceso no autorizado o falsificado' });
  }

  // 2. Validar Expiración de 30 Días
  const creationTimestamp = parseInt(timestampStr, 10) * 1000;
  const now = Date.now();
  const daysDiff = (now - creationTimestamp) / (1000 * 60 * 60 * 24);

  if (daysDiff > EXPIRATION_DAYS) {
    return res.status(403).json({ error: 'Tu suscripción mensual ha expirado. Por favor renovar tu plan.' });
  }

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Por favor ingresa un texto o transcripción para analizar.' });
  }

  // 3. PROMPT PERSONALIZADO SEGÚN EL PLAN DE SUSCRIPCIÓN
  let systemPrompt = "";

  if (plan === "BASIC") {
    systemPrompt = `Eres un asistente ejecutivo de IA (Plan Básico). Analiza el siguiente texto y entrega:
1. Resumen ejecutivo (máximo 3 párrafos).
2. Las 3 ideas/puntos clave más importantes.`;
  } else if (plan === "PRO") {
    systemPrompt = `Eres un auditor e investigador sénior de IA (Plan Pro). Analiza el siguiente texto y entrega:
1. Resumen Ejecutivo Estructurado.
2. Minuta de Puntos Clave y Decisiones Tomadas.
3. Compromisos, Acciones a Seguir y Plan de Trabajo.
4. Transcripción/Estructuración limpia del contenido.`;
  } else { // BUSINESS
    systemPrompt = `Eres AuditAI & ClipGenius Enterprise (Plan Business Gerencial). Realiza un análisis exhaustivo, profundo e hiperestructurado del siguiente texto/documento/historia:

1. 📌 **RESUMEN EJECUTIVO GERENCIAL** (Síntesis de alto nivel).
2. 🔬 **DESGLOSE TEMÁTICO Y ESTRUCTURAL POR CAPÍTULOS / SECCIONES**.
3. ⚠️ **MATRIZ DE RIESGOS, AMENAZAS Y PARADOJAS CRÍTICAS** (Identificación de cuellos de botella o paradojas lógicas/operativas).
4. 🌎 **ANÁLISIS DE IMPACTO GEOPOLÍTICO / SOCIOECONÓMICO**.
5. 🎬 **CLIPS Y HOOKS DE ALTO IMPACTO** (Ideas clave o frases potentes ideales para destacar o extraer).
6. 💡 **CONCLUSIÓN Y EVALUACIÓN ESTRATÉGICA FINAL**.`;
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Falta configurar la variable GEMINI_API_KEY en el servidor.' });
    }

    // 4. LLAMADA REAL A LA API DE GEMINI
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${systemPrompt}\n\n--- TEXTO A ANALIZAR ---\n${content}` }
              ]
            }
          ]
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Error Gemini API:", geminiData);
      return res.status(500).json({ 
        error: "Error al comunicarse con el motor de IA. Revisa tu GEMINI_API_KEY." 
      });
    }

    const aiAnalysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text 
      || "No se pudo generar el análisis de IA.";

    // 5. RESPUESTA EXITOSA
    return res.status(200).json({
      success: true,
      plan: plan,
      daysRemaining: Math.ceil(EXPIRATION_DAYS - daysDiff),
      message: `Análisis completado exitosamente con el motor de IA (Plan ${plan}).`,
      analysis: aiAnalysisText
    });

  } catch (error) {
    console.error("Error en servidor:", error);
    return res.status(500).json({ error: "Error interno del servidor procesando el análisis." });
  }
}
