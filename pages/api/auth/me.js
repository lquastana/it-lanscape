import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../../lib/session';

export default async function meRoute(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getIronSession(req, res, sessionOptions);
  const user = session?.user?.isLoggedIn ? session.user : null;
  return res.status(200).json({
    user: user
      ? {
        username: user.username,
        role: user.role || 'editor',
        isLoggedIn: true,
      }
      : null,
  });
}
