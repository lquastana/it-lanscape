import { normalizeTrig } from './helpers.js';

export function flattenLandscape(landscape) {
  const applications = [];
  const establishments = new Set();

  for (const etab of landscape?.etablissements || []) {
    establishments.add(etab.nom);
    for (const domaine of etab.domaines || []) {
      for (const processus of domaine.processus || []) {
        for (const application of processus.applications || []) {
          applications.push({
            etablissement: etab.nom,
            domaine: domaine.nom,
            processus: processus.nom,
            ...application,
            trigramme: normalizeTrig(application.trigramme),
          });
        }
      }
    }
  }

  return { applications, establishments };
}

export function flattenInfrastructure(infrastructure) {
  const servers = [];
  const establishments = new Set();

  for (const etab of infrastructure?.etablissements || []) {
    establishments.add(etab.nom);
    for (const server of etab.serveurs || []) {
      servers.push({
        etablissement: etab.nom,
        ...server,
        VM: server.VM || server.nom || server.name || '',
        PrimaryIPAddress: server.PrimaryIPAddress || server.ip || '',
        RoleServeur: server.RoleServeur || server.role || server.description || '',
        trigramme: normalizeTrig(server.trigramme),
      });
    }
  }

  return { servers, establishments };
}

export function flattenNetwork(network) {
  const vlans = [];
  const networkServers = [];
  const establishments = new Set();

  for (const etab of network?.etablissements || []) {
    establishments.add(etab.nom);
    for (const vlan of etab.vlans || []) {
      vlans.push({
        etablissement: etab.nom,
        ...vlan,
        nom: vlan.nom || vlan.name || vlan.description || '',
      });
      for (const server of vlan.serveurs || []) {
        networkServers.push({
          etablissement: etab.nom,
          vlan: vlan.nom || `VLAN-${vlan.id}`,
          ...server,
        });
      }
    }
  }

  return { vlans, networkServers, establishments };
}

export function flattenFlux(fluxData) {
  const flux = [];
  const establishments = new Set();

  for (const etab of fluxData?.etablissements || []) {
    establishments.add(etab.nom);
    for (const item of etab.flux || []) {
      flux.push({
        etablissement: etab.nom,
        ...item,
        sourceTrigramme: normalizeTrig(item.sourceTrigramme),
        targetTrigramme: normalizeTrig(item.targetTrigramme),
      });
    }
  }

  return { flux, establishments };
}
