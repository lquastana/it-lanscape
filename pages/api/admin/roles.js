import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { appendAudit, hashContent, truncateSnapshot } from '../../../lib/audit.js';
import { withAuthz } from '../../../lib/authz.js';
import { loadAccessRules, saveAccessRules } from '../../../lib/accessControl.js';

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

  const payload = req.body || {};
  const action = payload.action || 'update-role';
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const role = payload.role;
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username) {
    return res.status(400).json({ error: 'Utilisateur invalide' });
  }

  try {
    const rules = await loadAccessRules();
    const establishments = Array.isArray(rules.establishments) ? rules.establishments : [];
    const target = establishments.find(est => est.username === username);
    const actor = req.actor || {};
    const writeOptions = {
      includeWriteResult: true,
      actor: {
        user: actor.user || 'unknown',
        role: actor.role || 'unknown',
      },
      meta: {
        change: action,
        username,
        role: role || null,
      },
    };
    let writeResult = null;

    if (action === 'create') {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
      }
      if (target) {
        return res.status(409).json({ error: 'Utilisateur déjà existant' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      establishments.push({
        id: `user_${crypto.randomUUID()}`,
        username,
        role,
        password: hashedPassword,
      });
      rules.establishments = establishments;
      ({ writeResult } = await saveAccessRules(rules, writeOptions));
    } else if (action === 'update-password') {
      if (!target) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      target.password = hashedPassword;
      ({ writeResult } = await saveAccessRules(rules, writeOptions));
    } else if (action === 'delete') {
      if (!target) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      rules.establishments = establishments.filter(est => est.username !== username);
      ({ writeResult } = await saveAccessRules(rules, writeOptions));
    } else {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      if (!target) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      target.role = role;
      ({ writeResult } = await saveAccessRules(rules, writeOptions));
    }

    await appendAudit({
      action: 'write',
      target: 'data/auth/access-rules.json',
      actor: {
        user: actor.user || 'unknown',
        role: actor.role || 'unknown',
      },
      via: actor.via || 'unknown',
      clientIp: actor.clientIp || null,
      beforeHash: writeResult?.beforeHash || hashContent(writeResult?.beforeContent),
      afterHash: writeResult?.afterHash || hashContent(writeResult?.afterContent),
      before: truncateSnapshot(writeResult?.beforeContent),
      after: truncateSnapshot(writeResult?.afterContent),
      snapshot: writeResult?.snapshot || null,
      historyId: writeResult?.historyId || null,
      meta: {
        change: action,
        username,
        role: role || null,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.code === 'JSON_STORE_LOCKED') {
      return res.status(423).json({ error: 'Règles d’accès verrouillées, réessayez dans quelques secondes' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erreur mise à jour rôle' });
  }
}

export default withAuthz('admin', handler);
