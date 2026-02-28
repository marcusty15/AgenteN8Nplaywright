# 07 — Pendientes y Roadmap

## ✅ Completado

- [x] Bot de Telegram funcional con AI Agent (Claude)
- [x] Buffer de 8 segundos para acumular mensajes
- [x] Sistema de modo humano (botón inline para asesor)
- [x] Cotización automática vía Playwright + Smartier
- [x] Creación automática de cliente nuevo en Smartier
- [x] Selección de moneda Euro para clientes nuevos
- [x] Notificación al asesor con datos completos
- [x] Link WhatsApp prellenado para concretar pedido
- [x] Mapeo de materiales (nombres coloquiales → nombres Smartier)
- [x] System prompt con flujo de identificación (nuevo/existente)
- [x] Fix: md-scroll-mask intercepta clicks (Playwright)
- [x] Fix: timeout con execSync → migrado a spawn
- [x] Documentación completa del proyecto

---

## 🔄 En Progreso

- [ ] Catálogo completo de materiales de Smartier mapeados
- [ ] Reconocimiento de audio (notas de voz de Telegram)
  - Solución identificada: Groq Whisper (gratuito)
  - Pendiente: obtener API key de Groq

---

## 📋 Roadmap Futuro

### Prioridad Alta
- [ ] **Reconocimiento de voz** — Groq Whisper para transcribir notas de voz
- [ ] **Mapeo completo de materiales** — necesita revisión manual en Smartier
- [ ] **Manejo de errores mejorado** — reintentos automáticos si Smartier falla
- [ ] **Reactivar modo humano** — botón para que el asesor devuelva el control al bot

### Prioridad Media
- [ ] **Cotización de banners/vinil** — integración con módulo de plotter en Smartier
- [ ] **Cotización de tarjetas** — flujo específico para kits básico/estándar
- [ ] **Horario automático** — respuesta diferente fuera de horario laboral
- [ ] **Manejo de imágenes** — cuando el cliente envía foto del diseño
- [ ] **Multi-idioma** — soporte para clientes que escriben en inglés

### Prioridad Baja / Fase 3
- [ ] **Arquitectura multi-cliente** — un solo servidor para múltiples empresas Smartier
- [ ] **Panel de administración** — dashboard para ver conversaciones y estadísticas
- [ ] **Agente de seguimiento post-venta** — recordatorios y estados de pedidos
- [ ] **Integración WhatsApp Business API** — canal adicional además de Telegram
- [ ] **Sistema de onboarding automático** para nuevos clientes de Smartier

---

## 🐛 Bugs Conocidos

| Bug | Estado | Descripción |
|---|---|---|
| Email requerido para cliente nuevo | Workaround aplicado | Smartier requiere email. Si el cliente no da email, se genera uno automático `nombre@cliente.com` |
| Groq Whisper no disponible | Pendiente | Audio no transcribible hasta tener API key de Groq |

---

## 📝 Notas Técnicas

### Sobre el campo producto en Smartier
Actualmente siempre se selecciona "Impresion" como producto al crear el presupuesto. Para banners/plotter habría que agregar lógica para seleccionar "Impresiones varias" u otro producto según el tipo de trabajo.

### Sobre el campo moneda
Al crear clientes nuevos siempre se fuerza Euros. Esto es correcto para Color Express ya que todos sus precios son en €.

### Sobre el buffer de 8 segundos
Este tiempo es configurable. Si los clientes tienden a escribir más rápido o más lento, ajustar en el nodo Wait.

### Sobre la memoria del AI Agent
Se usa Simple Memory by sessionId. Esto significa que la memoria persiste mientras n8n esté corriendo, pero se pierde si se reinicia. Para persistencia real se necesitaría integrar con una base de datos externa.
