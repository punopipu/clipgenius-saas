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

  // Sanitizar el código ingresado (eliminar espacios accidentales al inicio/final)
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

  // 1. Validar la Firma SHA-256 (Plan + Timestamp + SecretKey)
  const payloadToSign = `${plan}${timestampStr}${SECRET_KEY}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(payloadToSign)
    .digest('hex')
    .substring(0, 6)
    .toLowerCase();

  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ 
      error: 'Código de acceso no autorizado o falsificado' 
    });
  }

  // 2. Validar Expiración de 30 Días
  const creationTimestamp = parseInt(timestampStr, 10) * 1000;
  const now = Date.now();
  const daysDiff = (now - creationTimestamp) / (1000 * 60 * 60 * 24);

  if (daysDiff > EXPIRATION_DAYS) {
    return res.status(403).json({ error: 'Tu suscripción mensual ha expirado. Por favor renovar tu plan.' });
  }

  // 3. Respuesta Exitosa con Contenido Completo
  const fullAnalysis = content && content.trim() !== '' 
    ? content 
    : 'No se proporcionó texto para analizar. Ingresa el contenido o las notas de la reunión en el cuadro de texto.';

  return res.status(200).json({
    success: true,
    plan: plan,
    daysRemaining: Math.ceil(EXPIRATION_DAYS - daysDiff),
    message: `Acceso concedido para el plan ${plan}. Quedan ${Math.ceil(EXPIRATION_DAYS - daysDiff)} días de acceso.`,
    analysis: `[RESULTADO DEL ANÁLISIS COMPLETO (${plan})]:\n\n${fullAnalysis}`
  });
}
