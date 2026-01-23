import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { evaluateAccess, sendUnauthorizedJson } from '../../lib/accessControl';

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_CHARS = /[\\/?*\[\]:]/g;

function sanitizeSheetName(name) {
  const sanitized = name.replace(INVALID_SHEET_CHARS, ' ').trim();
  return sanitized.slice(0, MAX_SHEET_NAME_LENGTH) || 'Sheet';
}

function buildSheetName(prefix, filename, fallbackIndex) {
  const base = filename.replace(/\.json$/i, '');
  const rawName = `${prefix}${base}`;
  const sanitized = sanitizeSheetName(rawName);
  return sanitized || `Sheet${fallbackIndex}`;
}

function flattenLandscape(json, file) {
  const rows = [];
  (json.etablissements || []).forEach(etab => {
    (etab.domaines || []).forEach(dom => {
      (dom.processus || []).forEach(proc => {
        (proc.applications || []).forEach(app => {
          rows.push({
            fichier: file,
            etablissement: etab.nom || '',
            domaine: dom.nom || '',
            processus: proc.nom || '',
            application: app.nom || '',
            description: app.description || '',
            editeur: app.editeur || '',
            referent: app.referent || '',
            hebergement: app.hebergement || '',
            multiEtablissement: app.multiEtablissement ?? '',
            criticite: app.criticite || '',
            trigramme: app.trigramme || '',
          });
        });
      });
    });
  });
  return rows;
}

function buildSheetFromRows(rows) {
  if (!rows.length) {
    return XLSX.utils.aoa_to_sheet([['empty']]);
  }
  return XLSX.utils.json_to_sheet(rows);
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

      let sheetName = buildSheetName('', file, index + 1);
      let sheetRows = [];

      try {
        const json = JSON.parse(content);
        if (file.endsWith('.infra.json')) {
          sheetName = buildSheetName('infra_', file, index + 1);
          sheetRows = Array.isArray(json.serveurs) ? json.serveurs : [];
        } else if (file.endsWith('.network.json')) {
          sheetName = buildSheetName('network_', file, index + 1);
          sheetRows = Array.isArray(json.vlans) ? json.vlans : [];
        } else if (file.endsWith('.flux.json')) {
          sheetName = buildSheetName('flux_', file, index + 1);
          sheetRows = Array.isArray(json.flux) ? json.flux : [];
        } else if (file === 'trigrammes.json') {
          sheetName = buildSheetName('trigrammes_', file, index + 1);
          sheetRows = Object.entries(json).map(([trigramme, application]) => ({
            trigramme,
            application,
          }));
        } else if (Array.isArray(json.etablissements)) {
          sheetName = buildSheetName('apps_', file, index + 1);
          sheetRows = flattenLandscape(json, file);
        } else {
          sheetRows = [{ fichier: file, json: content }];
        }
      } catch {
        sheetRows = [{ fichier: file, json: content }];
      }

      const sheet = buildSheetFromRows(sheetRows);
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
