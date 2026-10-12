import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPTS = {
  basic: `Eres ClipGenius AI (Plan Básico). Resumen ejecutivo corto, 3-5 timestamps [MM:SS] principales y 3 conclusiones clave.`,
  pro: `Eres ClipGenius AI (Plan Pro Creador). Genera capítulos detallados con timestamps, 3-5 ganchos virales para Shorts/Reels/TikToks y kit para redes sociales.`,
  business: `Eres AuditAI Enterprise. Realiza auditoría de riesgos (🔴 Alto, 🟡 Medio, 🟢 Bajo), desglose financiero y minutas de acuerdos.`
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { userPlan, fileData, mimeType } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const promptSeleccionado = SYSTEM_PROMPTS[userPlan] || SYSTEM_PROMPTS.basic;

    const result = await model.generateContent([
      promptSeleccionado,
      {
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    return res.status(200).json({ success: true, analysis: response.text() });
  } catch (error) {
    return res.status(500).json({ error: "Ocurrió un error al procesar el archivo." });
  }
}
