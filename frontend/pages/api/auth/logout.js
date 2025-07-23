export default function handler(_req, res) {
  res.setHeader('Set-Cookie', 'user=; Path=/; Max-Age=0');
  res.writeHead(302, { Location: '/login.html' });
  res.end();
}
