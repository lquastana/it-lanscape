import { getIronSession } from 'iron-session';
import {
  extractClientIp,
  isAccessControlEnabled,
  isIpAllowed,
  loadAccessRules,
  validateBasicCredentials,
} from './accessControl.js';
import { sessionOptions } from './session.js';

export async function getActor(req, res) {
  const clientIp = extractClientIp(req);

  if (process.env.DISABLE_AUTH === 'true' || !isAccessControlEnabled()) {
    return {
      user: 'disabled',
      role: 'admin',
      via: 'disabled',
      clientIp,
    };
  }

  if (res) {
    try {
      const session = await getIronSession(req, res, sessionOptions);
      if (session?.user?.isLoggedIn) {
        const role = session.user.role || 'editor';
        return {
          user: session.user.username,
          role,
          via: 'session',
          clientIp,
        };
      }
    } catch {
      // Fall through to basic auth
    }
  }

  const rules = await loadAccessRules();
  if (!isIpAllowed(clientIp, rules)) {
    return null;
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const establishment = await validateBasicCredentials(authHeader, rules);
  if (!establishment) {
    return null;
  }

  return {
    user: establishment.username,
    role: establishment.role || 'editor',
    via: 'basic',
    clientIp,
  };
}

export async function getUserRole(req, res) {
  const actor = await getActor(req, res);
  return actor?.role || null;
}
