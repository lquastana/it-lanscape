import * as _nextAuthNext from 'next-auth/next';
const getServerSession = _nextAuthNext.getServerSession ?? _nextAuthNext.default?.getServerSession;
import { authOptions } from './authOptions.js';

export async function getActor(req, res) {
  if (process.env.AUTH_ENABLED === 'false') {
    return { user: 'dev', role: 'admin', via: 'disabled' };
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isLoggedIn) return null;

  return {
    user: session.user.username,
    role: session.user.role,
    via: 'session',
  };
}

export async function getUserRole(req, res) {
  const actor = await getActor(req, res);
  return actor?.role || null;
}
