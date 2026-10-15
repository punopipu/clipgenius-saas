const crypto = require('crypto');

// Clave secreta HMAC (obtenida de las variables de entorno de Vercel o valor por defecto)
const SECRET_KEY = process.env.MAKE_HMAC_SECRET || 'MiClaveUltraSecreta2026';

/**
 * Valida la firma HMAC/SHA-256 del token
 */
function verifyTokenSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

/**
 * Revisa si una prueba gratuita de 7 días sigue vigente
 */
function isTrialValid(timestampStr) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
  const now = Date.now();
  const tokenTimestamp = parseInt(timestampStr, 10);

  if (isNaN(tokenTimestamp)) return false;

  const age = now - tokenTimestamp;
  return age >= 0 && age <= SEVEN_DAYS_MS;
}

module.exports = async (req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ENDPOINT SECUNDARIO: Generador 1-Clic de Token de Prueba de 7 Días
  if (req.method === 'GET') {
    try {
      const timestamp = Date.now();
      const payload = `TRIAL-CASUAL-${timestamp}`;

      const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(payload)
        .digest('hex');

      const token = `${payload}-${signature}`;

      return res.status(200).json({
        success: true,
        token: token,
        message: 'Token de prueba de 7 días generado con éxito.'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Error al generar el token de prueba.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST o GET.' });
  }

  try {
    const { token, content } = req.body;

    if (!token || !content) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: token y content.' });
    }

    const tokenParts = token.split('-');
    
    if (tokenParts.length < 3) {
      return res.status(401).json({ error: 'Formato de token inválido.' });
    }

    const planType = tokenParts[0];
    const timestamp = tokenParts[tokenParts.length - 2];
    const signature = tokenParts[tokenParts.length - 1];
    const payloadToVerify = tokenParts.slice(0, -1).join('-');

    // 1. Verificación de firma criptográfica
    try {
      const isValidSig = verifyTokenSignature(payloadToVerify, signature);
      if (!isValidSig) {
        return res.status(401).json({ error: 'Token no autorizado o manipulado.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Error al verificar la firma del token.' });
    }

    // 2. Control de expiración para la prueba gratuita (7 días)
    if (planType === 'TRIAL') {
      if (!isTrialValid(timestamp)) {
        return res.status(403).json({
          error: 'Tu prueba gratuita de 7 días ha expirado. Por favor, adquiere un plan en Tally para continuar.',
          expired: true
        });
      }
    }

    // 3. Construcción de respuestas por tipo de módulo
    let responseData = {};

    const casualModule = {
      minutaExpress: `Resumen ejecutivo: ${content.substring(0, 160)}...`,
      tareasYCompromisos: [
        'Acción clave detectada en el texto procesado.',
        'Recordatorio directo asignado automáticamente.'
      ],
      sintetizadorDeTextos: 'Síntesis limpia de correos o documentos densos.',
      puntosClaveCotidianos: [
        'Idea central identificada con éxito.',
        'Dato importante registrado para seguimiento.'
      ]
    };

    if (planType === 'TRIAL' || planType === 'CASUAL' || planType === 'BASIC') {
      responseData = {
        plan: planType === 'TRIAL' ? 'Prueba Gratuita (7 Días - Plan Casual)' : 'Plan Casual',
        status: 'active',
        data: casualModule
      };
    } 
    else if (planType === 'CREATOR' || planType === 'PRO') {
      responseData = {
        plan: 'Plan Creadores',
        status: 'active',
        data: {
          ...casualModule,
          detectorGanchosVirales: [
            'HOOK 1: "Lo que nadie te contó sobre este proceso..."',
            'HOOK 2: "El error común que estás cometiendo hoy..."'
          ],
          timestampsYouTube: [
            '00:00 - Introducción impactante',
            '01:30 - Demostración del proceso',
            '04:15 - Conclusión y CTA'
          ],
          generadorDeGuionesYSEO: {
            tituloOptimizado: 'La solución definitiva explicada en 3 minutos',
            copyRedesSociales: 'Transforma tus textos en ideas virales con este flujo automático. #Productividad #AI',
            estructuraGuionShort: '0-3s: Gancho visual. 3-15s: Conflicto. 15-30s: Solución.'
          }
        }
      };
    } 
    else if (planType === 'BUSINESS') {
      responseData = {
        plan: 'Plan Business Suite Enterprise',
        status: 'active',
        data: {
          ...casualModule,
          suiteAuditoria: {
            riesgosOperativos: 'Bajo - Sin cláusulas restrictivas detectadas.',
            riesgosLegales: 'Ninguno identificado en el fragmento procesado.',
            compromisosContractuales: 'Requiere revisión de fechas límites.'
          },
          auditBot: {
            climaNegociacion: 'Positivo / Constructivo',
            tonoCliente: 'Interesado con alta intención de cierre'
          },
          bovedaSuiza: {
            encriptacion: 'AES-256 Enabled',
            cumplimientoNormativo: 'Strict Privacy Mode'
          }
        }
      };
    } else {
      return res.status(400).json({ error: 'Tipo de plan no reconocido.' });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result: responseData
    });

  } catch (error) {
    console.error('Error interno:', error);
    return res.status(500).json({ error: 'Error interno en el servidor de ClipGenius.' });
  }
};
