import fs from 'fs/promises';
import path from 'path';
import { withAuthz } from '../../lib/authz.js';
import { getDataDir } from '../../lib/dataPaths.js';
import { getInfrastructureFromNetbox, getNetboxConfig, getNetworkFromNetbox } from '../../lib/netbox.js';
import { analyzeDataQuality } from '../../lib/qualityAnalysis.js';

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

async function loadInfrastructure(dataDir) {
  const files = (await fs.readdir(dataDir)).filter(file => file.endsWith('.infra.json'));
  const etablissements = [];
  for (const file of files) {
    const json = await readJson(path.join(dataDir, file), {});
    const nom = json.etablissement || json.nom || file.replace('.infra.json', '');
    etablissements.push({ nom, serveurs: json.serveurs || [] });
  }
  return { etablissements };
}

async function loadNetwork(dataDir) {
  const files = (await fs.readdir(dataDir)).filter(file => file.endsWith('.network.json'));
  const etablissements = [];
  for (const file of files) {
    const json = await readJson(path.join(dataDir, file), {});
    const nom = json.etablissement || json.nom || file.replace('.network.json', '');
    etablissements.push({ nom, vlans: json.vlans || [] });
  }
  return { etablissements };
}

async function loadFlux(dataDir) {
  const files = (await fs.readdir(dataDir)).filter(file => file.endsWith('.flux.json'));
  const etablissements = [];
  for (const file of files) {
    const json = await readJson(path.join(dataDir, file), {});
    const nom = json.etablissement || json.nom || file.replace('.flux.json', '');
    etablissements.push({ nom, flux: json.flux || [] });
  }
  return { etablissements };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataDir = getDataDir();
    const netboxConfig = getNetboxConfig();
    const netboxEnabled = netboxConfig.enabled;
    const netboxStatus = {
      enabled: netboxEnabled,
      hasUrl: Boolean(netboxConfig.url),
      hasToken: Boolean(netboxConfig.token),
      urlSource: netboxConfig.urlSource,
      tokenSource: netboxConfig.tokenSource,
    };
    const [landscape, infrastructure, network, fluxData, trigrammes] = await Promise.all([
      loadLandscape(dataDir),
      netboxEnabled ? getInfrastructureFromNetbox() : loadInfrastructure(dataDir),
      netboxEnabled ? getNetworkFromNetbox() : loadNetwork(dataDir),
      loadFlux(dataDir),
      readJson(path.join(dataDir, 'trigrammes.json'), {}),
    ]);

    return res.status(200).json(analyzeDataQuality({
      landscape,
      infrastructure,
      network,
      fluxData,
      trigrammes,
      sources: {
        applications: 'json',
        infrastructure: netboxEnabled ? 'netbox' : 'json',
        network: netboxEnabled ? 'netbox' : 'json',
        flux: 'json',
      },
      netbox: netboxStatus,
    }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur analyse qualité' });
  }
}

export default withAuthz('read', handler);
