const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
let ok = true;

for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith('.json')) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    if (!Array.isArray(data.etablissements)) {
      console.error(`Fichier ${file}: champ "etablissements" manquant`);
      ok = false;
    }
  } catch {
    console.error(`Fichier ${file}: lecture ou format JSON invalide`);
    ok = false;
  }
}

if (ok) {
  console.log('Structure JSON valide');
} else {
  process.exit(1);
}
