import { getExpiredAuthCookies } from '../../../lib/authCookies.js';

export default async function logoutRoute(req, res) {
  res.setHeader('Set-Cookie', getExpiredAuthCookies(req));
  res.status(200).json({ ok: true });
}
