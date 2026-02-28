const { chromium } = require('playwright');

async function selectFromDropdown(page, input, texto) {
  await input.click();
  await input.fill('');
  await input.type(texto, { delay: 50 });
  await page.waitForTimeout(2500);
  await page.evaluate((t) => {
    const items = document.querySelectorAll('li[role="option"]');
    for (const item of items) {
      if (item.innerText.toLowerCase().includes(t.toLowerCase()) && !item.innerText.toLowerCase().includes("servicio")) { item.click(); return; }
    }
    if (items[0]) items[0].click();
  }, texto);
  await page.waitForTimeout(1000);
}

async function cerrarPopup(page) {
  const n = await page.locator('button:has-text("ACEPTAR")').count();
  if (n > 0) { await page.click('button:has-text("ACEPTAR")'); await page.waitForTimeout(1000); }
}

async function agregarTerminacion(page, terminacion) {
  const tipo = terminacion.tipo.toLowerCase();
  const inputTerm = page.locator('input[placeholder="Buscar terminaciones"]');
  await inputTerm.click();
  await inputTerm.fill('');
  await inputTerm.type(terminacion.tipo, { delay: 50 });
  await page.waitForTimeout(2500);
  await page.evaluate((t) => {
    const items = document.querySelectorAll('li[role="option"]');
    for (const item of items) {
      if (item.innerText.toLowerCase().includes(t.toLowerCase()) && !item.innerText.toLowerCase().includes("servicio")) { item.click(); return; }
    }
    if (items[0]) items[0].click();
  }, terminacion.tipo);
  await page.waitForTimeout(2000);

  if (tipo.includes('laminado')) {
    await page.locator('md-select[aria-label="Caras"]').click();
    await page.waitForTimeout(1000);
    await page.evaluate((caras) => {
      const items = document.querySelectorAll('md-option');
      for (const item of items) {
        if (item.innerText.toLowerCase().includes(caras.toLowerCase())) { item.click(); return; }
      }
      if (items[0]) items[0].click();
    }, terminacion.caras || 'frente');
    await page.waitForTimeout(500);

    await page.locator('md-select[aria-label="Cantidad a realizar"]').click();
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const items = document.querySelectorAll('md-option');
      for (const item of items) {
        if (item.innerText.toLowerCase().includes('total')) { item.click(); return; }
      }
      if (items[0]) items[0].click();
    });
    await page.waitForTimeout(500);

    await page.locator('md-select[aria-label="Tipo de laminado"]').click();
    await page.waitForTimeout(1000);
    await page.evaluate((t) => {
      const items = document.querySelectorAll('md-option');
      for (const item of items) {
        if (item.innerText.toLowerCase().includes(t.toLowerCase()) && !item.innerText.toLowerCase().includes("servicio")) { item.click(); return; }
      }
      if (items[0]) items[0].click();
    }, terminacion.tipoLaminado || 'brillante');
    await page.waitForTimeout(500);

  } else if (tipo.includes('corte') && !tipo.includes('guillotina')) {
    const inputSep = page.locator('input[aria-label*="eparaci"], input[name*="eparaci"], input[ng-model*="eparaci"]').last();
    const count = await inputSep.count();
    if (count > 0) {
      await inputSep.fill('0');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
    }
  }
}

async function crearContactoNuevo(page, datos) {
  // Click en botón + del campo cliente
  await page.evaluate(() => {
    const btns = document.querySelectorAll('md-dialog button');
    for (const b of btns) {
      const icon = b.querySelector('md-icon');
      if (icon && icon.innerText.trim() === 'add') { b.click(); return; }
    }
  });
  await page.waitForTimeout(1500);

  // Click en "Nuevo contacto"
  await page.evaluate(() => {
    const items = document.querySelectorAll('md-menu-item button, .md-menu-item');
    for (const item of items) {
      if (item.innerText && item.innerText.toLowerCase().includes('nuevo contacto')) {
        item.click(); return;
      }
    }
  });
  await page.waitForTimeout(2000);

  // Nombre
  const inputNombre = page.locator('md-dialog input').first();
  await inputNombre.click();
  await inputNombre.fill(datos.nombre || '');
  await page.waitForTimeout(300);

  // Documento
  if (datos.documento) {
    const allInputs = await page.locator('md-dialog input').all();
    if (allInputs[1]) {
      await allInputs[1].click();
      await allInputs[1].fill(datos.documento);
      await page.waitForTimeout(300);
    }
  }

  // Email — requerido
  const emailInput = page.locator('md-dialog input[type="email"]').first();
  const emailCount = await emailInput.count();
  if (emailCount > 0) {
    await emailInput.click();
    await emailInput.fill(datos.email || `${(datos.nombre || 'cliente').toLowerCase().replace(/\s+/g, '.')}@cliente.com`);
    await page.waitForTimeout(300);
  }

  // Teléfono móvil
  const tel = datos.telefono || datos.contacto || '';
  if (tel) {
    const soloNumeros = tel.replace(/[^0-9+]/g, '');
    const telInput = page.locator('md-dialog input[type="tel"], md-dialog input[placeholder*="vil"], md-dialog input[placeholder*="Móvil"]').first();
    const telCount = await telInput.count();
    if (telCount > 0) {
      await telInput.click();
      await telInput.fill(soloNumeros);
      await page.waitForTimeout(300);
    }
  }

  // Scroll al fondo para ver moneda
  await page.evaluate(() => {
    const dialog = document.querySelector('md-dialog-content');
    if (dialog) dialog.scrollTop = dialog.scrollHeight;
  });
  await page.waitForTimeout(1000);

  // Seleccionar moneda Euro
  await page.evaluate(() => {
    const selects = document.querySelectorAll('md-select');
    for (const s of selects) {
      if (s.getAttribute('aria-label') && s.getAttribute('aria-label').toLowerCase().includes('oneda')) {
        s.click(); return;
      }
    }
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const items = document.querySelectorAll('md-option');
    for (const item of items) {
      if (item.innerText.toLowerCase().includes('euro')) { item.click(); return; }
    }
  });
  await page.waitForTimeout(500);

  // Guardar contacto
  await page.evaluate(() => {
    const btns = document.querySelectorAll('md-dialog button');
    for (const b of btns) {
      if (b.innerText.trim() === 'GUARDAR') { b.click(); return; }
    }
  });
  await page.waitForTimeout(2500);
}

async function cotizar(datos) {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await (await browser.newContext()).newPage();

  await page.goto('https://colorex.smartier.software/#/login');
  await page.waitForTimeout(2000);
  await page.fill('#email', 'marco.troconis15@gmail.com');
  await page.fill('#pass', '9c72586794');
  await page.click('button:has-text("INGRESAR")');
  await page.waitForTimeout(4000);

  await page.goto('https://colorex.smartier.software/#/CRM/Presupuestos');
  await page.waitForTimeout(3000);

  await page.click('button.md-icon-button:has-text("note_add")');
  await page.waitForTimeout(2000);

  // ─── CLIENTE: buscar o crear ──────────────────────────────────
  const i1 = await page.locator('md-dialog input').all();
  const nombreCliente = datos.nombre || 'Smartier';
  await i1[0].fill(nombreCliente);
  await page.waitForTimeout(2000);

  const opcionesCliente = await page.locator('li[role="option"]').count();
  if (opcionesCliente > 0) {
    await page.evaluate(() => {
      const li = document.querySelector('li[role="option"]');
      if (li) li.click();
    });
    await page.waitForTimeout(1000);
  } else {
    await crearContactoNuevo(page, datos);
    await page.waitForTimeout(1000);
  }
  // ─────────────────────────────────────────────────────────────

  // Producto: Impresion
  const i2 = await page.locator('md-dialog input').all();
  await i2[1].fill('Impresion');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const items = document.querySelectorAll('li[role="option"]');
    for (const item of items) { if (item.innerText.toLowerCase().includes('impresion')) { item.click(); return; } }
    if (items[0]) items[0].click();
  });
  await page.waitForTimeout(1000);

  await page.click('button:has-text("GUARDAR PRESUPUESTO")');
  await page.waitForTimeout(5000);

  await selectFromDropdown(page, page.locator('input[name="sustrato"]'), datos.material);

  await page.evaluate(() => { const mask = document.querySelector('.md-scroll-mask'); if (mask) mask.remove(); });
  await page.waitForTimeout(500);
  await page.locator('input[name="formatoFinal"]').click();
  await page.locator('input[name="formatoFinal"]').fill(datos.formato);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  const cantInput = page.locator('input[name="Cantidad"]');
  await cantInput.click();
  await cantInput.fill('');
  await cantInput.type(String(datos.cantidad), { delay: 50 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  for (const color of datos.colores) {
    await cerrarPopup(page);
    await selectFromDropdown(page, page.locator('input[placeholder="Buscar color"]').first(), color);
  }
  await cerrarPopup(page);

  await selectFromDropdown(page, page.locator('input[placeholder="Buscar proceso"]'), datos.proceso);
  await cerrarPopup(page);

  if (datos.terminaciones && datos.terminaciones.length > 0) {
    for (const terminacion of datos.terminaciones) {
      await cerrarPopup(page);
      await agregarTerminacion(page, terminacion);
    }
    await cerrarPopup(page);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const mask = document.querySelector('.md-scroll-mask');
    if (mask) mask.remove();
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.innerText.includes('COTIZAR')) { b.click(); return; } }
  });
  await page.waitForTimeout(12000);

  const resultado = await page.evaluate(() => {
    const elPrecio = document.querySelector('.monto.st-data-bold');
    const precio = elPrecio ? elPrecio.innerText.replace(/\u00a0/g, '').replace(/\s+/g, ' ').trim() : null;
    const bodyText = document.body.innerText;
    const match = bodyText.match(/Presupuesto\s*N[°º]\s*(\d+)/);
    const numPres = match ? match[1] : null;
    return { precio, numPres };
  });
  const precio = resultado.precio;
  const numeroPresupuesto = resultado.numPres || null;

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const mask = document.querySelector('.md-scroll-mask');
    if (mask) mask.remove();
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.innerText.trim() === 'save') { b.click(); return; }
    }
    for (const b of btns) {
      const txt = b.innerText.trim();
      if (b.className.includes('md-accent') && txt !== 'COTIZAR' && txt !== 'ELIMINAR RESULTADO') {
        b.click(); return;
      }
    }
  });
  await page.waitForTimeout(3000);
  await browser.close();
  return { precio, numeroPresupuesto };
}

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  try {
    const datos = JSON.parse(input);
    const resultado = await cotizar(datos);
    console.log(JSON.stringify({ precio: resultado.precio, numeroPresupuesto: resultado.numeroPresupuesto, exito: true }));
  } catch(e) {
    console.log(JSON.stringify({ precio: null, exito: false, error: e.message }));
  }
});
