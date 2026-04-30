import fs from 'fs/promises';
import path from 'path';
import { appendAudit, hashContent, truncateSnapshot } from '../../../lib/audit.js';
import { withAuthz } from '../../../lib/authz.js';
import { resolveDataPath } from '../../../lib/dataPaths.js';
import { writeJsonFileSafely } from '../../../lib/jsonFileStore.js';
import { resolveSchema, formatZodErrors } from '../../../lib/schemas/index.js';

const ALLOWED_NAME_RE = /^[a-z0-9_-]+(\.flux|\.infra|\.network)?\.json$/i;

async function handler(req, res) {
  const { name } = req.query;
  const safeName = path.basename(String(name)) + '.json';
  if (!ALLOWED_NAME_RE.test(safeName)) {
    return res.status(400).json({ error: 'Fichier invalide' });
  }
  const filePath = resolveDataPath(safeName);

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
      const baseName = path.basename(name);
      const schema = resolveSchema(baseName);
      if (schema) {
        const result = schema.safeParse(req.body);
        if (!result.success) {
          return res.status(422).json({
            error: 'Données invalides',
            details: formatZodErrors(result.error),
          });
        }
      }

      const payload = JSON.stringify(req.body, null, 2);
      const actor = req.actor || {};
      const writeResult = await writeJsonFileSafely(filePath, req.body, {
        target: safeName,
        actor: {
          user: actor.user || 'unknown',
          role: actor.role || 'unknown',
        },
        action: 'data-file-write',
      });

      await appendAudit({
        action: 'write',
        target: `data/${safeName}`,
        actor: {
          user: actor.user || 'unknown',
          role: actor.role || 'unknown',
        },
        via: actor.via || 'unknown',
        clientIp: actor.clientIp || null,
        beforeHash: writeResult.beforeHash || hashContent(writeResult.beforeContent),
        afterHash: hashContent(payload),
        before: truncateSnapshot(writeResult.beforeContent),
        after: truncateSnapshot(payload),
        bytes: Buffer.byteLength(payload, 'utf-8'),
        snapshot: writeResult.snapshot,
        historyId: writeResult.historyId,
      });
      res.status(200).json({ ok: true });
    } catch (error) {
      if (error.code === 'JSON_STORE_LOCKED') {
        return res.status(423).json({ error: 'Fichier verrouillé, réessayez dans quelques secondes' });
      }
      res.status(500).json({ error: 'Erreur écriture fichier' });
    }
  } else {
    res.status(405).end();
  }
}

export default async function routeHandler(req, res) {
  if (req.method === 'GET') {
    return withAuthz('read', handler)(req, res);
  }
  if (req.method === 'POST') {
    return withAuthz('write', handler)(req, res);
  }
  return res.status(405).end();
}
