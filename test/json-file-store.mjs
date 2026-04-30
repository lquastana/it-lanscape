import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeJsonFileSafely } from '../lib/jsonFileStore.js';

const previousDataDir = process.env.DATA_DIR;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'it-landscape-json-store-'));
process.env.DATA_DIR = tempDir;

try {
  const filePath = path.join(tempDir, 'example.json');
  await fs.writeFile(filePath, JSON.stringify({ value: 1 }, null, 2), 'utf-8');

  const result = await writeJsonFileSafely(filePath, { value: 2 }, {
    target: 'example.json',
    actor: { user: 'test', role: 'admin' },
  });

  assert.equal(await fs.readFile(filePath, 'utf-8'), JSON.stringify({ value: 2 }, null, 2));
  await assert.rejects(fs.access(`${filePath}.lock`), { code: 'ENOENT' });
  assert.match(result.snapshot, /^\.history\/snapshots\/\d{4}-\d{2}-\d{2}\/example\.json\./);

  const snapshotContent = await fs.readFile(path.join(tempDir, result.snapshot), 'utf-8');
  assert.equal(snapshotContent, JSON.stringify({ value: 1 }, null, 2));

  const historyContent = await fs.readFile(path.join(tempDir, '.history', 'history.jsonl'), 'utf-8');
  const history = historyContent.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(history.length, 1);
  assert.equal(history[0].target, 'example.json');
  assert.equal(history[0].snapshot, result.snapshot);

  const lockedFilePath = path.join(tempDir, 'locked.json');
  await fs.writeFile(`${lockedFilePath}.lock`, 'busy', 'utf-8');
  await assert.rejects(
    writeJsonFileSafely(lockedFilePath, { value: 3 }, { lockTimeoutMs: 10 }),
    { code: 'JSON_STORE_LOCKED' }
  );
} finally {
  if (previousDataDir === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = previousDataDir;
  }
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('JSON file store tests: OK');
