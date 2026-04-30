import fs from 'fs/promises';
import path from 'path';
import { resolveDataPath } from './dataPaths.js';
import { writeJsonFileSafely } from './jsonFileStore.js';

let cachedRules = null;
let cachedRulesPath = null;

const DEFAULT_PASSWORD_HASH = '$2b$10$3jG7hSCVmYgBuLK6/uX97ur/0iRcwkFfxZyH88Myt0YAQqs1kMLCy';

function isProductionRuntime(env = process.env) {
  const applicationEnv = env.IT_LANDSCAPE_ENV || env.APP_ENV || env.NODE_ENV;
  return applicationEnv === 'production';
}

async function ensureAccessRulesFile(rulesPath) {
  try {
    await fs.access(rulesPath);
    return null;
  } catch {
    if (isProductionRuntime()) {
      const error = new Error(
        'Configuration de production invalide: data/auth/access-rules.json est obligatoire.'
      );
      error.code = 'ACCESS_RULES_REQUIRED_IN_PRODUCTION';
      throw error;
    }

    const defaultRules = {
      establishments: [
        { id: 'dev_viewer', username: 'viewer', password: DEFAULT_PASSWORD_HASH, role: 'viewer' },
        { id: 'dev_editor', username: 'editor', password: DEFAULT_PASSWORD_HASH, role: 'editor' },
        { id: 'dev_admin', username: 'admin', password: DEFAULT_PASSWORD_HASH, role: 'admin' },
      ],
    };
    await fs.mkdir(path.dirname(rulesPath), { recursive: true });
    await fs.writeFile(rulesPath, JSON.stringify(defaultRules, null, 2), 'utf-8');
    return defaultRules;
  }
}

function normalizeRules(rules) {
  const establishments = Array.isArray(rules.establishments)
    ? rules.establishments.map(est => ({ ...est, role: est.role || 'editor' }))
    : [];
  return { establishments };
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
    if (isProductionRuntime()) throw error;
    console.error('Impossible de charger les règles d\'accès', error);
    cachedRules = { establishments: [] };
    cachedRulesPath = rulesPath;
  }
  return cachedRules;
}

export async function saveAccessRules(rules, options = {}) {
  const rulesPath = resolveDataPath('auth', 'access-rules.json');
  const normalized = normalizeRules(rules);
  await fs.mkdir(path.dirname(rulesPath), { recursive: true });
  const writeResult = await writeJsonFileSafely(rulesPath, normalized, {
    target: 'auth/access-rules.json',
    action: 'rbac-rules-write',
    actor: options.actor || null,
    meta: options.meta || null,
  });
  cachedRules = normalized;
  cachedRulesPath = rulesPath;
  if (options.includeWriteResult) {
    return { rules: normalized, writeResult };
  }
  return normalized;
}

export function sendUnauthorizedJson(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Accès restreint", charset="UTF-8"');
  res.status(401).json({ error: 'Accès non autorisé' });
}
