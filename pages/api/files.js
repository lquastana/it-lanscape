import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { withAuthz } from '../../lib/authz.js';
import { getDataDir, resolveDataPath } from '../../lib/dataPaths.js';
import { appendAudit, hashContent, truncateSnapshot } from '../../lib/audit.js';

const require = createRequire(import.meta.url);
const ETAB_TEMPLATE    = require('../../lib/templates/etablissement-sante.json');
const INFRA_TEMPLATE   = require('../../lib/templates/infra-sante.json');
const NETWORK_TEMPLATE = require('../../lib/templates/network-sante.json');
const FLUX_TEMPLATE    = require('../../lib/templates/flux-sante.json');

const FILENAME_RE = /^[a-z0-9_-]+$/;

function computePfx(filename) {
  const parts = filename.split('_');
  if (parts.length >= 3) return parts.map(p => p[0]).join('').slice(0, 3);
  if (parts.length === 2) return (parts[0][0] + parts[1].slice(0, 2)).slice(0, 3);
  return filename.slice(0, 3);
}

function computeIpOctet(filename) {
  const sum = Array.from(filename).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return String(100 + (sum % 154));
}

function applyTemplate(template, vars) {
  const raw = JSON.stringify(template);
  const replaced = raw.replace(/__(?:NOM|PFX_UP|PFX|IP)__/g, m => vars[m] ?? m);
  return JSON.parse(replaced);
}

async function getHandler(req, res) {
  try {
    const dataDir = getDataDir();
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.json'));
    res.status(200).json({ files });
  } catch {
    res.status(500).json({ error: 'Erreur lecture répertoire' });
  }
}

async function postHandler(req, res) {
  const { filename, nom } = req.body || {};
  if (!filename || !FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Nom de fichier invalide (lettres minuscules, chiffres, tirets, underscores)' });
  }
  if (!nom || !String(nom).trim().length) {
    return res.status(400).json({ error: "Nom d'établissement requis" });
  }

  const safeName = path.basename(filename) + '.json';
  const filePath = resolveDataPath(safeName);

  try {
    await fs.access(filePath);
    return res.status(409).json({ error: 'Un fichier avec ce nom existe déjà' });
  } catch { /* file doesn't exist — proceed */ }

  const nomTrimmed = String(nom).trim();
  const pfx = computePfx(filename);
  const ipOctet = computeIpOctet(filename);
  const vars = {
    '__NOM__':    nomTrimmed,
    '__PFX__':    pfx,
    '__PFX_UP__': pfx.toUpperCase(),
    '__IP__':     ipOctet,
  };

  const content = applyTemplate(ETAB_TEMPLATE, vars);
  const payload = JSON.stringify(content, null, 2);

  const companions = [
    { suffix: '.flux',    data: applyTemplate(FLUX_TEMPLATE,    vars) },
    { suffix: '.infra',   data: applyTemplate(INFRA_TEMPLATE,   vars) },
    { suffix: '.network', data: applyTemplate(NETWORK_TEMPLATE, vars) },
  ];

  await fs.writeFile(filePath, payload, 'utf-8');
  await Promise.all(companions.map(({ suffix, data }) =>
    fs.writeFile(resolveDataPath(path.basename(filename) + suffix + '.json'), JSON.stringify(data, null, 2), 'utf-8')
  ));

  const actor = req.actor || {};
  await appendAudit({
    action: 'create',
    target: `data/${safeName}`,
    actor: { user: actor.user || 'unknown', role: actor.role || 'unknown' },
    via: actor.via || 'unknown',
    clientIp: actor.clientIp || null,
    beforeHash: null,
    afterHash: hashContent(payload),
    before: null,
    after: truncateSnapshot(payload),
    bytes: Buffer.byteLength(payload, 'utf-8'),
  });

  return res.status(201).json({ ok: true, file: safeName });
}

export default async function routeHandler(req, res) {
  if (req.method === 'GET') return withAuthz('read', getHandler)(req, res);
  if (req.method === 'POST') return withAuthz('write', postHandler)(req, res);
  return res.status(405).end();
}
