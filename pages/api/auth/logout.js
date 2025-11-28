import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../../lib/session';

export default async function logoutRoute(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
  res.status(200).json({ ok: true });
}