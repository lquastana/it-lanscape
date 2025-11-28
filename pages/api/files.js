import fs from 'fs/promises';
import path from 'path';
import { evaluateAccess, sendUnauthorizedJson } from '../../lib/accessControl';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const access = await evaluateAccess(req);
  if (!access.allowed) {
    return sendUnauthorizedJson(res);
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.json'));
    res.status(200).json({ files });
  } catch {
    res.status(500).json({ error: 'Erreur lecture répertoire' });
  }
}
