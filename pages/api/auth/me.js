import * as _nextAuthNext from 'next-auth/next';
const getServerSession = _nextAuthNext.getServerSession ?? _nextAuthNext.default?.getServerSession;
import { authOptions } from '../../../lib/authOptions.js';

export default async function meRoute(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (process.env.AUTH_ENABLED === 'false') {
    return res.status(200).json({ user: { username: 'dev', role: 'admin', isLoggedIn: true } });
  }

  const session = await getServerSession(req, res, authOptions);
  const user = session?.user?.isLoggedIn ? session.user : null;
  return res.status(200).json({ user });
}
