import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { evaluateAccess, sendUnauthorizedJson } from '../../lib/accessControl';

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_CHARS = /[\\/?*\[\]:]/g;

function buildSheetName(filename, fallbackIndex) {
  const base = filename.replace(/\.json$/i, '');
  const sanitized = base.replace(INVALID_SHEET_CHARS, ' ').trim();
  const truncated = sanitized.slice(0, MAX_SHEET_NAME_LENGTH) || `Sheet${fallbackIndex}`;
  return truncated;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await evaluateAccess(req, res);
  if (!access.allowed) {
    return sendUnauthorizedJson(res);
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.json'));

    const zip = new JSZip();
    const workbook = XLSX.utils.book_new();

    for (const [index, file] of files.entries()) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      zip.file(`data/${file}`, content);

      const sheetName = buildSheetName(file, index + 1);
      const sheet = XLSX.utils.aoa_to_sheet([['json'], [content]]);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }

    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    zip.file('snapshot.xlsx', xlsxBuffer);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="it-landscape-snapshot-${timestamp}.zip"`);
    res.status(200).send(zipBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur génération export' });
  }
}
