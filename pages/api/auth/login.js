import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'auth', 'users.json'), 'utf-8');
    const users = JSON.parse(data);
    const user = users.find(u => u.username === username);
    if (!user) throw new Error('No user');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('Bad password');
    res.setHeader('Set-Cookie', `user=${user.id}; Path=/; HttpOnly`);
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch {
    res.writeHead(302, { Location: '/login.html?error=1' });
    res.end();
  }
}
