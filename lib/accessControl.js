import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';

let cachedRules = null;

function isAccessControlEnabled() {
  const flag = process.env.ACCESS_CONTROL_ENABLED;
  if (typeof flag === 'string') {
    const normalized = flag.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
  }
  return true;
}

async function loadAccessRules() {
  if (cachedRules) return cachedRules;
  const rulesPath = path.join(process.cwd(), 'data', 'auth', 'access-rules.json');
  try {
    const content = await fs.readFile(rulesPath, 'utf-8');
    cachedRules = JSON.parse(content);
  } catch (error) {
    console.error('Impossible de charger les règles d\'accès', error);
    cachedRules = { allowedIps: [], allowedCidrs: [], establishments: [] };
  }
  return cachedRules;
}

function extractClientIp(req) {
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

function isIpAllowed(ip, rules) {
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

async function validateCredentials(authHeader, rules) {
  const credentials = parseBasicAuth(authHeader);
  if (!credentials) return false;
  const establishment = rules.establishments?.find(e => e.username === credentials.username);
  if (!establishment) return false;
  try {
    return await bcrypt.compare(credentials.password, establishment.password);
  } catch {
    return false;
  }
}

export async function evaluateAccess(req) {
  if (!isAccessControlEnabled()) {
    return { allowed: true, via: 'disabled' };
  }

  const rules = await loadAccessRules();
  const clientIp = extractClientIp(req);

  if (isIpAllowed(clientIp, rules)) {
    return { allowed: true, via: 'ip', clientIp };
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const credentialsValid = await validateCredentials(authHeader, rules);
  if (credentialsValid) {
    return { allowed: true, via: 'basic', clientIp };
  }

  return { allowed: false, clientIp };
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
