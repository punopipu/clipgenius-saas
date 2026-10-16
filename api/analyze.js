const crypto = require('crypto');

// Clave secreta fija para Make y Vercel
const SECRET_KEY = 'MiClaveUltraSecreta2026';

/**
 * Valida la firma HMAC/SHA-256 del token evitando errores por espacios o mayúsculas
 */
function verifyTokenSignature(payload, signature) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('hex')
      .toLowerCase();

    const cleanSignature = signature.trim().toLowerCase();

    const bufferExpected = Buffer.from(expectedSignature, 'utf-8');
    const bufferReceived = Buffer.from(cleanSignature, 'utf-8');

    if (bufferExpected.length !== bufferReceived.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferExpected, bufferReceived);
  } catch (error) {
    console.error('Error al verificar firma HMAC:', error);
    return false;
  }
}

/**
 * Revisa si una prueba o suscripción de 7 días sigue vigente
 */
function isTrialValid(timestampStr) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const tokenTimestamp = parseInt(timestampStr, 10);

  if (isNaN(tokenTimestamp)) return false;

  const age = now - tokenTimestamp;
  return age >= 0 && age <= SEVEN_DAYS_MS;
}

module.exports = async (req, res) => {
  // Configurar encabezados CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, prompt } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'El campo token es obligatorio.' });
  }

  // Limpiar espacios en blanco al inicio y final
  const cleanToken = String(token).trim();
  const parts = cleanToken.split('-');

  // Estructura esperada: PREFIJO-TIMESTAMP-FIRMA (ej. PRO-1792144827000-hash...)
  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const [planPrefix, timestampStr, signature] = parts;
  const payload = `${planPrefix}-${timestampStr}`;

  // 1. Validar la autenticidad criptográfica con Make
  const isValidHMAC = verifyTokenSignature(payload, signature);

  if (!isValidHMAC) {
    return res.status(401).json({ error: 'Firma del token inválida o alterada.' });
  }

  // 2. Validar vigencia de tiempo (7 días)
  if (!isTrialValid(timestampStr)) {
    return res.status(403).json({ error: 'El token ha expirado (máximo 7 días de vigencia).' });
  }

  // 3. Determinar el nivel del plan según el prefijo
  let planName = 'Desconocido';
  let modelLimit = 'Básico';

  switch (planPrefix.toUpperCase()) {
    case 'BUSINESS':
      planName = 'Business Plan ($79)';
      modelLimit = 'Ilimitado / GPT-4o & Claude 3.5 Sonnet';
      break;
    case 'PRO':
      planName = 'Creadores / PRO Plan ($24)';
      modelLimit = 'Avanzado / GPT-4o Mini & Gemini Flash';
      break;
    case 'CASUAL':
      planName = 'Casual Plan ($9)';
      modelLimit = 'Estándar / GPT-3.5 Turbo';
      break;
    default:
      return res.status(400).json({ error: 'Tipo de plan no reconocido en el token.' });
  }

  // Respuesta exitosa formateada limpia
  return res.status(200).json({
    success: true,
    message: 'Token verificado con éxito',
    plan: planName,
    limits: modelLimit,
    analysis: prompt 
      ? `[Procesado para ${planName}]: ${prompt}`
      : 'Consola activada con éxito. Puedes comenzar a enviar solicitudes.'
  });
};
