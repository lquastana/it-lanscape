const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/landscape', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'landscape.json'), 'utf-8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Unable to read landscape data' });
    } else {
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (e) {
        res.status(500).json({ error: 'Invalid JSON format' });
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
