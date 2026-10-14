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

  // Recreamos exactamente el string que se firmó
  const planPrefix = plan + '-';
  const payloadToSign = `${planPrefix}${timestampStr}${SECRET_KEY}`;
  
  const expectedSignature = crypto
    .createHash('sha256')
    .update(payloadToSign)
    .digest('hex')
    .substring(0, 6);

  // DEBUG LOGS (Revisa Vercel -> Logs)
  console.log("--- DEBUG HMAC VALIDATION ---");
  console.log("Código recibido:", cleanCode);
  console.log("Plan extraído:", plan);
  console.log("Timestamp extraído:", timestampStr);
  console.log("Firma provista (Make):", providedSignature);
  console.log("Payload usado en Node:", payloadToSign);
  console.log("Firma calculada en Node:", expectedSignature);
  console.log("-----------------------------");

  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ 
      error: 'Código de acceso no autorizado o falsificado',
      debugInfo: {
        providedSignature,
        expectedSignature
      }
    });
  }

  // Validar Expiración de 30 Días
  const creationTimestamp = parseInt(timestampStr, 10) * 1000;
  const now = Date.now();
  const daysDiff = (now - creationTimestamp) / (1000 * 60 * 60 * 24);

  if (daysDiff > EXPIRATION_DAYS) {
    return res.status(403).json({ error: 'Tu suscripción mensual ha expirado. Por favor renovar tu plan.' });
  }

  return res.status(200).json({
    success: true,
    plan: plan,
    daysRemaining: Math.ceil(EXPIRATION_DAYS - daysDiff),
    message: `Acceso concedido para el plan ${plan}. Quedan ${Math.ceil(EXPIRATION_DAYS - daysDiff)} días de acceso.`,
    analysis: `[RESULTADO DEL ANÁLISIS (${plan})]: ${content ? content.substring(0, 300) + '...' : 'Procesado con éxito.'}`
  });
}
