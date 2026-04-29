import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// ── RBAC logic ────────────────────────────────────────────────────────────────
// Teste authorize() directement — pas de dépendance next-auth
const { authorize } = await import('../lib/roles.js');

assert.equal(authorize('read',  'viewer'), true,  'viewer peut lire');
assert.equal(authorize('write', 'viewer'), false, 'viewer ne peut pas écrire');
assert.equal(authorize('write', 'editor'), true,  'editor peut écrire');
assert.equal(authorize('admin', 'editor'), false, 'editor ne peut pas administrer');
assert.equal(authorize('admin', 'admin'),  true,  'admin peut administrer');
assert.equal(authorize('read',  null),     false, 'sans rôle → refusé');

// ── Audit log ─────────────────────────────────────────────────────────────────
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-'));
process.env.DATA_DIR = tempDir;

try {
  const { appendAudit } = await import('../lib/audit.js');

  await appendAudit({
    action: 'write',
    target: 'data/rbac-editor-test.json',
    actor: { user: 'editor', role: 'editor' },
    via: 'session',
    clientIp: '127.0.0.1',
    beforeHash: null,
    afterHash: 'abc123',
    bytes: 42,
  });

  const auditPath = path.join(tempDir, 'audit-log.jsonl');
  const auditContent = await fs.readFile(auditPath, 'utf-8');
  const lines = auditContent.trim().split('\n');
  const lastEntry = JSON.parse(lines[lines.length - 1]);

  assert.equal(lastEntry.action, 'write');
  assert.equal(lastEntry.actor?.user, 'editor');
  assert.equal(lastEntry.actor?.role, 'editor');
  assert.equal(lastEntry.target, 'data/rbac-editor-test.json');
  assert.ok(lastEntry.ts, 'timestamp présent');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('RBAC audit tests: OK');
