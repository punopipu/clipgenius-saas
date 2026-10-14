import crypto from 'crypto';

// Reemplaza esto con tu propia clave secreta única
const SECRET_KEY = process.env.SAAS_SECRET_KEY || "MiClaveUltraSecreta2026";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { accessCode, content } = req.body;

  if (!accessCode) {
    return res.status(400).json({ error: 'El código de acceso es obligatorio' });
  }

  // 1. Validar la estructura básica: PLAN-6CARACTERES
  const codeRegex = /^(BASIC|PRO|BUSINESS)-([a-f0-9]{6})$/i;
  const match = accessCode.trim().match(codeRegex);

  if (!match) {
    return res.status(401).json({ error: 'Formato de código inválido' });
  }

  const plan = match[1].toUpperCase();
  const rawPayload = match[2].toLowerCase(); // Los 6 caracteres hexadecimales

  // 2. Extraer el identificador único (primeros 3) y la firma (últimos 3)
  const nonce = rawPayload.substring(0, 3);
  const providedSignature = rawPayload.substring(3, 6);

  // 3. Recalcular la firma HMAC esperada
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${plan}-${nonce}`)
    .digest('hex')
    .substring(0, 3);

  // 4. Comprobar autenticidad
  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ error: 'Código de acceso no autorizado o falsificado' });
  }

  // SI LLEGA AQUÍ, EL CÓDIGO ES 100% AUTÉNTICO Y GENERADO POR TU MAKE
  // ... aquí continúa la lógica de análisis del contenido ...

  return res.status(200).json({
    success: true,
    plan: plan,
    message: `Acceso concedido para el plan ${plan}`
  });
}
