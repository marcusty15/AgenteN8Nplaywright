# 03 — cotizar.js (Playwright)

## Descripción
Script Node.js que automatiza el navegador para crear presupuestos en Smartier.
Recibe datos via `stdin` como JSON, opera Chromium en modo headless y devuelve el precio y número de presupuesto por `stdout`.

---

## Credenciales Smartier

| Campo | Valor |
|---|---|
| URL | https://colorex.smartier.software |
| Email | marco.troconis15@gmail.com |
| Password | 9c72586794 |
| Sección | CRM → Presupuestos |

---

## Flujo Interno de cotizar.js

```
1. Recibir JSON por stdin
2. Lanzar Chromium headless
3. Login en Smartier
4. Navegar a CRM/Presupuestos
5. Click en "Nuevo presupuesto" (note_add)
6. ─── CLIENTE ───────────────────────────────────
   a. Escribir nombre del cliente en el campo
   b. Esperar 2 segundos a que aparezca el dropdown
   c. Si aparece opción → seleccionar (cliente existente)
   d. Si NO aparece → llamar crearContactoNuevo()
7. Seleccionar producto: "Impresion"
8. Click en "GUARDAR PRESUPUESTO"
9. Llenar formulario de cotización:
   - Material (sustrato)
   - Formato final
   - Cantidad
   - Colores (uno por uno)
   - Proceso
   - Terminaciones (si hay)
10. Click en "COTIZAR"
11. Esperar 12 segundos a que calcule
12. Extraer precio (.monto.st-data-bold)
13. Extraer N° presupuesto (regex en body)
14. Guardar presupuesto
15. Cerrar browser
16. Retornar JSON por stdout
```

---

## Función: crearContactoNuevo()

Se activa cuando el nombre del cliente no aparece en el dropdown de Smartier.

```
1. Click en botón + (add) del campo cliente
2. Click en "Nuevo contacto" del mini popup
3. Llenar Nombre completo
4. Llenar Documento de identidad (si viene en datos)
5. Llenar Email (requerido — si no hay, genera uno automático)
6. Llenar Teléfono móvil
7. Scroll al fondo del formulario
8. Seleccionar Moneda: Euro
9. Click en GUARDAR
```

---

## Funciones Auxiliares

### selectFromDropdown(page, input, texto)
Escribe en un input de autocomplete y selecciona la opción que coincide.
- Ignora opciones que contengan "servicio"
- Espera 2.5 segundos para que cargue el dropdown
- Si no encuentra coincidencia exacta, selecciona la primera opción

### cerrarPopup(page)
Cierra popups de confirmación con botón "ACEPTAR".
Se llama entre cada color y terminación para evitar que popups bloqueen el flujo.

### agregarTerminacion(page, terminacion)
Agrega terminaciones al presupuesto.

**Tipos soportados:**
- `Laminado` → selecciona caras (frente/frente y dorso) + tipo (brillante/mate)
- `Corte digital` → manejo de separación entre etiquetas
- `Corte guillotina` → sin campos adicionales

---

## Input esperado (JSON completo)

```json
{
  "nombre": "Juan Pérez",
  "contacto": "04141234567",
  "cliente_nuevo": true,
  "documento": "12345678",
  "email": "juan@correo.com",
  "material": "Papel Bond 20 Blanco - Láser",
  "formato": "21x29.7",
  "cantidad": 100,
  "colores": ["Negro"],
  "proceso": "Impresión láser",
  "terminaciones": [
    { "tipo": "Laminado", "caras": "frente", "tipoLaminado": "brillante" }
  ]
}
```

---

## Output (JSON por stdout)

```json
{ "precio": "€ 20,48", "numeroPresupuesto": "30958", "exito": true }
```

En caso de error:
```json
{ "precio": null, "exito": false, "error": "mensaje de error" }
```

---

## Materiales válidos en Smartier

| Nombre en el JSON | Cómo aparece en Smartier |
|---|---|
| `Papel Bond 20 Blanco - Láser` | Impresión láser |
| `Papel Bond 20 Blanco - Offset` | Offset |
| `Papel Bond Azul 20 - Riso` | Riso color azul |
| `Papel Bond Blanco - Riso` | Riso blanco |
| `Papel Bond Recubierto 125grs - Plotter` | Plotter |
| `Glase 150` | Glasé 150 gr |
| `Glase 250` | Glasé 250 gr |
| `Glase 300` | Glasé 300 gr |
| `Opalina` | Opalina |
| `Adhesivo` | Adhesivo |

---

## Problemas conocidos y soluciones

### Error: md-scroll-mask intercepts pointer events
**Causa:** Angular Material bloquea clicks con un overlay invisible.
**Solución aplicada:**
```javascript
await page.evaluate(() => {
  const mask = document.querySelector('.md-scroll-mask');
  if (mask) mask.remove();
});
```

### Error: spawnSync /bin/sh ETIMEDOUT
**Causa:** Versión anterior usaba `execSync` que bloqueaba el event loop.
**Solución aplicada:** Reemplazado por `spawn` con manejo de stdin/stdout.

### Email automático para clientes nuevos sin email
Si el cliente no proporcionó email, se genera uno automático:
```javascript
`${nombre.toLowerCase().replace(/\s+/g, '.')}@cliente.com`
```
Esto evita que Smartier rechace el formulario (email es campo requerido).
