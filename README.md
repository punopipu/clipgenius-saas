🚀 ClipGenius AI & AuditAI — Multimodal Intelligence Engine
Un SaaS híbrido (B2C / B2B) impulsado por la API de Google Gemini (1.5 / 2.0 Flash) que analiza videos largos, audios y documentos para extraer marcas de tiempo clave, generar resúmenes ejecutivos y detectar momentos de alto impacto o riesgo.

🌟 Características Principales
📱 Módulo B2C (ClipGenius AI)
Detección Automática de Clips Virales: Analiza podcasts, transmisiones y videos de larga duración para extraer los mejores momentos.

Marcas de Tiempo Inteligentes: Identifica inicio y fin de cada tema clave con puntuación de interés/retención.

Exportación de Subtítulos y Formato: Estructura lista para convertir contenido a formato vertical (9:16) para TikTok, Reels y Shorts.

🏢 Módulo B2B (AuditAI)
Auditoría de Cumplimiento y Seguridad: Procesa grabaciones de video operativas, llamadas de ventas o capacitaciones para detectar infracciones o puntos críticos.

Resúmenes Ejecutivos en JSON: Salida estructurada ideal para integración con bases de datos y flujos de trabajo corporativos.

Soporte de Contexto Masivo: Procesa archivos multimedia extensos en una sola llamada de API sin pérdida de contexto.

🛠️ Tecnologías Utilizadas
IA / LLM: Google AI Studio — Gemini API (gemini-1.5-flash / gemini-2.0-flash)

Frontend: HTML5, Tailwind CSS, JavaScript (ES6+) / Next.js

Backend & Auth: Firebase / Node.js

Despliegue: Vercel

⚙️ Configuración e Instalación Local
Clonar el repositorio:

Bash
git clone https://github.com/punopipu/clipgenius-saas.git
cd clipgenius-saas
Configurar las variables de entorno:
Crea un archivo .env en la raíz del proyecto y agrega tu clave de API de Google AI Studio:

Fragmento de código
GEMINI_API_KEY=tu_api_key_aqui
Abrir o ejecutar el proyecto:

Si es un sitio estático: Abre index.html en tu navegador o usa una extensión como Live Server.

Si usas Node.js / React:

Bash
npm install
npm run dev
🔒 Variables de Entorno en Vercel
Al desplegar en Vercel, asegúrate de agregar la siguiente variable de entorno en el panel de configuración:

Variable	Valor
GEMINI_API_KEY	Tu clave secreta de Google AI Studio
📄 Licencia
Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.
