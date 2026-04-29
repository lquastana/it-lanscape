import fs from 'fs/promises';
import path from 'path';
import { loadAccessRules } from '../lib/accessControl.js';

const dataPath = path.join(process.cwd(), 'data', 'auth', 'access-rules.json');

let ok = true;

try {
  const content = await fs.readFile(dataPath, 'utf-8');
  const rules = JSON.parse(content);

  if (!Array.isArray(rules.establishments)) {
    console.error('access-rules.json: establishments manquant ou invalide');
    ok = false;
  }

  const hasAdmin = rules.establishments.some(e => e.role === 'admin');
  if (!hasAdmin) {
    console.error('access-rules.json: aucun compte admin défini');
    ok = false;
  }

  const validRoles = new Set(['viewer', 'editor', 'admin']);
  for (const e of rules.establishments) {
    if (!e.username || !e.password || !validRoles.has(e.role)) {
      console.error(`access-rules.json: entrée invalide — ${JSON.stringify(e)}`);
      ok = false;
    }
  }
} catch (error) {
  console.error('Erreur lecture access-rules.json', error);
  ok = false;
}

// Vérifie que loadAccessRules retourne une structure normalisée
try {
  const loaded = await loadAccessRules();
  if (!Array.isArray(loaded.establishments)) {
    console.error('loadAccessRules: establishments manquant');
    ok = false;
  }
} catch (error) {
  console.error('loadAccessRules: erreur inattendue', error);
  ok = false;
}

if (!ok) process.exit(1);

console.log("Contrôles d'accès : OK");
