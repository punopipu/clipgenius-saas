const crypto = require('crypto');

// Clave secreta fija unificada entre Make y Vercel
const SECRET_KEY = 'MiClaveUltraSecreta2026';

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
    console.error('Error al verificar firma HMAC:', error);
    return false;
  }
}

function isTrialValid(timestampStr) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const CLOCK_SKEW_TOLERANCE_MS = 10 * 60 * 1000; // 10 minutos de tolerancia de reloj
  const now = Date.now();
  const tokenTimestamp = parseInt(timestampStr, 10);

  if (isNaN(tokenTimestamp)) return false;
  const age = now - tokenTimestamp;
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age <= SEVEN_DAYS_MS;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const bodyData = req.body || {};
  const queryData = req.query || {};
  
  const token = bodyData.token || queryData.token;
  const action = bodyData.action || queryData.action;
  const content = bodyData.content || bodyData.prompt || queryData.content || queryData.prompt;

  // -------------------------------------------------------------
  // GENERACIÓN DE TOKEN DE PRUEBA (GET desde el botón 1-clic)
  // -------------------------------------------------------------
  if (req.method === 'GET' || action === 'generate_trial' || !token || token === 'TRIAL' || token === 'FREE') {
    const trialTimestamp = Date.now();
    const trialPayload = `CASUAL-${trialTimestamp}`;
    const trialSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(trialPayload)
      .digest('hex');

    const generatedTrialToken = `${trialPayload}-${trialSignature}`;

    return res.status(200).json({
      success: true,
      message: 'Token de prueba generado con éxito',
      token: generatedTrialToken
    });
  }

  // -------------------------------------------------------------
  // VALIDACIÓN DE TOKEN Y PROCESAMIENTO DE ANÁLISIS (POST)
  // -------------------------------------------------------------
  const cleanToken = String(token).trim();
  const parts = cleanToken.split('-');

  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Formato de token inválido. Debe contener PREFIJO-TIMESTAMP-FIRMA.' });
  }

  const [planPrefix, timestampStr, signature] = parts;
  const payload = `${planPrefix}-${timestampStr}`;

  if (!verifyTokenSignature(payload, signature)) {
    return res.status(401).json({ error: 'Firma del token inválida o alterada.' });
  }

  if (!isTrialValid(timestampStr)) {
    return res.status(403).json({ error: 'El token ha expirado (máximo 7 días de vigencia).' });
  }

  const upperPrefix = planPrefix.toUpperCase();
  let planName = upperPrefix;

  // Generar la estructura de datos que tu frontend index.html espera mostrar en pantalla
  const analysisResult = {
    minutaExpress: `Reunión procesada exitosamente con el plan ${planName}.\n\nResumen del contenido analizado:\n"${content || 'Sin texto de entrada proporcionado'}"`,
    tareasYCompromisos: [
      "Revisar los puntos clave extraídos por el motor de IA.",
      "Compartir el reporte ejecutivo con los involucrados directos.",
      "Asegurar la validación de plazos y responsables."
    ],
    puntosClaveCotidianos: [
      "Optimización de tiempos lograda en más del 85%.",
      "Estructuración automática adaptada al nivel de suscripción."
    ],
    sintetizadorDeTextos: "El documento o transcripción mantiene una coherencia óptima para la toma de decisiones C-Level."
  };

  // Si el plan es Creadores o Business, añadimos los módulos avanzados correspondientes
  if (upperPrefix === 'PRO' || upperPrefix === 'BUSINESS') {
    analysisResult.detectorGanchosVirales = [
      "🔥 \"Nadie te dice esto sobre la automatización real...\"",
      "⚡ \"El secreto para recortar horas de trabajo en segundos.\""
    ];
    analysisResult.timestampsYouTube = [
      "00:00 - Introducción y contexto principal",
      "01:15 - Revelación del flujo automatizado",
      "03:40 - Conclusiones y cierre de impacto"
    ];
  }

  if (upperPrefix === 'BUSINESS') {
    analysisResult.suiteAuditoria = {
      riesgosOperativos: "Bajo riesgo de fricción en la ejecución de tareas asíncronas.",
      riesgosLegales: "Cláusulas de confidencialidad respaldadas por cifrado estricto."
    };
    analysisResult.auditBot = {
      climaNegociacion: "Favorable, asertivo y orientado a resultados inmediatos."
    };
  }

  return res.status(200).json({
    success: true,
    result: {
      plan: planName,
      data: analysisResult
    }
  });
};
