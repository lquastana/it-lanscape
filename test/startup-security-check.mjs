import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { validateStartupSecurity } from '../scripts/startup-security-check.mjs';

async function withAccessRules(establishments, testFn) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-startup-'));
  const authDir = path.join(tempDir, 'auth');
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, 'access-rules.json'),
    JSON.stringify({ establishments }, null, 2),
    'utf-8'
  );

  try {
    await testFn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function captureLogger() {
  const warnings = [];
  const errors = [];
  return {
    logger: {
      warn(message) { warnings.push(message); },
      error(message) { errors.push(message); },
    },
    warnings,
    errors,
  };
}

const safeAdminHash = bcrypt.hashSync('not-the-default-password', 10);
const defaultAdminHash = bcrypt.hashSync('password', 10);

await withAccessRules(
  [{ username: 'admin', password: defaultAdminHash, role: 'admin' }],
  async dataDir => {
    const { warnings, errors, logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'development',
        NEXTAUTH_SECRET: 'change_me_at_least_32_chars',
        AUTH_ENABLED: 'false',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(warnings, []);
    assert.deepEqual(errors, []);
  }
);

await withAccessRules(
  [{ username: 'admin', password: defaultAdminHash, role: 'admin' }],
  async dataDir => {
    const { warnings, errors, logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        IT_LANDSCAPE_ENV: 'development',
        NEXTAUTH_SECRET: 'change_me_at_least_32_chars',
        AUTH_ENABLED: 'false',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(warnings, []);
    assert.deepEqual(errors, []);
  }
);

await withAccessRules(
  [{ username: 'admin', password: safeAdminHash, role: 'admin' }],
  async dataDir => {
    const { logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'change_me_at_least_32_chars',
        NEXTAUTH_URL: 'https://it-landscape.example.org',
        AUTH_ENABLED: 'true',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /NEXTAUTH_SECRET/);
  }
);

await withAccessRules(
  [{ username: 'admin', password: safeAdminHash, role: 'admin' }],
  async dataDir => {
    const { logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'strong-production-secret-value',
        NEXTAUTH_URL: 'https://it-landscape.example.org',
        AUTH_ENABLED: 'false',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /AUTH_ENABLED=false/);
  }
);

await withAccessRules(
  [{ username: 'admin', password: safeAdminHash, role: 'admin' }],
  async dataDir => {
    const { logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.equal(result.errors.length, 3);
    assert.ok(result.errors.some(error => error.includes('NEXTAUTH_SECRET')));
    assert.ok(result.errors.some(error => error.includes('NEXTAUTH_URL')));
    assert.ok(result.errors.some(error => error.includes('AUTH_ENABLED')));
  }
);

{
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-startup-missing-rules-'));
  try {
    const { logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'strong-production-secret-value',
        NEXTAUTH_URL: 'https://it-landscape.example.org',
        AUTH_ENABLED: 'true',
        DATA_DIR: tempDir,
      },
      logger,
    });

    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /access-rules\.json est obligatoire/);
    assert.deepEqual(result.warnings, []);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

await withAccessRules(
  [{ username: 'admin', password: defaultAdminHash, role: 'admin' }],
  async dataDir => {
    const { warnings, errors, logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'strong-production-secret-value',
        NEXTAUTH_URL: 'https://it-landscape.example.org',
        AUTH_ENABLED: 'true',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /admin\/password/);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(warnings, []);
    assert.equal(errors.length, 1);
  }
);

await withAccessRules(
  [{ username: 'admin', password: safeAdminHash, role: 'admin' }],
  async dataDir => {
    const { logger } = captureLogger();
    const result = validateStartupSecurity({
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'strong-production-secret-value',
        NEXTAUTH_URL: 'https://it-landscape.example.org',
        AUTH_ENABLED: 'true',
        DATA_DIR: dataDir,
      },
      logger,
    });

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
  }
);

console.log('Startup security check tests: OK');
