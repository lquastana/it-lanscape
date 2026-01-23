import fs from 'fs/promises';
import path from 'path';
import { getIronSession } from 'iron-session';
import { appendAuditEvent } from '../../../lib/auditLog';
import { evaluateAccess, extractBasicAuthUser, extractClientIp, sendUnauthorizedJson } from '../../../lib/accessControl';
import { sessionOptions } from '../../../lib/session';

export default async function handler(req, res) {
  const access = await evaluateAccess(req, res);
  if (!access.allowed) {
    return sendUnauthorizedJson(res);
  }

  const session = await getIronSession(req, res, sessionOptions);
  const sessionUser = session?.user?.username || null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const basicUser = extractBasicAuthUser(authHeader);
  const actor = sessionUser || basicUser || 'unknown';
  const clientIp = extractClientIp(req);

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
      const payload = JSON.stringify(req.body, null, 2);
      await fs.writeFile(filePath, payload, 'utf-8');
      await appendAuditEvent({
        action: 'write',
        target: safeName,
        actor,
        via: access.via || 'unknown',
        clientIp,
        bytes: Buffer.byteLength(payload, 'utf-8'),
      });
      res.status(200).json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Erreur écriture fichier' });
    }
  } else {
    res.status(405).end();
  }
}
