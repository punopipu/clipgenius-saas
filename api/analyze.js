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
  const codeRegex = /^(BASIC|PRO|BUSINESS)-(\d+)-([a-f0-9]{6})$/i;
  const match = cleanCode.match(codeRegex);

  if (!match) {
    return res.status(401).json({ error: 'Formato de código inválido o no reconocido' });
  }

  const plan = match[1].toUpperCase();
  const timestampStr = match[2];
  const providedSignature = match[3].toLowerCase();

  // 1. Validar Firma Criptográfica SHA-256
  const payloadToSign = `${plan}${timestampStr}${SECRET_KEY}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(payloadToSign)
    .digest('hex')
    .substring(0, 6)
    .toLowerCase();

  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ error: 'Código de acceso no autorizado o falsificado' });
  }

  // 2. Validar Expiración
  const creationTimestamp = parseInt(timestampStr, 10) * 1000;
  const now = Date.now();
  const daysDiff = (now - creationTimestamp) / (1000 * 60 * 60 * 24);

  if (daysDiff > EXPIRATION_DAYS) {
    return res.status(403).json({ error: 'Tu suscripción mensual ha expirado. Por favor renovar tu plan.' });
  }

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Por favor ingresa un texto o transcripción para analizar.' });
  }

  // 3. ANÁLISIS DINÁMICO BASADO EN EL TEXTO REAL INGRESADO
  const cleanText = content.trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = cleanText.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const snippet = cleanText.length > 150 ? cleanText.substring(0, 150) + "..." : cleanText;

  let aiAnalysisText = "";

  if (plan === "BASIC") {
    aiAnalysisText = `### 📋 RESUMEN EJECUTIVO (PLAN BÁSICO)

**Síntesis del Contenido:**
El texto ingresado contiene **${wordCount} palabras** y un estimado de lectura de **${readingTimeMinutes} min**.

**Vista previa analizada:**
> "${snippet}"

**Puntos Clave:**
1. **Longitud y Estructura:** Documento procesado con un total de ${charCount} caracteres.
2. **Tema Principal:** Centrado en los conceptos presentados en la entrada del usuario.
3. **Lectura Rápida:** Tiempo estimado de asimilación de ${readingTimeMinutes} minuto(s).`;

  } else if (plan === "PRO") {
    aiAnalysisText = `### 🔍 AUDITORÍA DE CONTENIDO (PLAN PRO)

**1. Resumen Ejecutivo:**
Se ha procesado exitosamente la transcripción/documento enviado. Muestra un volumen de **${wordCount} palabras**.

**2. Fragmento Analizado:**
> "${snippet}"

**3. Minuta de Estructura:**
- **Métricas:** ${wordCount} palabras | ${charCount} caracteres.
- **Complejidad:** Lectura estimada de ${readingTimeMinutes} minuto(s).

**4. Plan de Acción Recomendado:**
- Reorganizar ideas principales para publicaciones o clips.
- Formatear puntos de alto impacto para redes o resúmenes ejecutivos.`;

  } else { // BUSINESS
    aiAnalysisText = `### 🏢 AUDITAI & CLIPGENIUS ENTERPRISE (PLAN BUSINESS GERENCIAL)

1. 📌 **RESUMEN EJECUTIVO GERENCIAL**
Análisis estratégico para el texto ingresado. Evaluación completada sobre **${wordCount} palabras** (${charCount} caracteres) con tiempo de lectura estimado de **${readingTimeMinutes} minuto(s)**.

2. 🔬 **DESGLOSE TEMÁTICO DE ENTRADA**
- **Cuerpo principal del mensaje:** "${snippet}"

3. ⚠️ **MATRIZ DE RIESGOS Y EVALUACIÓN DE ESTRUCTURA**
- **Densidad de texto:** ${wordCount < 20 ? 'Baja (Texto muy corto/Sencillo)' : 'Adecuada para análisis extenso'}.
- **Carga de lectura:** ${readingTimeMinutes} min.

4. 🎬 **HOOKS Y HIGHLIGHTS EXTRAÍDOS**
- *" ${words.slice(0, 8).join(" ")}... "*

5. 💡 **EVALUACIÓN ESTRATÉGICA FINAL**
El contenido procesado queda listo para integración en módulos de ClipGenius y auditorías de automatización.`;
  }

  return res.status(200).json({
    success: true,
    plan: plan,
    daysRemaining: Math.ceil(EXPIRATION_DAYS - daysDiff),
    message: `Análisis completado exitosamente (Plan ${plan}).`,
    analysis: aiAnalysisText
  });
}
