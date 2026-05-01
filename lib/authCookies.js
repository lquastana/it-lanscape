const AUTH_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.pkce.code_verifier',
  '__Secure-next-auth.pkce.code_verifier',
  'next-auth.state',
  '__Secure-next-auth.state',
  'next-auth.nonce',
  '__Secure-next-auth.nonce',
];

function shouldUseSecureCookies(req) {
  const configuredUrl = process.env.NEXTAUTH_URL || '';
  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  return configuredUrl.startsWith('https://') || forwardedProto === 'https';
}

function expiredCookie(name, secure) {
  const secureAttr = secure || name.startsWith('__Secure-') || name.startsWith('__Host-')
    ? '; Secure'
    : '';
  return `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureAttr}`;
}

export function getExpiredAuthCookies(req) {
  const secure = shouldUseSecureCookies(req);
  return AUTH_COOKIE_NAMES.map(name => expiredCookie(name, secure));
}
