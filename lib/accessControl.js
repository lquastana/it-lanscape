import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { getIronSession } from 'iron-session';
import { sessionOptions } from './session.js';
import { resolveDataPath } from './dataPaths.js';

let cachedRules = null;
let cachedRulesPath = null;

const DEFAULT_PASSWORD_HASH = '$2b$10$3jG7hSCVmYgBuLK6/uX97ur/0iRcwkFfxZyH88Myt0YAQqs1kMLCy';

export function isAccessControlEnabled() {
  const flag = process.env.ACCESS_CONTROL_ENABLED;
  if (typeof flag === 'string') {
    const normalized = flag.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
  }
  return true;
}

async function ensureAccessRulesFile(rulesPath) {
  try {
    await fs.access(rulesPath);
    return null;
  } catch {
    const defaultRules = {
      allowedIps: ['127.0.0.1'],
      allowedCidrs: [],
      establishments: [
        {
          id: 'dev_viewer',
          username: 'viewer',
          password: DEFAULT_PASSWORD_HASH,
          role: 'viewer',
        },
        {
          id: 'dev_editor',
          username: 'editor',
          password: DEFAULT_PASSWORD_HASH,
          role: 'editor',
        },
        {
          id: 'dev_admin',
          username: 'admin',
          password: DEFAULT_PASSWORD_HASH,
          role: 'admin',
        },
      ],
    };
    await fs.mkdir(path.dirname(rulesPath), { recursive: true });
    await fs.writeFile(rulesPath, JSON.stringify(defaultRules, null, 2), 'utf-8');
    return defaultRules;
  }
}

function normalizeRules(rules) {
  const establishments = Array.isArray(rules.establishments)
    ? rules.establishments.map(est => ({
      ...est,
      role: est.role || 'editor',
    }))
    : [];
  return {
    allowedIps: Array.isArray(rules.allowedIps) ? rules.allowedIps : [],
    allowedCidrs: Array.isArray(rules.allowedCidrs) ? rules.allowedCidrs : [],
    establishments,
  };
}

export async function loadAccessRules() {
  const rulesPath = resolveDataPath('auth', 'access-rules.json');
  if (cachedRules && cachedRulesPath === rulesPath) return cachedRules;
  try {
    const created = await ensureAccessRulesFile(rulesPath);
    if (created) {
      cachedRules = normalizeRules(created);
      cachedRulesPath = rulesPath;
      return cachedRules;
    }
    const content = await fs.readFile(rulesPath, 'utf-8');
    cachedRules = normalizeRules(JSON.parse(content));
    cachedRulesPath = rulesPath;
  } catch (error) {
    console.error('Impossible de charger les règles d\'accès', error);
    cachedRules = { allowedIps: [], allowedCidrs: [], establishments: [] };
    cachedRulesPath = rulesPath;
  }
  return cachedRules;
}

export function extractClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return normalizeIp(first);
  }
  const candidate = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (candidate) return normalizeIp(candidate);
  return null;
}

function normalizeIp(ip) {
  if (!ip) return null;
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function cidrToMask(prefixLength) {
  if (prefixLength <= 0) return 0;
  if (prefixLength >= 32) return 0xffffffff;
  return (0xffffffff << (32 - prefixLength)) >>> 0;
}

function ipInCidr(ip, cidr) {
  const [network, prefix] = cidr.split('/');
  const prefixLength = prefix ? parseInt(prefix, 10) : 32;
  const ipNum = ipToLong(ip);
  const networkNum = ipToLong(network);
  if (ipNum === null || networkNum === null) return false;
  const mask = cidrToMask(prefixLength);
  return (ipNum & mask) === (networkNum & mask);
}

export function isIpAllowed(ip, rules) {
  if (!ip) return false;
  if (rules.allowedIps?.includes(ip)) return true;
  if (Array.isArray(rules.allowedCidrs)) {
    return rules.allowedCidrs.some(cidr => ipInCidr(ip, cidr));
  }
  return false;
}

function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const base64Credentials = authHeader.replace('Basic ', '');
  try {
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

export function extractBasicAuthUser(authHeader) {
  const credentials = parseBasicAuth(authHeader);
  return credentials?.username || null;
}

export async function validateBasicCredentials(authHeader, rules) {
  const credentials = parseBasicAuth(authHeader);
  if (!credentials) return false;
  const establishment = rules.establishments?.find(e => e.username === credentials.username);
  if (!establishment) return false;
  try {
    const matches = await bcrypt.compare(credentials.password, establishment.password);
    if (!matches) return false;
    return establishment;
  } catch {
    return false;
  }
}

export async function evaluateAccess(req, res) {
  // Check for DISABLE_AUTH environment variable first
  if (process.env.DISABLE_AUTH === 'true') {
    return { allowed: true, via: 'DISABLE_AUTH' };
  }

  if (res) {
    try {
      const session = await getIronSession(req, res, sessionOptions);
      if (session?.user?.isLoggedIn) {
        return { allowed: true, via: 'session' };
      }
    } catch {
      // Fall through to IP/basic auth checks
    }
  }

  if (!isAccessControlEnabled()) {
    return { allowed: true, via: 'disabled' };
  }

  const rules = await loadAccessRules();
  const clientIp = extractClientIp(req);

  // First, check if IP is allowed. If not, deny access.
  if (!isIpAllowed(clientIp, rules)) {
    return { allowed: false, clientIp, reason: 'IP not allowed' };
  }

  // If IP is allowed, we now also require valid credentials.
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const credentialsValid = await validateBasicCredentials(authHeader, rules);

  if (credentialsValid) {
    // Only grant access if both IP and credentials are valid.
    return { allowed: true, via: 'ip-and-basic', clientIp };
  }

  // If IP was ok but credentials were not, deny access.
  return { allowed: false, clientIp, reason: 'Invalid credentials' };
}

export function sendUnauthorizedJson(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Accès restreint", charset="UTF-8"');
  res.status(401).json({ error: 'Accès non autorisé' });
}

export function sendUnauthorizedPage(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Accès restreint", charset="UTF-8"');
  res.statusCode = 401;
  res.end('Accès non autorisé');
}
