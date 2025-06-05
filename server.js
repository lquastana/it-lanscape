// server.js
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

/** GET /api/landscape   → agrège tous les *.json de /data */
app.get('/api/landscape', (req, res) => {
  const dataDir = path.join(__dirname, 'data');

  fs.readdir(dataDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to list data dir' });

    // ne garder que les .json
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (!jsonFiles.length) return res.json({ etablissements: [] });

    const etablissements = [];

    try {
      jsonFiles.forEach(file => {
        const raw   = fs.readFileSync(path.join(dataDir, file), 'utf-8');
        const json  = JSON.parse(raw);
        if (Array.isArray(json.etablissements)) {
          etablissements.push(...json.etablissements);
        } else {
          console.warn(`⚠️  ${file} : champ "etablissements" manquant ou invalide`);
        }
      });

      res.json({ etablissements });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Invalid JSON format in one of the files' });
    }
  });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
