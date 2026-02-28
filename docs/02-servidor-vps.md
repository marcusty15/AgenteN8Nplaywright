# 02 — Servidor VPS

## Datos del Servidor

| Campo | Valor |
|---|---|
| Sistema operativo | Ubuntu 24 |
| Directorio del proyecto | `/root/agente-colorex/` |
| n8n | Puerto 5678 |
| Servidor cotizador | Puerto 3001 |

---

## Archivos del Proyecto

```
/root/agente-colorex/
├── cotizar.js              ← Automatización Playwright (archivo principal)
├── cotizar.backup.YYYYMMDD_HHMMSS.js  ← Backups automáticos
├── servidor.js             ← Servidor HTTP Express
└── node_modules/           ← Dependencias
```

---

## servidor.js — Código Completo

```javascript
const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

app.post('/cotizar', async (req, res) => {
  try {
    const datos = JSON.stringify(req.body);
    const child = spawn('node', ['/root/agente-colorex/cotizar.js'], { timeout: 180000 });
    let output = '';
    let error = '';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => error += d);
    child.stdin.write(datos);
    child.stdin.end();
    child.on('close', (code) => {
      try { res.json(JSON.parse(output.trim())); }
      catch(e) { res.json({ precio: null, exito: false, error: error || output }); }
    });
    child.on('error', (e) => {
      res.json({ precio: null, exito: false, error: e.message });
    });
  } catch(e) {
    res.json({ precio: null, exito: false, error: e.message });
  }
});

app.listen(3001, () => console.log('Servidor cotizador en puerto 3001'));
```

---

## Servicio systemd — colorex-servidor

### Ver estado
```bash
systemctl status colorex-servidor
```

### Reiniciar
```bash
systemctl restart colorex-servidor
```

### Ver logs en tiempo real
```bash
journalctl -u colorex-servidor -f
```

### Archivo de servicio
Ubicación: `/etc/systemd/system/colorex-servidor.service`

---

## Comandos de Mantenimiento

### Hacer backup manual de cotizar.js
```bash
cp /root/agente-colorex/cotizar.js /root/agente-colorex/cotizar.backup.$(date +%Y%m%d_%H%M%S).js
```

### Probar el servidor directamente
```bash
curl -X POST http://localhost:3001/cotizar \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@test.com","telefono":"04140000000","documento":"12345678","material":"Papel Bond 20 Blanco - Láser","formato":"21x29.7","cantidad":100,"colores":["Negro"],"proceso":"Impresión láser","terminaciones":[]}'
```

### Probar cotizar.js directamente
```bash
echo '{"nombre":"Test","email":"test@test.com","telefono":"04140000000","documento":"12345678","material":"Papel Bond 20 Blanco - Láser","formato":"21x29.7","cantidad":100,"colores":["Negro"],"proceso":"Impresión láser","terminaciones":[]}' | node /root/agente-colorex/cotizar.js
```

### Ver backups disponibles
```bash
ls -la /root/agente-colorex/*.backup.*.js
```

### Restaurar un backup
```bash
cp /root/agente-colorex/cotizar.backup.YYYYMMDD_HHMMSS.js /root/agente-colorex/cotizar.js
systemctl restart colorex-servidor
```

---

## Playwright — Chromium

### Ubicación del ejecutable
```
/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome
```

### Si Playwright falla (reinstalar)
```bash
cd /root/agente-colorex
npx playwright install chromium
```

---

## Dependencias Node.js

```bash
cd /root/agente-colorex
npm install express playwright
```
