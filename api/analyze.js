const crypto = require('crypto');

const SECRET_KEY = 'MiClaveUltraSecreta2026';
// Pega aquí tu API Key de Google AI Studio:
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JQYXOK317iDYMN2N0J6rNrtvHfmdQOwi8bLMFZ7uMlCQ';

function verifyTokenSignature(payload, signature) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('hex')
      .toLowerCase();

    const cleanSignature = String(signature).trim().toLowerCase();
    const bufferExpected = Buffer.from(expectedSignature, 'utf-8');
    const bufferReceived = Buffer.from(cleanSignature, 'utf-8');

    if (bufferExpected.length !== bufferReceived.length) return false;
    return crypto.timingSafeEqual(bufferExpected, bufferReceived);
  } catch (error) {
    return false;
  }
}

function isTrialValid(timestampStr) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const CLOCK_SKEW_TOLERANCE_MS = 10 * 60 * 1000;
  const now = Date.now();
  const tokenTimestamp = parseInt(timestampStr, 10);

  if (isNaN(tokenTimestamp)) return false;
  const age = now - tokenTimestamp;
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age <= SEVEN_DAYS_MS;
}

// Función para procesar el texto con la IA real
async function analyzeWithGemini(content, planPrefix) {
  const systemPrompt = `Eres el motor de IA ejecutiva de ClipGenius & AuditAI. 
Tu tarea es analizar la transcripción o texto ingresado y devolver UNICAMENTE un objeto JSON estricto con el siguiente formato exacto, sin bloques de código Markdown (\`\`\`json):

{
  "minutaExpress": "Un resumen ejecutivo conciso y profesional del texto de 2 a 4 párrafos.",
  "tareasYCompromisos": ["Tarea o compromiso 1 detectado en el texto con responsable si existe", "Tarea 2..."],
  "puntosClaveCotidianos": ["Punto clave 1 extraído del texto", "Punto clave 2..."],
  "sintetizadorDeTextos": "Una síntesis o conclusión estratégica del texto."
  ${planPrefix === 'PRO' || planPrefix === 'BUSINESS' ? `,
  "detectorGanchosVirales": ["Gancho o hook viral 1 para redes basado en el contenido", "Gancho 2..."],
  "timestampsYouTube": ["00:00 - Tema 1", "01:30 - Tema 2"]` : ''}
  ${planPrefix === 'BUSINESS' ? `,
  "suiteAuditoria": {
    "riesgosOperativos": "Evaluación de riesgos operativos basados en el texto.",
    "riesgosLegales": "Evaluación de riesgos contractuales o legales."
  },
  "auditBot": {
    "climaNegociacion": "Análisis del tono y clima de negociación."
  }` : ''}
}

Texto a analizar:
"${content}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }]
    })
  });

  const rawData = await response.json();
  const aiText = rawData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Limpiar posibles etiquetas de markdown
  const cleanJsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJsonStr);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  const bodyData = req.body || {};
  const queryData = req.query || {};
  
  const token = bodyData.token || queryData.token;
  const action = bodyData.action || queryData.action;
  const content = bodyData.content || bodyData.prompt || queryData.content || queryData.prompt;

  // Generar token de prueba 1-clic
  if (req.method === 'GET' || action === 'generate_trial' || !token || token === 'TRIAL' || token === 'FREE') {
    const trialTimestamp = Date.now();
    const trialPayload = `CASUAL-${trialTimestamp}`;
    const trialSignature = crypto.createHmac('sha256', SECRET_KEY).update(trialPayload).digest('hex');
    return res.status(200).json({
      success: true,
      message: 'Token de prueba generado con éxito',
      token: `${trialPayload}-${trialSignature}`
    });
  }

  // Validar token
  const cleanToken = String(token).trim();
  const parts = cleanToken.split('-');

  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const [planPrefix, timestampStr, signature] = parts;
  const payload = `${planPrefix}-${timestampStr}`;

  if (!verifyTokenSignature(payload, signature)) {
    return res.status(401).json({ error: 'Firma del token inválida o alterada.' });
  }

  if (!isTrialValid(timestampStr)) {
    return res.status(403).json({ error: 'El token ha expirado.' });
  }

  const upperPrefix = planPrefix.toUpperCase();

  try {
    const aiAnalysis = await analyzeWithGemini(content, upperPrefix);
    
    return res.status(200).json({
      success: true,
      result: {
        plan: upperPrefix,
        data: aiAnalysis
      }
    });
  } catch (err) {
    console.error('Error al procesar con IA:', err);
    return res.status(500).json({ error: 'Error interno al analizar el contenido con IA.' });
  }
};
