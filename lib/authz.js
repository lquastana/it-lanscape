import { getActor } from './auth.js';
import { sendUnauthorizedJson } from './accessControl.js';
import { authorize } from './roles.js';

export { authorize };

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
