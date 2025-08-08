const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

const nameToTrigram = {};
const trigramToName = {};
const used = new Set();

function clean(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
}

function generate(name) {
  const cleaned = clean(name);
  let base = cleaned.slice(0, 3);
  if (base.length < 3) base = (base + 'XXX').slice(0, 3);
  let trigram = base;
  let i = 0;
  while (used.has(trigram)) {
    const letter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
    trigram = base.slice(0, 2) + letter;
    i++;
  }
  used.add(trigram);
  return trigram;
}

for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith('.json') || file === 'trigrammes.json') continue;
  const filePath = path.join(dataDir, file);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const etab of json.etablissements ?? []) {
    for (const domaine of etab.domaines ?? []) {
      for (const processus of domaine.processus ?? []) {
        for (const app of processus.applications ?? []) {
          let trigram = nameToTrigram[app.nom];
          if (!trigram) {
            trigram = generate(app.nom);
            nameToTrigram[app.nom] = trigram;
            trigramToName[trigram] = app.nom;
          }
          app.trigramme = trigram;
        }
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

fs.writeFileSync(path.join(dataDir, 'trigrammes.json'), JSON.stringify(trigramToName, null, 2));
