import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-'));
process.env.DATA_DIR = tempDir;

const { default: handler } = await import('../pages/api/file/[name].js');

function createReq({ method, name, body, authHeader }) {
  return {
    method,
    query: { name },
    body,
    headers: {
      authorization: authHeader,
    },
    ip: '127.0.0.1',
  };
}

function createRes() {
  let statusCode = 200;
  let payload;
  const headers = {};
  return {
    setHeader(key, value) {
      headers[key] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
    send(data) {
      payload = data;
      return this;
    },
    end(data) {
      payload = data;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
    get headers() {
      return headers;
    },
  };
}

function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

try {
  const viewerReq = createReq({
    method: 'POST',
    name: 'rbac-viewer-test',
    body: { ok: true },
    authHeader: basicAuth('viewer', 'password'),
  });
  const viewerRes = createRes();
  await handler(viewerReq, viewerRes);
  assert.equal(viewerRes.statusCode, 403, 'viewer should be forbidden to write');

  const editorReq = createReq({
    method: 'POST',
    name: 'rbac-editor-test',
    body: { hello: 'world' },
    authHeader: basicAuth('editor', 'password'),
  });
  const editorRes = createRes();
  await handler(editorReq, editorRes);
  assert.equal(editorRes.statusCode, 200, 'editor should be able to write');

  const auditPath = path.join(tempDir, 'audit-log.jsonl');
  const auditContent = await fs.readFile(auditPath, 'utf-8');
  const lines = auditContent.trim().split('\n');
  const lastEntry = JSON.parse(lines[lines.length - 1]);

  assert.equal(lastEntry.action, 'write');
  assert.equal(lastEntry.actor?.user, 'editor');
  assert.equal(lastEntry.actor?.role, 'editor');
  assert.equal(lastEntry.target, 'data/rbac-editor-test.json');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('RBAC audit tests: OK');
