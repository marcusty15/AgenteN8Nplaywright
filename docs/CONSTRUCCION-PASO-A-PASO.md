# 🏗️ Cómo construimos el Agente IA de Color Express — De cero a producción

**Autor:** Marco Troconis  
**Proyecto:** Agente IA de Cotización Automática para Imprentas  
**Stack:** n8n + Claude (Anthropic) + Playwright + Telegram + Smartier  
**Tiempo total de construcción:** ~3 semanas de desarrollo iterativo

---

## ¿Qué es esto?

Un bot de Telegram que atiende clientes de una imprenta 24/7, entiende lo que necesitan en lenguaje natural, y genera cotizaciones reales automáticamente en el sistema de gestión Smartier — sin que ningún humano tenga que intervenir.

**Resultado final:** El cliente escribe por Telegram, el bot conversa, recopila datos, abre el navegador en segundo plano, navega Smartier, genera el presupuesto y responde con el precio en euros. Todo en menos de 30 segundos.

---

## FASE 1 — Infraestructura Base

### Paso 1: Contratar un VPS

Necesitás un servidor Linux donde corran todos los servicios.

**Especificaciones mínimas recomendadas:**
- 2 vCPU
- 4 GB RAM
- 50 GB SSD
- Ubuntu 22.04 o 24.04

**¿Por qué VPS y no cloud functions?**
Playwright necesita un navegador real corriendo en segundo plano. Las funciones serverless no soportan esto. Necesitás un servidor persistente.

---

### Paso 2: Instalar n8n (self-hosted)

n8n es el cerebro del flujo. Conecta todos los servicios entre sí.

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar n8n globalmente
npm install -g n8n

# Crear servicio systemd para que arranque solo
cat > /etc/systemd/system/n8n.service << 'EOF'
[Unit]
Description=n8n
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/n8n start
Restart=on-failure
Environment=N8N_PORT=5678

[Install]
WantedBy=multi-user.target
EOF

systemctl enable n8n
systemctl start n8n
```

Accedé a n8n en: `http://TU_IP:5678`

---

### Paso 3: Instalar Playwright y Chromium

Playwright es la librería que controla el navegador automáticamente.

```bash
mkdir -p /root/agente-colorex
cd /root/agente-colorex
npm init -y
npm install playwright express

# Descargar Chromium (el navegador que usará Playwright)
npx playwright install chromium

# Verificar la ruta del ejecutable (la necesitarás después)
find /root/.cache/ms-playwright -name "chrome" -type f
```

---

### Paso 4: Crear el bot de Telegram

1. Abrí Telegram y buscá `@BotFather`
2. Escribí `/newbot`
3. Dale un nombre y un username
4. Copiá el **token** que te da — lo necesitarás en n8n
5. Buscá tu propio chat_id enviando un mensaje al bot y consultando:
   `https://api.telegram.org/botTU_TOKEN/getUpdates`

---

### Paso 5: Obtener API Key de Anthropic (Claude)

1. Andá a `console.anthropic.com`
2. Creá una cuenta
3. En **API Keys** → **Create Key**
4. Copiá la key — la necesitarás en n8n
5. **Plan recomendado:** Claude Max (USD 200/mes) para uso intensivo

---

## FASE 2 — El Motor de Cotización (cotizar.js)

Este fue el componente más complejo. Es el script que abre el navegador, navega Smartier y genera el presupuesto.

### Paso 6: Entender la estructura de Smartier

Antes de escribir una sola línea de código, navegá Smartier manualmente y documentá:
- ¿Qué campos tiene el formulario de nuevo presupuesto?
- ¿Cómo se llaman los inputs? (usar DevTools del navegador → F12 → Inspector)
- ¿Qué dropdowns aparecen y en qué orden?
- ¿Qué pasa cuando seleccionás cada proceso?

**Lo que encontramos en Smartier:**
- Campo cliente: autocomplete — si no existe, aparece botón `+` para crear
- Campo producto: `Impresion` para láser, otros para plotter
- Campo sustrato: `input[name="sustrato"]`
- Campo formato: `input[name="formatoFinal"]`
- Campo cantidad: `input[name="Cantidad"]`
- Colores: autocomplete con `input[placeholder="Buscar color"]`
- Proceso: autocomplete con `input[placeholder="Buscar proceso"]`
- Terminaciones: autocomplete con `input[placeholder="Buscar terminaciones"]`

### Paso 7: Escribir cotizar.js — Primera versión

La primera versión era simple: login, navegar al formulario, llenar campos, cotizar.

```javascript
const { chromium } = require('playwright');

async function cotizar(datos) {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
    headless: true, // Sin interfaz gráfica
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await (await browser.newContext()).newPage();
  
  // Login
  await page.goto('https://colorex.smartier.software/#/login');
  await page.fill('#email', 'TU_EMAIL');
  await page.fill('#pass', 'TU_PASSWORD');
  await page.click('button:has-text("INGRESAR")');
  await page.waitForTimeout(4000);
  
  // ... resto del formulario
}
```

### Paso 8: Resolver el problema del md-scroll-mask

**Problema:** Angular Material ponía un overlay invisible (`md-scroll-mask`) que interceptaba todos los clicks.

**Síntoma:** Los clicks no funcionaban, Playwright decía que el elemento estaba cubierto.

**Solución:**
```javascript
await page.evaluate(() => {
  const mask = document.querySelector('.md-scroll-mask');
  if (mask) mask.remove();
});
```

Esta línea se agregó en múltiples puntos del flujo.

### Paso 9: Crear la función selectFromDropdown

Los autocompletes de Smartier necesitaban una función especial:

```javascript
async function selectFromDropdown(page, input, texto) {
  await input.click();
  await input.fill('');
  await input.type(texto, { delay: 50 }); // delay para simular escritura humana
  await page.waitForTimeout(2500); // esperar que cargue el dropdown
  await page.evaluate((t) => {
    const items = document.querySelectorAll('li[role="option"]');
    for (const item of items) {
      if (item.innerText.toLowerCase().includes(t.toLowerCase()) 
          && !item.innerText.toLowerCase().includes("servicio")) {
        item.click(); return;
      }
    }
    if (items[0]) items[0].click(); // fallback: primera opción
  }, texto);
}
```

### Paso 10: Resolver el problema de execSync vs spawn

**Problema:** La primera versión usaba `execSync` para llamar el script desde el servidor. Esto bloqueaba el event loop de Node.js y causaba timeouts.

**Solución:** Migrar a `spawn` con manejo de streams:

```javascript
// ❌ MALO - bloquea el event loop
const result = execSync(`echo '${datos}' | node cotizar.js`);

// ✅ BUENO - asíncrono con spawn
const child = spawn('node', ['cotizar.js'], { timeout: 180000 });
child.stdin.write(JSON.stringify(datos));
child.stdin.end();
child.stdout.on('data', d => output += d);
child.on('close', () => res.json(JSON.parse(output)));
```

### Paso 11: Agregar creación automática de clientes nuevos

Cuando el nombre del cliente no aparece en el dropdown, hay que crearlo. Esto requirió:

1. Detectar si el dropdown está vacío después de escribir el nombre
2. Hacer click en el botón `+` (ícono `add`)
3. Seleccionar "Nuevo contacto" del mini popup
4. Llenar: nombre, documento, email, teléfono
5. Scroll hasta encontrar el campo Moneda → seleccionar Euro
6. Click en GUARDAR

```javascript
const opcionesCliente = await page.locator('li[role="option"]').count();
if (opcionesCliente > 0) {
  // Cliente existe → seleccionar
  await page.evaluate(() => {
    const li = document.querySelector('li[role="option"]');
    if (li) li.click();
  });
} else {
  // Cliente nuevo → crear
  await crearContactoNuevo(page, datos);
}
```

### Paso 12: Agregar soporte para Gigantografía (Plotter UV)

Al seleccionar proceso "Impresión Plotter UV", Smartier muestra un nuevo campo: **Cobertura de tinta**.

Para UV Plus también aparece: **Requiere aplicación de Barniz**.

```javascript
async function configurarProcesoPlotter(page, datos) {
  const esUVPlus = (datos.proceso || '').toLowerCase().includes('plus');
  
  // Cobertura de tinta — aparece en UV y UV Plus
  const selectCobertura = page.locator('md-select[aria-label="Cobertura de tinta"]').first();
  if (await selectCobertura.count() > 0) {
    await selectCobertura.click();
    await page.waitForTimeout(1000);
    // Seleccionar Estándar
    await page.evaluate(() => {
      const items = document.querySelectorAll('md-option');
      for (const item of items) {
        if (item.innerText.toLowerCase().includes('estandar')) { item.click(); return; }
      }
    });
  }

  // Barniz — solo UV Plus
  if (esUVPlus) {
    const selectBarniz = page.locator('md-select[aria-label="Requiere aplicación de Barniz"]').first();
    if (await selectBarniz.count() > 0) {
      await selectBarniz.click();
      // Seleccionar según datos.requiereBarniz
    }
  }
}
```

**Cómo descubrimos los aria-label correctos:** Usamos scripts de inspección que abren el browser, navegan hasta el estado deseado y extraen todos los atributos de los elementos:

```javascript
const info = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('md-select')).map(s => ({
    ariaLabel: s.getAttribute('aria-label'),
    ngModel: s.getAttribute('ng-model'),
    visible: s.offsetParent !== null
  }));
});
console.log(JSON.stringify(info, null, 2));
```

---

## FASE 3 — El Servidor HTTP (servidor.js)

### Paso 13: Crear el servidor Express

n8n necesita llamar a cotizar.js via HTTP. Creamos un servidor simple:

```javascript
const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

app.post('/cotizar', async (req, res) => {
  const child = spawn('node', ['/root/agente-colorex/cotizar.js'], { timeout: 180000 });
  let output = '';
  child.stdout.on('data', d => output += d);
  child.stdin.write(JSON.stringify(req.body));
  child.stdin.end();
  child.on('close', () => {
    try { res.json(JSON.parse(output.trim())); }
    catch(e) { res.json({ precio: null, exito: false, error: output }); }
  });
});

app.listen(3001, () => console.log('Servidor en puerto 3001'));
```

### Paso 14: Crear el servicio systemd

Para que el servidor arranque automáticamente:

```bash
cat > /etc/systemd/system/colorex-servidor.service << 'EOF'
[Unit]
Description=Servidor Cotizador Color Express
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/agente-colorex
ExecStart=/usr/bin/node servidor.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl enable colorex-servidor
systemctl start colorex-servidor
```

---

## FASE 4 — El Workflow de n8n

### Paso 15: Crear el Telegram Trigger

En n8n, creá un nodo **Telegram Trigger** con evento `message`. Conectalo con tu bot token.

### Paso 16: Implementar el buffer de mensajes

Los clientes escriben varios mensajes cortos seguidos. Sin buffer, el agente responde a cada uno por separado.

**Solución:** Guardar mensajes en `staticData` por chat_id y esperar 8 segundos antes de procesar.

```javascript
// Nodo Code — Guardar mensaje
const staticData = $getWorkflowStaticData('global');
const chatId = String($input.first().json.message?.chat?.id);
const texto = $input.first().json.message?.text || '';

if (!staticData.mensajes) staticData.mensajes = {};
if (!staticData.timestamps) staticData.timestamps = {};
if (!staticData.modoHumano) staticData.modoHumano = {};

// Si bot silenciado → detener
if (staticData.modoHumano[chatId]) {
  return [{ json: { continuar: false } }];
}

// Acumular mensaje
if (!staticData.mensajes[chatId]) staticData.mensajes[chatId] = [];
staticData.mensajes[chatId].push(texto);
staticData.timestamps[chatId] = Date.now();

return [{ json: { continuar: true, chatId, timestamp: staticData.timestamps[chatId] } }];
```

### Paso 17: Nodo Wait de 8 segundos

Después del buffer, agregar un nodo **Wait** de 8 segundos.

### Paso 18: Verificar si es el último mensaje

```javascript
// Nodo Code — ¿Soy el último?
const staticData = $getWorkflowStaticData('global');
const { chatId, timestamp } = $input.first().json;

if (!$input.first().json.continuar) return [{ json: { continuar: false } }];

// Si llegó un mensaje más nuevo mientras esperaba → descartar este
if (staticData.timestamps[chatId] !== timestamp) {
  return [{ json: { continuar: false } }];
}

const mensajes = staticData.mensajes[chatId] || [];
staticData.mensajes[chatId] = []; // limpiar buffer

return [{ json: { continuar: true, chatId, mensajes } }];
```

### Paso 19: Configurar el AI Agent

- **Tipo:** AI Agent
- **Modelo:** Claude (Anthropic) — claude-sonnet
- **Memoria:** Simple Memory by sessionId
- **Session ID:** `{{ $json.chatId }}`
- **System Prompt:** El prompt completo de ColorBot (ver docs/05-system-prompt.md)

### Paso 20: Parsear la respuesta del agente

El agente devuelve JSON. Hay que extraerlo y mapear los materiales:

```javascript
const content = $input.first().json.output || '';
let datos;

try {
  datos = JSON.parse(content);
} catch(e) {
  // Si no es JSON puro, buscar JSON dentro del texto
  const match = content.match(/\{[\s\S]*\}/);
  if (match) datos = JSON.parse(match[0]);
}

// Mapear proceso
const procesoMap = {
  'laser': 'Impresión láser',
  'impresion laser': 'Impresión láser',
  'plotter': 'Impresión plotter',
};
if (datos.proceso) {
  datos.proceso = procesoMap[datos.proceso.toLowerCase()] || datos.proceso;
}
```

### Paso 21: Llamar al servidor de cotización

Nodo **HTTP Request**:
- Método: POST
- URL: `http://localhost:3001/cotizar`
- Body: JSON con todos los datos del presupuesto

### Paso 22: Generar link de WhatsApp

```javascript
const nombre = 'Juan Pérez';
const presupuesto = '30978';
const precio = '€ 19,06';

const mensaje = `Hola! Mi nombre es ${nombre} y me comunico desde el bot de Color Express. Estoy interesado en concretar mi pedido con el presupuesto N° ${presupuesto} por un valor de ${precio} + IVA.`;

const link = `https://wa.me/584124255722?text=${encodeURIComponent(mensaje)}`;
```

### Paso 23: Sistema de modo humano (handoff)

Cuando el asesor quiere tomar el control, hace click en un botón inline del mensaje de notificación.

**Nodo Telegram — Notificar Asesor:**
```json
{
  "inline_keyboard": [[{
    "text": "🔇 Silenciar bot para este cliente",
    "callback_data": "humano_on_CHAT_ID"
  }]]
}
```

**Segundo Trigger — Callback Query:**
```javascript
const data = $input.first().json.callback_query?.data || '';
if (data.startsWith('humano_on_')) {
  const chatId = data.replace('humano_on_', '');
  const staticData = $getWorkflowStaticData('global');
  staticData.modoHumano[chatId] = true;
}
```

---

## FASE 5 — El System Prompt (La Inteligencia)

### Paso 24: Diseñar el flujo conversacional

El system prompt define cómo se comporta el agente. Los puntos clave:

1. **Identificación del cliente** — ¿es nuevo o existente? Según eso pedir más o menos datos
2. **Una pregunta a la vez** — nunca abrumar con múltiples preguntas
3. **Formato JSON obligatorio** — el agente SIEMPRE responde en JSON, nunca en texto libre
4. **Reglas de materiales** — mapeo exacto de nombres coloquiales a nombres de Smartier
5. **Reglas de terminaciones** — BOPP siempre lleva corte rollo a rollo, banner sin corte
6. **Regla crítica de datos** — NUNCA asumir ni inventar nombre/apellido del cliente

### Paso 25: Iterar el prompt con pruebas reales

El prompt se refinó múltiples veces basándose en pruebas reales:

- **Problema:** El agente inventaba apellidos cuando el cliente solo daba el nombre
  → **Solución:** Agregar regla explícita de no asumir datos

- **Problema:** El agente cotizaba con menos de 3 unidades en Smartier
  → **Solución:** Agregar regla de precio manual para menos de 3 unidades

- **Problema:** El formato de los materiales no coincidía con Smartier
  → **Solución:** Tabla de mapeo exacto en el prompt

---

## FASE 6 — Backups y Control de Versiones

### Paso 26: Sistema de backups manuales

Antes de cualquier cambio en cotizar.js:

```bash
cp /root/agente-colorex/cotizar.js \
   /root/agente-colorex/cotizar.backup.$(date +%Y%m%d_%H%M%S).js
```

### Paso 27: Configurar repositorio GitHub

```bash
# En el VPS
mkdir /root/github-agente
cd /root/github-agente
git init
git remote add origin https://TU_USUARIO:TU_TOKEN@github.com/TU_USUARIO/TU_REPO.git

# Copiar archivos
cp /root/agente-colorex/cotizar.js .
cp /root/agente-colorex/servidor.js .

# Primer commit
git add .
git commit -m "feat: primer commit"
git branch -M main
git push -u origin main
```

### Paso 28: Flujo de trabajo para cada cambio

```bash
# 1. Hacer backup
cp /root/agente-colorex/cotizar.js /root/agente-colorex/cotizar.backup.$(date +%Y%m%d_%H%M%S).js

# 2. Hacer el cambio y probarlo
echo '{"nombre":"Test",...}' | node /root/agente-colorex/cotizar.js

# 3. Si funciona → copiar al repo y hacer commit
cd /root/github-agente
cp /root/agente-colorex/cotizar.js .
git add .
git commit -m "feat: descripción del cambio"
git push

# 4. Reiniciar el servidor
systemctl restart colorex-servidor
```

---

## FASE 7 — Pruebas y Ajustes

### Paso 29: Probar cotizar.js directamente

```bash
# Prueba básica láser
echo '{"nombre":"Test Cliente","email":"test@test.com","telefono":"04140000000","documento":"12345678","material":"Papel Bond 20 Blanco - Láser","formato":"21x29.7","cantidad":100,"colores":["Negro"],"proceso":"Impresión láser","terminaciones":[]}' | node /root/agente-colorex/cotizar.js

# Prueba con cliente nuevo
echo '{"nombre":"Juan Pérez","cliente_nuevo":true,"email":"juan@test.com","telefono":"04141234567","documento":"12345678","material":"Glase 250","formato":"21x29.7","cantidad":50,"colores":["Negro","Cyan","Magenta","Amarillo"],"proceso":"Impresión láser","terminaciones":[{"tipo":"Laminado","caras":"frente","tipoLaminado":"brillante"}]}' | node /root/agente-colorex/cotizar.js

# Prueba gigantografía vinil
echo '{"nombre":"Smartier","material":"Vinil Blanco - Plotter","formato":"100x150","cantidad":5,"colores":["Negro","Cyan","Magenta","Amarillo"],"proceso":"Impresión Plotter UV","coberturaPlotter":"estandar","terminaciones":[{"tipo":"Corte digital - Plotter"}]}' | node /root/agente-colorex/cotizar.js
```

### Paso 30: Probar el servidor HTTP

```bash
curl -X POST http://localhost:3001/cotizar \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","material":"Glase 250","formato":"21x29.7","cantidad":100,"colores":["Negro"],"proceso":"Impresión láser","terminaciones":[]}'
```

### Paso 31: Comandos útiles de mantenimiento

```bash
# Ver logs del servidor en tiempo real
journalctl -u colorex-servidor -f

# Ver logs de n8n
journalctl -u n8n -f

# Reiniciar servicios
systemctl restart colorex-servidor
systemctl restart n8n

# Ver estado
systemctl status colorex-servidor
systemctl status n8n

# Ver backups disponibles
ls -la /root/agente-colorex/*.backup.*.js

# Restaurar un backup
cp /root/agente-colorex/cotizar.backup.YYYYMMDD_HHMMSS.js /root/agente-colorex/cotizar.js
systemctl restart colorex-servidor
```

---

## Errores comunes y sus soluciones

| Error | Causa | Solución |
|---|---|---|
| `Cannot find module 'playwright'` | Ejecutar script desde directorio incorrecto | Siempre ejecutar desde `/root/agente-colorex` |
| `Timeout 30000ms exceeded waiting for input[name="sustrato"]` | Página no cargó o selector incorrecto | Aumentar waitForTimeout o verificar selector con inspector |
| `spawnSync ETIMEDOUT` | Uso de execSync bloqueando el event loop | Migrar a spawn con stdin/stdout asíncrono |
| `md-scroll-mask intercepts pointer events` | Overlay de Angular Material bloqueando clicks | Remover el elemento con `page.evaluate()` |
| Precio vacío (`""`) | Campo requerido no completado (ej: Cobertura de tinta) | Agregar configuración del proceso plotter |
| Bot responde a mensajes del asesor | modoHumano no activo | Verificar que el callback_query trigger esté activo |

---

## Arquitectura final

```
Cliente (Telegram)
       │
       ▼
[Telegram Bot]
       │
       ▼
[n8n Workflow]
  ├── Buffer 8s
  ├── AI Agent (Claude)
  ├── HTTP POST → servidor.js:3001
  │                    │
  │                    ▼
  │              cotizar.js
  │              (Playwright)
  │                    │
  │                    ▼
  │              Smartier.software
  │              (Browser headless)
  ├── Respuesta precio al cliente
  └── Notificación al asesor
```

---

## Costos del sistema

| Componente | Costo mensual |
|---|---|
| VPS (2 vCPU, 4GB RAM) | ~USD 10-15 |
| Claude Max (Anthropic) | USD 200 |
| n8n (self-hosted) | Gratis |
| Telegram Bot | Gratis |
| **Total** | **~USD 210-215/mes** |

---

## Lo que aprendimos

1. **Playwright en producción necesita headless + args específicos** — sin `--no-sandbox` falla en Linux
2. **Angular Material tiene comportamientos especiales** — los overlays y dropdowns necesitan manejo especial
3. **Los LLMs necesitan formato de respuesta muy explícito** — el JSON en el system prompt tiene que ser con ejemplos reales
4. **El buffer de mensajes es crítico** — sin él, el agente responde a cada palabra del cliente
5. **Los backups antes de cada cambio salvan vidas** — tuvimos que restaurar más de una vez
6. **Inspeccionar el DOM es la clave** — cuando algo no funciona, escribir un script inspector para ver exactamente cómo se llaman los elementos
7. **Probar siempre en archivo separado primero** — nunca modificar el cotizar.js principal sin probar antes en un archivo de prueba

---

*Construido con paciencia, café y muchos console.log() 🚀*
