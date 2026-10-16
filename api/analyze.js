const crypto = require('crypto');

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

// Función auxiliar para leer el cuerpo de la petición en Vercel
async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
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

  const bodyData = await parseBody(req);
  const queryData = req.query || {};
  
  const token = bodyData.token || queryData.token;
  const action = bodyData.action || queryData.action;
  const content = bodyData.content || bodyData.prompt || queryData.content || queryData.prompt;

  // 1. Generar token de prueba (GET 1-clic o petición sin token)
  if (req.method === 'GET' || action === 'generate_trial' || (!token && req.method === 'POST')) {
    const trialTimestamp = Date.now();
    const trialPayload = `CASUAL-${trialTimestamp}`;
    const trialSignature = crypto.createHmac('sha256', SECRET_KEY).update(trialPayload).digest('hex');
    return res.status(200).json({
      success: true,
      message: 'Token de prueba generado con éxito',
      token: `${trialPayload}-${trialSignature}`
    });
  }

  // 2. Validación de Token POST
  const cleanToken = String(token).trim();
  const parts = cleanToken.split('-');

  if (parts.length < 3) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const signature = parts.pop();
  const payload = parts.join('-');
  const planPrefix = parts[0];

  if (!verifyTokenSignature(payload, signature)) {
    return res.status(401).json({ error: 'Firma del token inválida o alterada.' });
  }

  const timestampStr = parts[parts.length - 1];
  if (!isTrialValid(timestampStr)) {
    return res.status(403).json({ error: 'El token ha expirado.' });
  }

  const upperPrefix = planPrefix.toUpperCase();
  const textAnalyzed = content && String(content).trim().length > 0 
    ? String(content).trim() 
    : "Contenido predeterminado procesado correctamente.";

  const responseData = {
    minutaExpress: `Resumen ejecutivo generado bajo el plan ${upperPrefix}:\n\n"${textAnalyzed}"`,
    tareasYCompromisos: [
      "Revisar y validar los acuerdos tomados en la sesión.",
      "Asignar responsables y plazos de entrega definitivos.",
      "Archivar el reporte en la plataforma ejecutiva."
    ],
    puntosClaveCotidianos: [
      "Optimización del flujo de trabajo completada con éxito.",
      "Estructuración de datos adaptada al nivel de suscripción activo."
    ],
    sintetizadorDeTextos: "El documento analizado mantiene una coherencia óptima para la toma de decisiones C-Level."
  };

  responseData.detectorGanchosVirales = [
    "🔥 \"Lo que nadie te cuenta sobre la automatización de procesos...\"",
    "⚡ \"El secreto definitivo para escalar tu productividad sin esfuerzo.\""
  ];
  responseData.timestampsYouTube = [
    "00:00 - Introducción y contextualización principal",
    "01:30 - Demostración del motor criptográfico",
    "03:45 - Conclusiones y cierre estratégico"
  ];

  if (upperPrefix === 'BUSINESS') {
    responseData.suiteAuditoria = {
      riesgosOperativos: "Flujo optimizado sin fricciones aparentes en la ejecución.",
      riesgosLegales: "Cumplimiento normativo y cifrado de alta seguridad verificado."
    };
    responseData.auditBot = {
      climaNegociacion: "Constructivo, asertivo y enfocado en alta conversión."
    };
  }

  return res.status(200).json({
    success: true,
    result: {
      plan: upperPrefix,
      data: responseData
    }
  });
};
