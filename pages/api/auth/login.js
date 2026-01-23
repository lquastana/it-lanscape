import { getIronSession } from 'iron-session';
import { loadAccessRules, extractClientIp, isIpAllowed } from '../../../lib/accessControl';
import bcrypt from 'bcrypt';
import { sessionOptions } from '../../../lib/session';

async function findUser(username) {
  const rules = await loadAccessRules();
  return rules.establishments?.find(e => e.username === username);
}

export default async function loginRoute(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  try {
    const rules = await loadAccessRules();
    const clientIp = extractClientIp(req);

    if (!isIpAllowed(clientIp, rules)) {
      return res.status(403).json({ message: 'IP address not allowed' });
    }

    const user = await findUser(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const session = await getIronSession(req, res, sessionOptions);
    session.user = {
      username: user.username,
      id: user.id,
      role: user.role || 'editor',
      isLoggedIn: true,
    };
    await session.save();

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An internal server error occurred' });
  }
}
