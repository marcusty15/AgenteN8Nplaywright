# 01 — Arquitectura del Sistema

## Diagrama de Flujo Principal

```
Cliente escribe en Telegram
        │
        ▼
[Telegram Trigger] — recibe mensaje de texto
        │
        ▼
[Code: Guardar mensaje]
  • Acumula mensajes en buffer por chat_id
  • Verifica si el bot está en modo humano para ese chat
  • Si modo humano → detiene el flujo
  • Guarda timestamp del mensaje
        │
        ▼
[Wait: 8 segundos]  ← buffer para acumular mensajes rápidos
        │
        ▼
[Code: ¿Soy el último?]
  • Compara timestamp actual con el guardado
  • Si hay un mensaje más reciente → detiene (otro lo procesará)
  • Si es el último → continúa
        │
        ▼
[Code: Preparar chatInput]
  • Concatena todos los mensajes del buffer
  • Arma el input para el AI Agent
        │
        ▼
[AI Agent — Claude]
  • Memoria simple por sessionId (chat_id)
  • Recibe historial de conversación
  • Devuelve JSON estructurado
        │
        ▼
[Code: Parsear Respuesta]
  • Extrae JSON del output del agente
  • Mapea nombres de materiales a nombres exactos de Smartier
  • Determina si listo=true o listo=false
        │
        ├─── listo = false ──────────────────────────────────────┐
        │                                                         │
        ▼                                                         ▼
[If: ¿Tiene datos?]                                    [Hacer Pregunta]
  listo === true                                    Telegram sendMessage
        │                                                         │
        ▼                                                         ▼
[HTTP Request POST]                              [Code: Preparar Notificación]
  localhost:3001/cotizar                          (notif sin precio/presupuesto)
  → servidor.js → cotizar.js                               │
  → Playwright → Smartier                                  ▼
        │                                     [Telegram: Notificar Asesor]
        ▼
[Code: Parsear Precio]
  Extrae precio y numeroPresupuesto
        │
        ▼
[Code: Generar Link WhatsApp]
  Arma mensaje prellenado con
  nombre, presupuesto y precio
        │
        ▼
[Telegram: Responder Precio]
  Envía precio + link WhatsApp al cliente
        │
        ▼
[Code: Preparar Notificación]
  Arma mensaje para el asesor
        │
        ▼
[Telegram: Notificar Asesor]
  chat_id: 945426409
  Mensaje con datos del cliente
  Botón inline: "🔇 Silenciar bot"
```

---

## Flujo Secundario — Callback Query (botón del asesor)

```
Asesor hace click en "🔇 Silenciar bot para este cliente"
        │
        ▼
[Telegram Trigger — callback_query]
        │
        ▼
[Code: Procesar Click]
  • Extrae chat_id del cliente del callback_data
  • Activa modoHumano[chatId] = true en staticData
        │
        ▼
[Telegram: Confirmar al Asesor]
  "✅ Bot silenciado para este cliente"
```

---

## Arquitectura del Servidor (VPS)

```
n8n (puerto 5678)
    │
    │ HTTP POST localhost:3001/cotizar
    ▼
servidor.js (Express — puerto 3001)
    │
    │ spawn('node', ['cotizar.js'])
    │ stdin ← datos JSON
    ▼
cotizar.js (Playwright)
    │
    │ Browser headless
    ▼
Smartier (colorex.smartier.software)
    │
    └── Login
    └── Nuevo presupuesto
    └── Buscar/Crear cliente
    └── Seleccionar producto
    └── Llenar formulario
    └── Cotizar
    └── Retorna precio + N° presupuesto
```

---

## Componentes de Infraestructura

| Componente | Ubicación | Puerto | Servicio systemd |
|---|---|---|---|
| n8n | VPS `/root/.n8n` | 5678 | `n8n` |
| Servidor cotizador | VPS `/root/agente-colorex/servidor.js` | 3001 | `colorex-servidor` |
| Chromium (Playwright) | VPS `/root/.cache/ms-playwright/` | — | — |

---

## Datos que fluyen por el sistema

### Input del cliente → AI Agent
```
Texto libre en lenguaje natural
```

### AI Agent → cotizar.js (cuando listo=true)
```json
{
  "listo": true,
  "cliente_nuevo": false,
  "nombre": "Juan Pérez",
  "contacto": "04141234567",
  "documento": "12345678",
  "email": "juan@correo.com",
  "material": "Papel Bond 20 Blanco - Láser",
  "formato": "21x29.7",
  "cantidad": 100,
  "colores": ["Negro"],
  "proceso": "Impresión láser",
  "terminaciones": [],
  "quiere_concretar": false
}
```

### cotizar.js → n8n (respuesta)
```json
{
  "precio": "€ 20,48",
  "numeroPresupuesto": "30958",
  "exito": true
}
```
