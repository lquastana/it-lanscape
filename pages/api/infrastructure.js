import fs from 'fs/promises';
import path from 'path';
import { withAuthz } from '../../lib/authz.js';
import { getDataDir } from '../../lib/dataPaths.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataDir = getDataDir();
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.infra.json'));
    const etablissements = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const json = JSON.parse(content);
      const nom = json.etablissement || json.nom;
      const allServers = json.serveurs || [];
      const grouped = {};
      for (const srv of allServers) {
        if (!srv.trigramme) continue;
        if (!grouped[srv.trigramme]) grouped[srv.trigramme] = [];
        grouped[srv.trigramme].push(srv);
      }
      etablissements.push({ nom, applications: grouped, serveurs: allServers });
    }
    res.status(200).json({ etablissements });
  } catch {
    res.status(500).json({ error: 'Erreur lecture JSON' });
  }
}

export default withAuthz('read', handler);
