import fs from 'fs/promises';
import path from 'path';
import { evaluateAccess, sendUnauthorizedJson } from '../../lib/accessControl';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await evaluateAccess(req, res);
  if (!access.allowed) {
    return sendUnauthorizedJson(res);
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.network.json'));
    const etablissements = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const json = JSON.parse(content);
      const nom = json.etablissement || json.nom;
      etablissements.push({ nom, vlans: json.vlans || [] });
    }
    res.status(200).json({ etablissements });
  } catch {
    res.status(500).json({ error: 'Erreur lecture JSON' });
  }
}
