const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

app.post('/cotizar', async (req, res) => {
  try {
    const datos = JSON.stringify(req.body);
    const child = spawn('node', ['/root/agente-colorex/cotizar.js'], {
      timeout: 180000
    });

    let output = '';
    let error = '';

    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => error += d);

    child.stdin.write(datos);
    child.stdin.end();

    child.on('close', (code) => {
      try {
        res.json(JSON.parse(output.trim()));
      } catch(e) {
        res.json({ precio: null, exito: false, error: error || output });
      }
    });

    child.on('error', (e) => {
      res.json({ precio: null, exito: false, error: e.message });
    });

  } catch(e) {
    res.json({ precio: null, exito: false, error: e.message });
  }
});

app.listen(3001, () => console.log('Servidor cotizador en puerto 3001'));
