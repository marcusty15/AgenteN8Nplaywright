# 04 — Workflow n8n

## Estructura General

El workflow principal tiene **2 triggers** independientes:
1. **Trigger de mensajes** — maneja la conversación con el cliente
2. **Trigger de callback_query** — maneja el botón del asesor

---

## Nodo 1: Telegram Trigger (mensaje)

**Tipo:** Telegram Trigger  
**Evento:** `message`  
**Descripción:** Recibe todos los mensajes de texto del bot de Telegram.

---

## Nodo 2: Code — Guardar mensaje

**Tipo:** Code (JavaScript)  
**Descripción:** Buffer de 8 segundos para acumular mensajes rápidos. Verifica modo humano.

```javascript
const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json;
const chatId = String(msg.message?.chat?.id || msg.chat?.id || '');
const texto = msg.message?.text || msg.text || '';

if (!staticData.mensajes) staticData.mensajes = {};
if (!staticData.timestamps) staticData.timestamps = {};
if (!staticData.modoHumano) staticData.modoHumano = {};

// Si bot silenciado para este cliente → detener
if (staticData.modoHumano[chatId]) {
  return [{ json: { continuar: false, chatId, razon: 'modo_humano' } }];
}

// Acumular mensajes
if (!staticData.mensajes[chatId]) staticData.mensajes[chatId] = [];
staticData.mensajes[chatId].push(texto);
staticData.timestamps[chatId] = Date.now();

return [{ json: { continuar: true, chatId, timestamp: staticData.timestamps[chatId] } }];
```

---

## Nodo 3: Wait — 8 segundos

**Tipo:** Wait  
**Duración:** 8 segundos  
**Descripción:** Pausa para que lleguen mensajes adicionales del cliente antes de procesar.

---

## Nodo 4: Code — ¿Soy el último?

**Tipo:** Code (JavaScript)  
**Descripción:** Verifica si este es el mensaje más reciente. Si llegó uno nuevo mientras esperaba, descarta este.

```javascript
const staticData = $getWorkflowStaticData('global');
const { chatId, timestamp } = $input.first().json;

if (!$input.first().json.continuar) {
  return [{ json: { continuar: false } }];
}

const tsActual = staticData.timestamps[chatId];
if (tsActual !== timestamp) {
  return [{ json: { continuar: false, razon: 'hay_mensaje_mas_reciente' } }];
}

const mensajes = staticData.mensajes[chatId] || [];
staticData.mensajes[chatId] = [];

return [{ json: { continuar: true, chatId, mensajes } }];
```

---

## Nodo 5: If — ¿Continuar?

**Tipo:** If  
**Condición:** `continuar === true`  
**Rama TRUE:** sigue al AI Agent  
**Rama FALSE:** termina el flujo silenciosamente

---

## Nodo 6: Code — Preparar chatInput

**Tipo:** Code (JavaScript)  
**Descripción:** Convierte el array de mensajes en texto para el AI Agent.

```javascript
const { chatId, mensajes } = $input.first().json;
const chatInput = mensajes.join(' ');
return [{ json: { chatInput, sessionId: chatId } }];
```

---

## Nodo 7: AI Agent (Claude)

**Tipo:** AI Agent  
**Modelo:** Claude (Anthropic)  
**Memoria:** Simple Memory by sessionId  
**Session ID:** `{{ $json.sessionId }}`  
**Input:** `{{ $json.chatInput }}`  
**System Prompt:** Ver archivo `05-system-prompt.md`

---

## Nodo 8: Code — Parsear Respuesta

**Tipo:** Code (JavaScript)  
**Descripción:** Extrae el JSON del output del agente y mapea materiales.

```javascript
const response = $input.first().json;
const content = response.output || '';
let datos;
try {
  datos = JSON.parse(content);
} catch(e) {
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try { datos = JSON.parse(match[0]); }
    catch(e2) { datos = null; }
  }
}
if (!datos) {
  return [{ json: {
    listo: false, quiere_concretar: false, pregunta: content,
    nombre: null, contacto: null, es_texto_plano: true
  }}];
}
const procesoMap = {
  'laser': 'Impresión láser',
  'impresion laser': 'Impresión láser',
  'impresión láser': 'Impresión láser',
  'plotter': 'Impresión plotter',
  'impresion plotter': 'Impresión plotter'
};
if (datos.listo && datos.proceso) {
  datos.proceso = procesoMap[datos.proceso.toLowerCase()] || datos.proceso;
}
datos.listo = datos.listo || false;
datos.nombre = datos.nombre || null;
datos.contacto = datos.contacto || null;
datos.quiere_concretar = datos.quiere_concretar || false;
datos.es_texto_plano = false;
return [{ json: datos }];
```

---

## Nodo 9: If — ¿Tiene datos?

**Tipo:** If  
**Condición:** `listo === true`  
**Rama TRUE:** ir a cotización automática  
**Rama FALSE:** ir a Hacer Pregunta

---

## Nodo 10: HTTP Request — POST /cotizar

**Tipo:** HTTP Request  
**Método:** POST  
**URL:** `http://localhost:3001/cotizar`  
**Body:** Todo el JSON de Parsear Respuesta  
**Descripción:** Llama al servidor Playwright para generar el presupuesto.

---

## Nodo 11: Code — Parsear Precio

**Tipo:** Code (JavaScript)  
**Descripción:** Extrae precio y número de presupuesto de la respuesta del servidor.

```javascript
const res = $input.first().json;
return [{ json: {
  precio: res.precio || null,
  numeroPresupuesto: res.numeroPresupuesto || null,
  exito: res.exito || false
}}];
```

---

## Nodo 12: Code — Generar Link WhatsApp

**Tipo:** Code (JavaScript)  
**Descripción:** Arma el link de WhatsApp con mensaje prellenado para que el cliente contacte al asesor.

```javascript
const nombre = $('Parsear Respuesta').item.json.nombre || 'cliente';
const presupuesto = $('Parsear Precio').item.json.numeroPresupuesto || null;
const precio = $('Parsear Precio').item.json.precio || null;

let mensaje = `Hola! 👋 Mi nombre es ${nombre} y me comunico desde el bot de Color Express.`;
if (presupuesto) {
  mensaje += ` Estoy interesado en concretar mi pedido con el presupuesto N° ${presupuesto}`;
  if (precio) mensaje += ` por un valor de ${precio} + IVA`;
  mensaje += `.`;
}
mensaje += ` Me gustaría coordinar los detalles para completar mi compra. 🙏`;

const linkWhatsapp = `https://wa.me/584124255722?text=${encodeURIComponent(mensaje)}`;
return [{ json: { linkWhatsapp, nombre, presupuesto, precio } }];
```

---

## Nodo 13: Telegram — Responder Precio

**Tipo:** Telegram (sendMessage)  
**Descripción:** Envía el precio y link de WhatsApp al cliente.

Mensaje ejemplo:
```
✅ ¡Listo! Tu presupuesto está generado:

💰 Precio: € 20,48 + IVA
📋 Presupuesto N°: 30958

👇 Para concretar tu pedido, contacta a nuestro asesor:
https://wa.me/584124255722?text=...
```

---

## Nodo 14: Code — Preparar Notificación

**Tipo:** Code (JavaScript)  
**Descripción:** Arma el mensaje de notificación para el asesor con todos los datos del cliente.

```javascript
let nombre = 'No proporcionado';
let contacto = 'No proporcionado';
let presupuesto = null;
let precio = null;
let chatId = null;

try {
  const pr = $('Parsear Respuesta').item.json;
  nombre = pr.nombre || 'No proporcionado';
  contacto = pr.contacto || 'No proporcionado';
  chatId = pr.chat_id || null;
} catch(e) {}

try {
  const pp = $('Parsear Precio').item.json;
  presupuesto = pp.numeroPresupuesto || null;
  precio = pp.precio || null;
} catch(e) {}

if (!chatId) {
  try { chatId = $('Code in JavaScript2').item.json.sessionId; }
  catch(e) {}
}

let mensaje = `🔔 Cliente listo para concretar\n\n`;
mensaje += `👤 Nombre: ${nombre}\n`;
mensaje += `📞 Contacto: ${contacto}\n`;
if (presupuesto) mensaje += `📋 Presupuesto N°: ${presupuesto}\n`;
if (precio) mensaje += `💰 Precio: ${precio} + IVA\n`;
mensaje += `🆔 Chat ID: ${chatId}`;

return [{ json: { mensaje, chatId, callbackData: `humano_on_${chatId}` } }];
```

---

## Nodo 15: Telegram — Notificar Asesor

**Tipo:** Telegram (sendMessage)  
**Chat ID del asesor:** `945426409`  
**Inline keyboard:** Botón "🔇 Silenciar bot para este cliente"  
**Callback data:** `humano_on_{chatId}`

---

## Nodo 16: Telegram — Hacer Pregunta

**Tipo:** Telegram (sendMessage)  
**Descripción:** Envía la siguiente pregunta al cliente cuando el agente aún necesita más datos.

---

## Trigger Secundario: Callback Query

### Nodo A: Telegram Trigger (callback_query)
Recibe clicks en botones inline.

### Nodo B: Code — Procesar Click
```javascript
const data = $input.first().json.callback_query?.data || '';
if (data.startsWith('humano_on_')) {
  const chatId = data.replace('humano_on_', '');
  const staticData = $getWorkflowStaticData('global');
  if (!staticData.modoHumano) staticData.modoHumano = {};
  staticData.modoHumano[chatId] = true;
  return [{ json: { ok: true, chatId, accion: 'bot_silenciado' } }];
}
return [{ json: { ok: false } }];
```

### Nodo C: Telegram — Confirmar al Asesor
Responde al asesor: "✅ Bot silenciado para este cliente. Podés tomar el control."

---

## Variables de Entorno / Configuración en n8n

| Variable | Descripción |
|---|---|
| Telegram Bot Token | Token del bot de Telegram |
| Anthropic API Key | Key para Claude |
| Chat ID Asesor | `945426409` |
| WhatsApp Asesor | `584124255722` |
| URL Servidor | `http://localhost:3001` |
