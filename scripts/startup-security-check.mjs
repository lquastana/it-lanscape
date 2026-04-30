#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

const DEFAULT_NEXTAUTH_SECRETS = new Set([
  'change_me_at_least_32_chars',
  'replace-with-a-local-dev-secret-at-least-32-chars',
  'un-secret-local-de-dev-suffisamment-long-32c',
]);

const DEFAULT_ADMIN_PASSWORD = 'password';

function dataDirFor(cwd, env) {
  const envDir = env.DATA_DIR;
  if (envDir && envDir.trim().length > 0) return path.resolve(envDir);
  return path.join(cwd, 'data');
}

function isDefaultAdminPassword(passwordHash) {
  if (!passwordHash) return false;
  if (passwordHash === DEFAULT_ADMIN_PASSWORD) return true;

  try {
    return bcrypt.compareSync(DEFAULT_ADMIN_PASSWORD, passwordHash);
  } catch {
    return false;
  }
}

function findDefaultAdminAccount(cwd, env) {
  const accessRulesPath = path.join(dataDirFor(cwd, env), 'auth', 'access-rules.json');
  const content = fs.readFileSync(accessRulesPath, 'utf-8');
  const rules = JSON.parse(content);
  const establishments = Array.isArray(rules.establishments) ? rules.establishments : [];

  return establishments.find(account =>
    String(account?.username || '').toLowerCase() === 'admin' &&
    isDefaultAdminPassword(account.password)
  );
}

export function loadStartupEnv(cwd = process.cwd()) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFiles = [
    `.env.${nodeEnv}.local`,
    nodeEnv === 'test' ? null : '.env.local',
    `.env.${nodeEnv}`,
    '.env',
  ].filter(Boolean);

  for (const envFile of envFiles) {
    const envPath = path.join(cwd, envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
}

export function validateStartupSecurity({
  env = process.env,
  cwd = process.cwd(),
  logger = console,
} = {}) {
  const errors = [];
  const warnings = [];
  const applicationEnv = env.IT_LANDSCAPE_ENV || env.APP_ENV || env.NODE_ENV;
  const isProduction = applicationEnv === 'production';

  if (!isProduction) return { errors, warnings };

  const nextAuthSecret = env.NEXTAUTH_SECRET?.trim();
  if (!nextAuthSecret) {
    errors.push(
      'Configuration de production invalide: NEXTAUTH_SECRET est obligatoire.'
    );
  } else if (DEFAULT_NEXTAUTH_SECRETS.has(nextAuthSecret)) {
    errors.push(
      'Configuration de production invalide: NEXTAUTH_SECRET utilise une valeur par defaut.'
    );
  }

  const nextAuthUrl = env.NEXTAUTH_URL?.trim();
  if (!nextAuthUrl) {
    errors.push(
      'Configuration de production invalide: NEXTAUTH_URL est obligatoire.'
    );
  }

  const authEnabled = env.AUTH_ENABLED?.trim().toLowerCase();
  if (!authEnabled) {
    errors.push(
      'Configuration de production invalide: AUTH_ENABLED est obligatoire.'
    );
  } else if (authEnabled === 'false') {
    errors.push(
      "Configuration de production invalide: AUTH_ENABLED=false desactive l'authentification."
    );
  }

  try {
    if (findDefaultAdminAccount(cwd, env)) {
      errors.push(
        'Configuration de production invalide: le compte admin/password est encore present dans data/auth/access-rules.json.'
      );
    }
  } catch (error) {
    warnings.push(
      `Controle du compte admin/password impossible: ${error.message}`
    );
  }

  for (const warning of warnings) logger.warn(`[startup-security] WARNING: ${warning}`);

  if (errors.length > 0) {
    for (const error of errors) logger.error(`[startup-security] ERROR: ${error}`);
  }

  return { errors, warnings };
}

export function runStartupSecurityCheck(options = {}) {
  if (options.loadEnv !== false) {
    loadStartupEnv(options.cwd || process.cwd());
  }

  const { errors } = validateStartupSecurity(options);
  if (errors.length > 0) {
    throw new Error('Startup security check failed');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runStartupSecurityCheck();
  } catch (error) {
    console.error(`[startup-security] ${error.message}`);
    process.exit(1);
  }
}
