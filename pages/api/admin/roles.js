import fs from 'fs/promises';
import { appendAudit, hashContent, truncateSnapshot } from '../../../lib/audit.js';
import { withAuthz } from '../../../lib/authz.js';
import { loadAccessRules, saveAccessRules } from '../../../lib/accessControl.js';
import { resolveDataPath } from '../../../lib/dataPaths.js';

const ALLOWED_ROLES = ['viewer', 'editor', 'admin'];

async function handler(req, res) {
  if (req.method === 'GET') {
    const rules = await loadAccessRules();
    const establishments = Array.isArray(rules.establishments) ? rules.establishments : [];
    return res.status(200).json({
      establishments: establishments.map(({ id, username, role }) => ({
        id,
        username,
        role: role || 'editor',
      })),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, role } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Utilisateur invalide' });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    const rulesPath = resolveDataPath('auth', 'access-rules.json');
    const beforeContent = await fs.readFile(rulesPath, 'utf-8').catch(() => null);
    const rules = await loadAccessRules();
    const establishments = Array.isArray(rules.establishments) ? rules.establishments : [];
    const target = establishments.find(est => est.username === username);

    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    target.role = role;
    await saveAccessRules(rules);

    const actor = req.actor || {};
    const afterContent = await fs.readFile(rulesPath, 'utf-8').catch(() => null);
    await appendAudit({
      action: 'write',
      target: 'data/auth/access-rules.json',
      actor: {
        user: actor.user || 'unknown',
        role: actor.role || 'unknown',
      },
      via: actor.via || 'unknown',
      clientIp: actor.clientIp || null,
      beforeHash: hashContent(beforeContent),
      afterHash: hashContent(afterContent),
      before: truncateSnapshot(beforeContent),
      after: truncateSnapshot(afterContent),
      meta: {
        change: 'role-update',
        username,
        role,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur mise à jour rôle' });
  }
}

export default withAuthz('admin', handler);
