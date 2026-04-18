import fs from 'fs/promises';
import path from 'path';
import { isIpAllowed } from '../lib/accessControl.js';

const dataPath = path.join(process.cwd(), 'data', 'auth', 'access-rules.json');

let ok = true;

try {
  const content = await fs.readFile(dataPath, 'utf-8');
  const rules = JSON.parse(content);

  if (!Array.isArray(rules.allowedIps)) {
    console.error('access-rules.json: allowedIps manquant ou invalide');
    ok = false;
  }

  if (!Array.isArray(rules.allowedCidrs)) {
    console.error('access-rules.json: allowedCidrs manquant ou invalide');
    ok = false;
  }

  if (!Array.isArray(rules.establishments)) {
    console.error('access-rules.json: establishments manquant ou invalide');
    ok = false;
  }

  const localAllowed = isIpAllowed('127.0.0.1', rules);
  if (!localAllowed) {
    console.error('access-rules.json: 127.0.0.1 devrait être autorisée par défaut');
    ok = false;
  }
} catch (error) {
  console.error('Erreur lecture access-rules.json', error);
  ok = false;
}

if (!ok) {
  process.exit(1);
}

console.log('Contrôles d’accès : OK');
