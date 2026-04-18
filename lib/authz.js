import { getActor } from './auth.js';
import { sendUnauthorizedJson } from './accessControl.js';

const ROLE_ORDER = ['viewer', 'editor', 'admin'];

export function authorize(action, role) {
  if (!role) return false;
  const roleIndex = ROLE_ORDER.indexOf(role);
  if (roleIndex < 0) return false;
  if (action === 'read') return roleIndex >= ROLE_ORDER.indexOf('viewer');
  if (action === 'write') return roleIndex >= ROLE_ORDER.indexOf('editor');
  if (action === 'admin') return roleIndex >= ROLE_ORDER.indexOf('admin');
  return false;
}

export function withAuthz(action, handler) {
  return async function authzHandler(req, res) {
    const actor = await getActor(req, res);
    if (!actor) {
      return sendUnauthorizedJson(res);
    }
    if (!authorize(action, actor.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    req.actor = actor;
    return handler(req, res);
  };
}
