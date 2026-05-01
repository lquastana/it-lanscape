import fs from 'fs/promises';
import path from 'path';
import { withAuthz } from '../../lib/authz.js';
import { getDataDir } from '../../lib/dataPaths.js';
import {
  getNetboxConfig,
  getNetboxReconciliationSnapshot,
} from '../../lib/netbox.js';
import { analyzeNetboxReconciliation } from '../../lib/netboxReconciliation.js';

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function loadLandscape(dataDir) {
  const files = (await fs.readdir(dataDir)).filter(file =>
    file.endsWith('.json') &&
    !file.endsWith('.infra.json') &&
    !file.endsWith('.network.json') &&
    !file.endsWith('.flux.json') &&
    file !== 'trigrammes.json'
  );

  const etablissements = [];
  for (const file of files) {
    const json = await readJson(path.join(dataDir, file), { etablissements: [] });
    etablissements.push(...(json.etablissements || []));
  }
  return { etablissements };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const netboxConfig = getNetboxConfig();
    const dataDir = getDataDir();
    const landscape = await loadLandscape(dataDir);

    if (!netboxConfig.enabled) {
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        netbox: {
          enabled: false,
          hasUrl: Boolean(netboxConfig.url),
          hasToken: Boolean(netboxConfig.token),
          urlSource: netboxConfig.urlSource,
          tokenSource: netboxConfig.tokenSource,
        },
        metrics: {
          applications: 0,
          virtualMachines: 0,
          devices: 0,
          vlans: 0,
          prefixes: 0,
          issues: 0,
          suggestions: 0,
          severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        },
        issues: [],
        suggestions: [],
      });
    }

    const snapshot = await getNetboxReconciliationSnapshot();
    const analysis = analyzeNetboxReconciliation({
      landscape,
      netbox: snapshot,
      tagPrefix: snapshot.tagPrefix,
    });

    return res.status(200).json({
      ...analysis,
      netbox: {
        enabled: true,
        hasUrl: true,
        hasToken: true,
        urlSource: netboxConfig.urlSource,
        tokenSource: netboxConfig.tokenSource,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur réconciliation NetBox' });
  }
}

export default withAuthz('write', handler);
