import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getDataDir, resolveDataPath } from './dataPaths.js';

const LOCK_TIMEOUT_MS = Number(process.env.JSON_STORE_LOCK_TIMEOUT_MS || 5000);
const LOCK_RETRY_MS = Number(process.env.JSON_STORE_LOCK_RETRY_MS || 75);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sha256(content) {
  if (content === null || content === undefined) return null;
  return crypto.createHash('sha256').update(content).digest('hex');
}

function relativeToDataDir(filePath) {
  return path.relative(getDataDir(), filePath).split(path.sep).join('/');
}

function safeSnapshotName(target, id) {
  return `${target.replace(/[^a-z0-9._-]+/gi, '__')}.${id}.json`;
}

async function appendHistory(record) {
  const historyPath = resolveDataPath('.history', 'history.jsonl');
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.appendFile(historyPath, `${JSON.stringify(record)}\n`, 'utf-8');
}

async function snapshotBeforeWrite(filePath, beforeContent, target, id) {
  if (beforeContent === null || beforeContent === undefined) return null;

  const day = new Date().toISOString().slice(0, 10);
  const snapshotsDir = resolveDataPath('.history', 'snapshots', day);
  const snapshotPath = path.join(snapshotsDir, safeSnapshotName(target, id));
  await fs.mkdir(snapshotsDir, { recursive: true });
  await fs.writeFile(snapshotPath, beforeContent, { encoding: 'utf-8', flag: 'wx' });
  return relativeToDataDir(snapshotPath);
}

async function acquireFileLock(filePath, timeoutMs = LOCK_TIMEOUT_MS) {
  const lockPath = `${filePath}.lock`;
  const startedAt = Date.now();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  while (true) {
    let handle = null;
    try {
      handle = await fs.open(lockPath, 'wx');
      await handle.writeFile(JSON.stringify({
        pid: process.pid,
        target: relativeToDataDir(filePath),
        createdAt: new Date().toISOString(),
      }, null, 2));

      return async function releaseLock() {
        try {
          await handle.close();
        } finally {
          await fs.rm(lockPath, { force: true });
        }
      };
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - startedAt >= timeoutMs) {
        const lockError = new Error(`Verrou d'ecriture deja present: ${relativeToDataDir(lockPath)}`);
        lockError.code = 'JSON_STORE_LOCKED';
        throw lockError;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

export async function writeJsonFileSafely(filePath, data, options = {}) {
  const target = options.target || relativeToDataDir(filePath);
  const action = options.action || 'write';
  const id = crypto.randomUUID();
  const payload = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.${id}.tmp`;
  const releaseLock = await acquireFileLock(filePath, options.lockTimeoutMs);
  let beforeContent = null;
  let snapshotPath = null;

  try {
    beforeContent = await fs.readFile(filePath, 'utf-8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    snapshotPath = await snapshotBeforeWrite(filePath, beforeContent, target, id);

    await fs.writeFile(tempPath, payload, { encoding: 'utf-8', flag: 'wx' });
    await fs.rename(tempPath, filePath);

    const historyRecord = {
      id,
      ts: new Date().toISOString(),
      action,
      target,
      actor: options.actor || null,
      beforeHash: sha256(beforeContent),
      afterHash: sha256(payload),
      snapshot: snapshotPath,
      bytes: Buffer.byteLength(payload, 'utf-8'),
      meta: options.meta || null,
    };
    await appendHistory(historyRecord);

    return {
      beforeContent,
      afterContent: payload,
      beforeHash: historyRecord.beforeHash,
      afterHash: historyRecord.afterHash,
      snapshot: snapshotPath,
      historyId: id,
    };
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  } finally {
    await releaseLock();
  }
}
