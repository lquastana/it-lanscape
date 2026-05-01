import * as _nextAuthNext from 'next-auth/next';
const getServerSession = _nextAuthNext.getServerSession ?? _nextAuthNext.default?.getServerSession;
import { authOptions } from '../../../lib/authOptions.js';
import { getExpiredAuthCookies } from '../../../lib/authCookies.js';

export default async function meRoute(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (process.env.AUTH_ENABLED === 'false') {
    return res.status(200).json({ user: { username: 'dev', role: 'admin', isLoggedIn: true } });
  }

  let session = null;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (error) {
    if (error?.name === 'JWEDecryptionFailed' || error?.message?.includes('decryption operation failed')) {
      res.setHeader('Set-Cookie', getExpiredAuthCookies(req));
      return res.status(200).json({ user: null, sessionReset: true });
    }
    throw error;
  }

  const user = session?.user?.isLoggedIn ? session.user : null;
  return res.status(200).json({ user });
}
