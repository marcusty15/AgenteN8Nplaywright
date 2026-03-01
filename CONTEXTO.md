# CONTEXTO DEL PROYECTO — Agente IA Color Express
> Pegá este archivo al inicio de cualquier chat nuevo con Claude para recuperar el contexto completo.

---

## QUIÉN SOY
Marco Troconis — Ingeniero Civil + Full Stack Developer + 4 años como Gerente de Operaciones en Color Express.
Estoy construyendo un sistema de automatización con IA para Color Express y proponiéndolo a Smartier como producto replicable para otras imprentas.

---

## QUÉ ESTAMOS CONSTRUYENDO
Un bot de Telegram que atiende clientes 24/7, conversa en lenguaje natural, y genera cotizaciones reales automáticamente en Smartier (sistema de gestión para imprentas) usando Playwright.

---

## STACK TÉCNICO
- VPS Ubuntu 24 — IP: 5.78.144.199
- n8n self-hosted (puerto 5678) — orquestador del flujo
- Claude Sonnet (Anthropic) — IA conversacional dentro de n8n
- Playwright + Chromium headless — automatización web de Smartier
- Node.js + Express (puerto 3001) — servidor HTTP que ejecuta cotizar.js
- Telegram Bot API — canal de comunicación con clientes
- Smartier — sistema de gestión: https://colorex.smartier.software
- GitHub repo: https://github.com/marcusty15/AgenteN8Nplaywright

---

## ESTRUCTURA DEL VPS
- /root/agente-colorex/cotizar.js — motor de cotización (Playwright)
- /root/agente-colorex/servidor.js — servidor Express puerto 3001
- /root/github-agente/ — copia del repo para git
- Servicio systemd: colorex-servidor (servidor Express)
- Servicio systemd: n8n

---

## CREDENCIALES (confidencial)
- Smartier email: marco.troconis15@gmail.com
- Smartier password: 9c72586794
- Smartier URL: https://colorex.smartier.software
- GitHub token: REEMPLAZAR_CON_TU_TOKEN
- GitHub user: marcusty15
- Chat ID asesor Telegram: 945426409
- WhatsApp asesor: 584124255722
- Chromium path: /root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome

---

## LO QUE YA ESTÁ FUNCIONANDO
- Bot de Telegram recibe mensajes y conversa con clientes
- Buffer de 8 segundos para acumular mensajes rápidos
- AI Agent (Claude) identifica si el cliente es nuevo o existente
- Cotización automática laser: material, formato, cantidad, colores, proceso, terminaciones
- Cotización automática gigantografía: vinil y banner con Plotter UV y UV Plus
- Cobertura de tinta (Estándar) se selecciona automáticamente en proceso plotter
- Requiere aplicación de Barniz se configura para UV Plus
- Creación automática de clientes nuevos en Smartier
- Selección de moneda Euro para clientes nuevos
- Modo humano: asesor hace click en botón inline y el bot se silencia para ese cliente
- Notificación al asesor con datos del cliente y botón de handoff
- Link de WhatsApp prellenado para concretar el pedido
- Sistema de backups antes de cada cambio

---

## REGLAS DE TRABAJO QUE SEGUIMOS
1. Antes de modificar cotizar.js → siempre hacer backup:
   cp /root/agente-colorex/cotizar.js /root/agente-colorex/cotizar.backup.$(date +%Y%m%d_%H%M%S).js
2. Probar siempre con archivo de prueba antes de tocar el original
3. Cada cambio que funciona → push inmediato al repo:
   cd /root/github-agente && cp /root/agente-colorex/cotizar.js . && git add . && git commit -m "descripción" && git push
4. Documentar cada cambio en el archivo correspondiente de docs/
5. NUNCA usar heredocs largos por terminal — se cortan
6. NUNCA inventar soluciones complejas si hay una simple disponible
7. Todo se hace desde /root/agente-colorex/ (ahí está playwright instalado)

---

## CÓMO PROBAR COTIZAR.JS
Desde /root/agente-colorex/:

Laser básico:
echo '{"nombre":"Test Cliente","email":"test@test.com","telefono":"04140000000","documento":"12345678","material":"Papel Bond 20 Blanco - Láser","formato":"21x29.7","cantidad":100,"colores":["Negro"],"proceso":"Impresión láser","terminaciones":[]}' | node cotizar.js

Gigantografía vinil UV:
echo '{"nombre":"Smartier","material":"Vinil Blanco - Plotter","formato":"100x150","cantidad":5,"colores":["Negro","Cyan","Magenta","Amarillo"],"proceso":"Impresión Plotter UV - Pruebas","coberturaPlotter":"estandar","terminaciones":[{"tipo":"Corte digital - Plotter"}]}' | node cotizar.js

---

## FLUJO n8n (resumen)
Telegram Trigger → Guardar mensaje (buffer) → Wait 8s → ¿Soy el último? → Preparar input → AI Agent Claude → Parsear respuesta → IF listo=true → HTTP POST localhost:3001/cotizar → Parsear precio → Generar link WhatsApp → Responder al cliente → Notificar asesor

Trigger secundario: callback_query → Procesar click botón → modoHumano[chatId]=true → Confirmar al asesor

---

## JSON QUE ESPERA COTIZAR.JS
{
  "nombre": "Juan Pérez",
  "contacto": "04141234567",
  "cliente_nuevo": true,
  "documento": "12345678",
  "email": "juan@correo.com",
  "material": "Vinil Blanco - Plotter",
  "formato": "100x150",
  "cantidad": 5,
  "colores": ["Negro", "Cyan", "Magenta", "Amarillo"],
  "proceso": "Impresión Plotter UV",
  "coberturaPlotter": "estandar",
  "requiereBarniz": false,
  "terminaciones": [{"tipo": "Corte digital - Plotter"}],
  "quiere_concretar": false
}

---

## MATERIALES VÁLIDOS EN SMARTIER
Laser: Papel Bond 20 Blanco - Láser | Papel Bond 20 Blanco - Offset | Papel Bond Azul 20 - Riso | Papel Bond Blanco - Riso | Papel Bond Recubierto 125grs - Plotter | Glase 150 | Glase 250 | Glase 300 | Opalina | Adhesivo

Plotter: Vinil Blanco - Plotter | Vinil Blanco Promocional - Plotter | Vinil BOPP | Vinil Clear - Plotter | Vinil Clear Mate - Plotter | Vinil Clear Promocional - Plotter | Vinil Dorado – Plotter | Banner 10 oz - Plotter | Banner 13 oz - Plotter | Banner 13 oz Matte - Plotter

---

## PENDIENTES PRÓXIMOS
- Terminaciones de banner (se verán después)
- Otras terminaciones de vinil (se verán después)
- Reconocimiento de audio (Groq Whisper — pendiente API key)
- Reactivar modo humano (botón para devolver control al bot)

---

## INFORMACIÓN DE COLOR EXPRESS
- Dirección: Calle 78 (Dr. Portillo) entre Av. 17 y 18. No. 18-80. Sector Paraíso. Maracaibo, Venezuela.
- Email ventas: ventas@colorexpress.net
- Diseñador: Elvis Morles — 0424-6566147 / diseno@colorexpress.net
- Horario: L-V 8:00am-4:30pm / Sáb 8:30am-12:30pm

---

## CÓMO USAR ESTE ARCHIVO
Al abrir un chat nuevo con Claude, pegá este contenido y decí:
"Continuamos con el proyecto del agente IA de Color Express. Aquí está el contexto:"
Y pegá este archivo completo. Claude tendrá todo el contexto al instante.
