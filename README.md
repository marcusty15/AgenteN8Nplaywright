# 📁 Documentación — Agente IA Color Express
**Proyecto:** Departamento Digital Autónomo de Cotización  
**Cliente:** Color Express / Smartier  
**Desarrollador:** Marco Troconis  
**Última actualización:** Febrero 2026

---

## Índice de Archivos

| Archivo | Descripción |
|---|---|
| `01-arquitectura.md` | Diagrama y descripción del sistema completo |
| `02-servidor-vps.md` | Configuración del VPS y servicios |
| `03-cotizar-js.md` | Documentación de cotizar.js (Playwright) |
| `04-n8n-workflow.md` | Flujo n8n nodo por nodo |
| `05-system-prompt.md` | System prompt del agente IA (ColorBot) |
| `06-variables-config.md` | Credenciales, tokens y configuración |
| `07-pendientes.md` | Tareas pendientes y roadmap |

---

## Resumen del Sistema

El Agente IA de Color Express es un bot de Telegram que:

1. Atiende clientes 24/7 con lenguaje natural
2. Recopila datos del pedido de cotización
3. Crea clientes nuevos automáticamente en Smartier
4. Genera presupuestos reales en Smartier vía Playwright
5. Notifica al asesor con todos los datos del cliente
6. Envía al cliente un link de WhatsApp para concretar

---

## Stack Tecnológico

- **n8n** (self-hosted) — orquestador del flujo
- **Claude (Anthropic)** — modelo de IA conversacional
- **Playwright** — automatización web de Smartier
- **Telegram Bot API** — canal de comunicación con clientes
- **Node.js + Express** — servidor HTTP que ejecuta Playwright
- **VPS** — infraestructura de hosting

---

## Contacto
- Email: marco.troconis15@gmail.com
- LinkedIn: linkedin.com/in/marco-troconis-6463295b
