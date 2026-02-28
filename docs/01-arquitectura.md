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
        │
        ▼
[Wait: 8 segundos]
        │
        ▼
[Code: ¿Soy el último?]
  • Si hay mensaje más reciente → detiene
  • Si es el último → continúa
        │
        ▼
[AI Agent — Claude]
  • Memoria por sessionId
  • Devuelve JSON estructurado
        │
        ├─── listo = false → [Hacer Pregunta] → [Notificar Asesor]
        │
        ▼
[HTTP POST localhost:3001/cotizar]
  → servidor.js → cotizar.js → Playwright → Smartier
        │
        ▼
[Parsear Precio] → [Generar Link WhatsApp]
        │
        ▼
[Responder al cliente] → [Notificar Asesor]
```

## Flujo Secundario — Botón del asesor
```
Asesor click "Silenciar bot"
→ Telegram callback_query
→ modoHumano[chatId] = true
→ Bot se silencia para ese cliente
```

## Stack
- n8n puerto 5678
- Servidor cotizador puerto 3001 (colorex-servidor.service)
- Chromium headless via Playwright
