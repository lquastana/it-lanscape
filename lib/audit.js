import fs from 'fs/promises';
import crypto from 'crypto';
import { resolveDataPath } from './dataPaths.js';

const AUDIT_LOG_FILENAME = 'audit-log.jsonl';
const MAX_SNAPSHOT_BYTES = 2048;

export function hashContent(content) {
  if (content === null || content === undefined) return null;
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function truncateSnapshot(content) {
  if (content === null || content === undefined) return null;
  const buffer = Buffer.from(content, 'utf-8');
  if (buffer.length <= MAX_SNAPSHOT_BYTES) {
    return content;
  }
  return `${buffer.subarray(0, MAX_SNAPSHOT_BYTES).toString('utf-8')}…`;
}

export async function appendAudit(entry) {
  const record = {
    ts: new Date().toISOString(),
    ...entry,
  };
  const line = `${JSON.stringify(record)}\n`;
  const filePath = resolveDataPath(AUDIT_LOG_FILENAME);
  try {
    await fs.appendFile(filePath, line, 'utf-8');
  } catch (error) {
    console.error('Impossible d\'écrire dans le journal d\'audit', error);
  }
}
