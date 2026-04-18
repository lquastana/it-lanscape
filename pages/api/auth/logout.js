export default async function logoutRoute(req, res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieName = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`);
  res.status(200).json({ ok: true });
}
