export default async function logoutRoute(req, res) {
  const siteUrl = process.env.NEXTAUTH_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  const useSecureCookies = siteUrl.startsWith('https://');
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const base = `Path=/; Expires=${expires}; HttpOnly; SameSite=Lax`;

  res.setHeader('Set-Cookie', [
    `__Secure-next-auth.session-token=; ${base}; Secure`,
    `next-auth.session-token=; ${base}${useSecureCookies ? '; Secure' : ''}`,
  ]);
  res.status(200).json({ ok: true });
}
