import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadAccessRules } from '../lib/accessControl.js';

const previousEnv = {
  DATA_DIR: process.env.DATA_DIR,
  NODE_ENV: process.env.NODE_ENV,
  IT_LANDSCAPE_ENV: process.env.IT_LANDSCAPE_ENV,
  APP_ENV: process.env.APP_ENV,
};
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-access-control-'));
const accessRulesPath = path.join(tempDir, 'auth', 'access-rules.json');

try {
  process.env.DATA_DIR = tempDir;
  process.env.NODE_ENV = 'production';
  delete process.env.IT_LANDSCAPE_ENV;
  delete process.env.APP_ENV;

  await assert.rejects(loadAccessRules(), {
    code: 'ACCESS_RULES_REQUIRED_IN_PRODUCTION',
  });
  await assert.rejects(fs.access(accessRulesPath), { code: 'ENOENT' });
} finally {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('Access control runtime tests: OK');
