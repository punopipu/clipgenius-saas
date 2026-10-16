const crypto = require('crypto');

// Clave secreta absoluta y unificada para Make y Vercel
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

    if (bufferExpected.length !== bufferReceived.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferExpected, bufferReceived);
  } catch (error) {
    console.error('Error al verificar firma HMAC:', error);
    return false;
  }
}

function isTrialValid(timestampStr) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const FIVE_MINUTES_MS = 5 * 60 * 1000; // Tolerancia para evitar desfase de relojes entre Make y Vercel
  const now = Date.now();
  const tokenTimestamp = parseInt(timestampStr, 10);

  if (isNaN(tokenTimestamp)) return false;

  const age = now - tokenTimestamp;
  
  // Permite hasta 5 minutos de diferencia en el futuro por desfase de servidores, y hasta 7 días de antigüedad
  return age >= -FIVE_MINUTES_MS && age <= SEVEN_DAYS_MS;
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

  const cleanToken = String(token).trim();
  const parts = cleanToken.split('-');

  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const [planPrefix, timestampStr, signature] = parts;
  const payload = `${planPrefix}-${timestampStr}`;

  // 1. Validar firma HMAC con la clave fija
  const isValidHMAC = verifyTokenSignature(payload, signature);

  if (!isValidHMAC) {
    return res.status(401).json({ error: 'Firma del token inválida o alterada.' });
  }

  // 2. Validar vigencia considerando la tolerancia de relojes
  if (!isTrialValid(timestampStr)) {
    return res.status(403).json({ error: 'El token ha expirado o su marca de tiempo es inválida.' });
  }

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

  return res.status(200).json({
    success: true,
    message: 'Token verificado con éxito',
    plan: planName,
    limits: modelLimit,
    analysis: prompt 
      ? `[Procesado para ${planName}]: ${prompt}`
      : 'Consola activada con éxito. Acceso concedido.'
  });
};
