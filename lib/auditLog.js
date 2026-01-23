import fs from 'fs/promises';
import path from 'path';

const AUDIT_LOG_FILENAME = 'audit-log.jsonl';

export async function appendAuditEvent(event) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  const line = `${JSON.stringify(entry)}\n`;
  const filePath = path.join(process.cwd(), 'data', AUDIT_LOG_FILENAME);
  try {
    await fs.appendFile(filePath, line, 'utf-8');
  } catch (error) {
    console.error('Impossible d\'écrire dans le journal d\'audit', error);
  }
}
