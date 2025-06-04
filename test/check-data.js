const fs = require('fs');
const path = require('path');

try {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'landscape.json'), 'utf-8'));
  if (!Array.isArray(data.etablissements)) {
    console.error('Champ "etablissements" manquant');
    process.exit(1);
  }
  console.log('Structure JSON valide');
} catch (err) {
  console.error('Erreur de lecture ou de format du JSON');
  process.exit(1);
}
