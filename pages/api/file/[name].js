import fs from 'fs/promises';
import path from 'path';
import { evaluateAccess, sendUnauthorizedJson } from '../../../lib/accessControl';

export default async function handler(req, res) {
  const access = await evaluateAccess(req, res);
  if (!access.allowed) {
    return sendUnauthorizedJson(res);
  }

  const { name } = req.query;
  const safeName = path.basename(name) + '.json';
  console.log(safeName)
  if (!safeName.endsWith('.json')) {
    return res.status(400).json({ error: 'Fichier invalide' });
  }
  const filePath = path.join(process.cwd(), 'data', safeName);

  if (req.method === 'GET') {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    } catch {
      res.status(500).json({ error: 'Erreur lecture fichier' });
    }
  } else if (req.method === 'POST') {
    try {
      await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
      res.status(200).json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Erreur écriture fichier' });
    }
  } else {
    res.status(405).end();
  }
}
