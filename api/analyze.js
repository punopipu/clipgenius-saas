import crypto from 'crypto';

const SECRET_KEY = process.env.SAAS_SECRET_KEY || "MiClaveUltraSecreta2026";
const EXPIRATION_DAYS = 30; // Días de validez de la suscripción

export default async function handler(req, res) {
  // Manejo de CORS si se requiere
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { accessCode, content } = req.body;

  if (!accessCode || typeof accessCode !== 'string') {
    return res.status(400).json({ error: 'El código de acceso es obligatorio' });
  }

  const cleanCode = accessCode.trim();

  // Estructura: PLAN-TIMESTAMP_HEX-SIGNATURE_HEX (ejemplo: BUSINESS-670e5b80-a8f9)
  const codeRegex = /^(BASIC|PRO|BUSINESS)-([a-f0-9]{8})-([a-f0-9]{6})$/i;
  const match = cleanCode.match(codeRegex);

  if (!match) {
    return res.status(401).json({ error: 'Formato de código inválido o no reconocido' });
  }

  const plan = match[1].toUpperCase();
  const hexTimestamp = match[2].toLowerCase();
  const providedSignature = match[3].toLowerCase();

  // 1. Validar la Firma HMAC para evitar códigos inventados
  const payloadToSign = `${plan}-${hexTimestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadToSign)
    .digest('hex')
    .substring(0, 6);

  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ error: 'Código de acceso no autorizado o falsificado' });
  }

  // 2. Validar Expiración de 30 Días
  const creationTimestamp = parseInt(hexTimestamp, 16) * 1000; // Convertir UNIX hex a milisegundos
  const now = Date.now();
  const daysDiff = (now - creationTimestamp) / (1000 * 60 * 60 * 24);

  if (daysDiff > EXPIRATION_DAYS) {
    return res.status(403).json({ error: 'Tu suscripción mensual ha expirado. Por favor renovar tu plan.' });
  }

  // 3. Procesamiento según el Plan
  let systemPrompt = "";
  if (plan === "BASIC") {
    systemPrompt = "Genera un resumen ejecutivo corto y extrae las 3 ideas clave.";
  } else if (plan === "PRO") {
    systemPrompt = "Genera un análisis estructurado con minutas de reunión, puntos de acción y transcripción formateada.";
  } else if (plan === "BUSINESS") {
    systemPrompt = "Genera un informe gerencial avanzado con matriz de riesgos, resumen ejecutivo, minutas estructuradas y clips clave.";
  }

  return res.status(200).json({
    success: true,
    plan: plan,
    daysRemaining: Math.ceil(EXPIRATION_DAYS - daysDiff),
    message: `Acceso concedido para el plan ${plan}. Quedan ${Math.ceil(EXPIRATION_DAYS - daysDiff)} días de acceso.`,
    analysis: `[RESULTADO DEL ANÁLISIS (${plan})]: ${content ? content.substring(0, 200) + '...' : 'Procesado con éxito.'}`
  });
}
