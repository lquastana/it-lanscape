import {
  DIMENSIONS,
  IPV4_RE,
  SEVERITY_LABEL,
  TRIGRAMME_RE,
  VALID_CRITICITIES,
  VALID_INTERFACE_TYPES,
  VALID_PROTOCOLS,
} from './quality/constants.js';
import {
  blank,
  cidrListIsValid,
  hasInterface,
  isExternalHosting,
  labelForApplication,
  normalizeTrig,
} from './quality/helpers.js';
import {
  flattenFlux,
  flattenInfrastructure,
  flattenLandscape,
  flattenNetwork,
} from './quality/flatteners.js';
import { createDimensionState, computeScores, issueSort } from './quality/scoring.js';
import { buildRecommendations } from './quality/recommendations.js';

function addCheck(state, dimension, passed, issueFactory) {
  state.dimensions[dimension].total += 1;
  if (passed) {
    state.dimensions[dimension].passed += 1;
    return;
  }
  const issue = issueFactory?.();
  if (issue) state.issues.push({ dimension, ...issue });
}

function addIssue(state, dimension, issue) {
  state.issues.push({ dimension, ...issue });
}

export function analyzeDataQuality({
  landscape = { etablissements: [] },
  infrastructure = { etablissements: [] },
  network = { etablissements: [] },
  fluxData = { etablissements: [] },
  trigrammes = {},
  sources = {},
  netbox = { enabled: false, hasUrl: false, hasToken: false },
} = {}) {
  const state = {
    dimensions: createDimensionState(),
    issues: [],
  };

  const { applications, establishments: appEstablishments } = flattenLandscape(landscape);
  const { servers, establishments: infraEstablishments } = flattenInfrastructure(infrastructure);
  const { vlans, networkServers, establishments: networkEstablishments } = flattenNetwork(network);
  const { flux, establishments: fluxEstablishments } = flattenFlux(fluxData);

  const knownTrigrammes = new Set(Object.keys(trigrammes || {}).map(normalizeTrig));
  const appTrigrammes = new Set(applications.map(app => app.trigramme).filter(Boolean));
  const serverTrigrammes = new Set(servers.map(server => server.trigramme).filter(Boolean));
  const fluxTrigrammes = new Set(flux.flatMap(item => [item.sourceTrigramme, item.targetTrigramme]).filter(Boolean));
  const serverIps = new Set(servers.map(server => server.PrimaryIPAddress).filter(Boolean));
  const serverNames = new Set(servers.map(server => String(server.VM || '').toLowerCase()).filter(Boolean));
  const networkIps = new Set(networkServers.map(server => server.ip).filter(Boolean));
  const networkNames = new Set(networkServers.map(server => String(server.nom || '').toLowerCase()).filter(Boolean));
  const fluxByTrig = new Map();
  const usingNetboxInfrastructure = sources.infrastructure === 'netbox';
  const usingNetboxNetwork = sources.network === 'netbox';

  for (const item of flux) {
    for (const trigramme of [item.sourceTrigramme, item.targetTrigramme]) {
      if (!trigramme) continue;
      fluxByTrig.set(trigramme, (fluxByTrig.get(trigramme) || 0) + 1);
    }
  }

  for (const etablissement of appEstablishments) {
    addCheck(state, 'coherence', infraEstablishments.has(etablissement), () => ({
      severity: 'high',
      category: 'missing-establishment-dataset',
      title: 'Établissement absent de l’infrastructure',
      detail: `${etablissement} existe dans la cartographie applicative mais pas dans l’inventaire infrastructure.`,
      entity: etablissement,
      recommendation: 'Ajouter le fichier infrastructure ou corriger le nom d’établissement.',
    }));
    addCheck(state, 'coherence', networkEstablishments.has(etablissement), () => ({
      severity: 'high',
      category: 'missing-establishment-dataset',
      title: 'Établissement absent du réseau',
      detail: `${etablissement} existe dans la cartographie applicative mais pas dans l’inventaire réseau.`,
      entity: etablissement,
      recommendation: 'Ajouter le fichier réseau ou corriger le nom d’établissement.',
    }));
    addCheck(state, 'exploitability', fluxEstablishments.has(etablissement), () => ({
      severity: 'medium',
      category: 'impact-readiness',
      title: 'Flux absents pour un établissement',
      detail: `${etablissement} n’a pas de catalogue de flux exploitable.`,
      entity: etablissement,
      recommendation: 'Ajouter les flux applicatifs pour fiabiliser les analyses d’impact.',
    }));
  }

  if (usingNetboxInfrastructure || usingNetboxNetwork) {
    for (const etablissement of new Set([...infraEstablishments, ...networkEstablishments])) {
      addCheck(state, 'coherence', etablissement !== 'Non rattaché', () => ({
        severity: 'high',
        category: 'netbox-unassigned-site',
        title: 'Objet NetBox sans site',
        detail: 'Des objets NetBox actifs sont exposés sous "Non rattaché".',
        entity: etablissement,
        recommendation: 'Rattacher les devices, VM, VLANs ou préfixes NetBox au bon site.',
      }));
    }
  }

  const appCountByTrig = new Map();
  for (const app of applications) {
    if (!blank(app.trigramme)) {
      appCountByTrig.set(app.trigramme, (appCountByTrig.get(app.trigramme) || 0) + 1);
    }
  }

  for (const app of applications) {
    const appLabel = labelForApplication(app);
    const requiredFields = [
      ['nom', 'nom applicatif'],
      ['description', 'description'],
      ['editeur', 'éditeur'],
      ['hebergement', 'hébergement'],
      ['trigramme', 'trigramme'],
      ['criticite', 'criticité'],
    ];

    for (const [field, label] of requiredFields) {
      addCheck(state, 'completeness', !blank(app[field]), () => ({
        severity: 'medium',
        category: 'incomplete-application',
        title: 'Application incomplète',
        detail: `${appLabel} n’a pas de ${label}.`,
        entity: appLabel,
        recommendation: `Renseigner le champ ${label}.`,
      }));
    }

    addCheck(state, 'completeness', hasInterface(app), () => ({
      severity: 'medium',
      category: 'incomplete-application',
      title: 'Interfaces applicatives non qualifiées',
      detail: `${appLabel} n’a aucune famille d’interface activée.`,
      entity: appLabel,
      recommendation: 'Qualifier au moins une interface ou confirmer explicitement l’absence de flux.',
    }));

    addCheck(state, 'exploitability', !blank(app.referent), () => ({
      severity: app.criticite === 'Critique' ? 'high' : 'low',
      category: 'impact-readiness',
      title: 'Référent manquant',
      detail: `${appLabel} n’a pas de référent identifié.`,
      entity: appLabel,
      recommendation: 'Renseigner un propriétaire applicatif ou un contact DSI.',
    }));

    addCheck(state, 'validity', blank(app.trigramme) || TRIGRAMME_RE.test(app.trigramme), () => ({
      severity: 'high',
      category: 'invalid-value',
      title: 'Format de trigramme invalide',
      detail: `${appLabel} utilise le trigramme "${app.trigramme || 'vide'}".`,
      entity: appLabel,
      recommendation: 'Utiliser un code sur 3 caractères alphanumériques.',
    }));

    addCheck(state, 'validity', blank(app.trigramme) || knownTrigrammes.has(app.trigramme), () => ({
      severity: 'high',
      category: 'unknown-trigramme',
      title: 'Trigramme applicatif inconnu',
      detail: `${appLabel} référence ${app.trigramme}, absent de data/trigrammes.json.`,
      entity: appLabel,
      recommendation: 'Ajouter le trigramme au référentiel ou corriger la fiche applicative.',
    }));

    addCheck(state, 'validity', VALID_CRITICITIES.has(app.criticite), () => ({
      severity: 'medium',
      category: 'invalid-value',
      title: 'Criticité invalide',
      detail: `${appLabel} a une criticité non reconnue.`,
      entity: appLabel,
      recommendation: 'Utiliser Critique ou Standard.',
    }));

    addCheck(state, 'coherence', blank(app.trigramme) || appCountByTrig.get(app.trigramme) === 1, () => ({
      severity: 'medium',
      category: 'duplicate-trigramme',
      title: 'Trigramme applicatif dupliqué',
      detail: `${app.trigramme} est porté par plusieurs applications.`,
      entity: app.trigramme,
      recommendation: 'Dédupliquer le référentiel ou expliciter une application commune.',
    }));

    const hasServer = serverTrigrammes.has(app.trigramme);
    if (!isExternalHosting(app.hebergement)) {
      addCheck(state, 'coherence', hasServer, () => ({
        severity: app.criticite === 'Critique' ? 'high' : 'medium',
        category: 'orphan-server',
        title: 'Application sans serveur rattaché',
        detail: `${appLabel} n’a aucun serveur associé dans l’infrastructure.`,
        entity: appLabel,
        recommendation: 'Rattacher au moins un serveur ou qualifier l’hébergement comme SaaS/externe.',
      }));
    }

    if (app.criticite === 'Critique') {
      addCheck(state, 'exploitability', hasServer || isExternalHosting(app.hebergement), () => ({
        severity: 'critical',
        category: 'impact-readiness',
        title: 'Application critique non exploitable pour PRA/PCA',
        detail: `${appLabel} est critique mais sans serveur ni hébergement externe explicite.`,
        entity: appLabel,
        recommendation: 'Documenter l’infrastructure, le mode SaaS ou les dépendances de reprise.',
      }));
      addCheck(state, 'exploitability', (fluxByTrig.get(app.trigramme) || 0) > 0, () => ({
        severity: 'high',
        category: 'impact-readiness',
        title: 'Application critique sans flux documenté',
        detail: `${appLabel} est critique mais aucun flux entrant ou sortant n’est connu.`,
        entity: appLabel,
        recommendation: 'Documenter les flux nécessaires à l’analyse d’impact.',
      }));
    }
  }

  for (const server of servers) {
    const serverLabel = `${server.VM || server.PrimaryIPAddress || 'Serveur'} (${server.etablissement})`;
    const requiredFields = [
      ['VM', 'nom de VM'],
      ['PrimaryIPAddress', 'adresse IP'],
      ['RoleServeur', 'rôle serveur'],
      ['OS', 'OS'],
      ['Antivirus', 'antivirus'],
      ['Backup', 'sauvegarde'],
      ['Contact', 'contact'],
      ['trigramme', 'trigramme'],
    ];

    for (const [field, label] of requiredFields) {
      addCheck(state, 'completeness', !blank(server[field]), () => ({
        severity: field === 'trigramme' || field === 'PrimaryIPAddress' ? 'high' : 'medium',
        category: usingNetboxInfrastructure ? 'netbox-incomplete-server' : 'incomplete-server',
        title: 'Serveur incomplet',
        detail: `${serverLabel} n’a pas de ${label}${usingNetboxInfrastructure ? ' dans NetBox' : ''}.`,
        entity: serverLabel,
        recommendation: usingNetboxInfrastructure
          ? `Renseigner ${label} dans NetBox, via champ natif, tag applicatif ou commentaire structuré.`
          : `Renseigner le champ ${label}.`,
      }));
    }

    addCheck(state, 'validity', blank(server.PrimaryIPAddress) || IPV4_RE.test(server.PrimaryIPAddress), () => ({
      severity: 'high',
      category: 'invalid-value',
      title: 'Adresse IP serveur invalide',
      detail: `${serverLabel} utilise "${server.PrimaryIPAddress || 'vide'}".`,
      entity: serverLabel,
      recommendation: 'Corriger l’adresse IPv4 dans l’inventaire infrastructure.',
    }));

    addCheck(state, 'coherence', blank(server.trigramme) || appTrigrammes.has(server.trigramme), () => ({
      severity: 'high',
      category: usingNetboxInfrastructure ? 'netbox-orphan-server' : 'orphan-server',
      title: 'Serveur non rattaché à une application',
      detail: `${serverLabel} référence ${server.trigramme || 'aucun trigramme'}, absent de la cartographie applicative.`,
      entity: serverLabel,
      recommendation: usingNetboxInfrastructure
        ? 'Ajouter un tag applicatif NetBox, un champ custom trigramme, ou créer la fiche applicative correspondante.'
        : 'Rattacher le serveur au bon trigramme applicatif ou créer la fiche applicative.',
    }));

    addCheck(state, 'validity', blank(server.trigramme) || knownTrigrammes.has(server.trigramme), () => ({
      severity: 'medium',
      category: 'unknown-trigramme',
      title: 'Trigramme serveur inconnu',
      detail: `${serverLabel} référence ${server.trigramme}, absent de data/trigrammes.json.`,
      entity: serverLabel,
      recommendation: 'Ajouter le trigramme au référentiel ou corriger l’inventaire.',
    }));

    addCheck(state, 'coherence', networkIps.has(server.PrimaryIPAddress) || networkNames.has(String(server.VM || '').toLowerCase()), () => ({
      severity: 'medium',
      category: usingNetboxInfrastructure || usingNetboxNetwork ? 'netbox-network-infra-mismatch' : 'network-infra-mismatch',
      title: 'Serveur absent de la vue réseau',
      detail: `${serverLabel} existe en infrastructure mais pas dans les VLANs.`,
      entity: serverLabel,
      recommendation: usingNetboxNetwork
        ? 'Vérifier le primary IP NetBox, le préfixe VLAN et l’association VLAN/préfixe.'
        : 'Ajouter le serveur au VLAN correspondant ou corriger son IP/nom.',
    }));
  }

  for (const vlan of vlans) {
    const vlanLabel = `${vlan.nom || `VLAN-${vlan.id}`} (${vlan.etablissement})`;
    addCheck(state, 'completeness', !blank(vlan.nom) && !blank(vlan.network) && !blank(vlan.gateway), () => ({
      severity: 'medium',
      category: 'incomplete-network',
      title: 'VLAN incomplet',
      detail: `${vlanLabel} n’a pas tous ses champs réseau obligatoires.`,
      entity: vlanLabel,
      recommendation: 'Renseigner nom, CIDR, passerelle et interconnexion.',
    }));
    addCheck(state, 'validity', cidrListIsValid(vlan.network), () => ({
      severity: 'high',
      category: 'invalid-value',
      title: 'CIDR réseau invalide',
      detail: `${vlanLabel} utilise "${vlan.network || 'vide'}".`,
      entity: vlanLabel,
      recommendation: 'Corriger le réseau au format CIDR IPv4.',
    }));
    addCheck(state, 'validity', blank(vlan.gateway) || IPV4_RE.test(vlan.gateway), () => ({
      severity: 'medium',
      category: 'invalid-value',
      title: 'Passerelle réseau invalide',
      detail: `${vlanLabel} utilise "${vlan.gateway || 'vide'}".`,
      entity: vlanLabel,
      recommendation: 'Corriger l’adresse IPv4 de passerelle.',
    }));
  }

  for (const server of networkServers) {
    const serverLabel = `${server.nom || server.ip || 'Serveur réseau'} (${server.vlan})`;
    addCheck(state, 'coherence', serverIps.has(server.ip) || serverNames.has(String(server.nom || '').toLowerCase()), () => ({
      severity: 'high',
      category: usingNetboxInfrastructure || usingNetboxNetwork ? 'netbox-network-infra-mismatch' : 'network-infra-mismatch',
      title: 'Serveur réseau absent de l’infrastructure',
      detail: `${serverLabel} existe dans le réseau mais pas dans l’inventaire infrastructure.`,
      entity: serverLabel,
      recommendation: usingNetboxInfrastructure
        ? 'Vérifier que la VM ou le device NetBox est actif, avec primary IP cohérente.'
        : 'Créer ou corriger le serveur dans l’inventaire infrastructure.',
    }));
  }

  for (const item of flux) {
    const fluxLabel = item.id || `${item.sourceTrigramme || '?'} → ${item.targetTrigramme || '?'}`;
    const requiredFields = [
      ['sourceTrigramme', 'source'],
      ['targetTrigramme', 'cible'],
      ['protocol', 'protocole'],
      ['port', 'port'],
      ['messageType', 'type de message'],
      ['interfaceType', 'type d’interface'],
      ['eaiName', 'EAI'],
      ['description', 'description'],
    ];

    for (const [field, label] of requiredFields) {
      addCheck(state, 'completeness', !blank(item[field]), () => ({
        severity: 'medium',
        category: 'incomplete-flux',
        title: 'Flux incomplet',
        detail: `${fluxLabel} n’a pas de ${label}.`,
        entity: fluxLabel,
        recommendation: `Renseigner le champ ${label}.`,
      }));
    }

    addCheck(state, 'validity', VALID_PROTOCOLS.has(item.protocol), () => ({
      severity: 'medium',
      category: 'invalid-value',
      title: 'Protocole de flux invalide',
      detail: `${fluxLabel} utilise "${item.protocol || 'vide'}".`,
      entity: fluxLabel,
      recommendation: 'Utiliser un protocole supporté par le référentiel.',
    }));
    addCheck(state, 'validity', Number.isInteger(item.port) && item.port >= 1 && item.port <= 65535, () => ({
      severity: 'medium',
      category: 'invalid-value',
      title: 'Port de flux invalide',
      detail: `${fluxLabel} utilise "${item.port || 'vide'}".`,
      entity: fluxLabel,
      recommendation: 'Corriger le port TCP/UDP dans la plage 1-65535.',
    }));
    addCheck(state, 'validity', VALID_INTERFACE_TYPES.has(item.interfaceType), () => ({
      severity: 'medium',
      category: 'invalid-value',
      title: 'Type d’interface invalide',
      detail: `${fluxLabel} utilise "${item.interfaceType || 'vide'}".`,
      entity: fluxLabel,
      recommendation: 'Utiliser une famille d’interface reconnue.',
    }));

    for (const [endpoint, trigramme] of [['source', item.sourceTrigramme], ['cible', item.targetTrigramme]]) {
      addCheck(state, 'coherence', blank(trigramme) || appTrigrammes.has(trigramme), () => ({
        severity: 'high',
        category: 'unknown-trigramme',
        title: 'Flux vers application inconnue',
        detail: `${fluxLabel} référence ${trigramme || 'un trigramme vide'} en ${endpoint}.`,
        entity: fluxLabel,
        recommendation: 'Corriger le trigramme ou créer la fiche applicative correspondante.',
      }));
      addCheck(state, 'validity', blank(trigramme) || knownTrigrammes.has(trigramme), () => ({
        severity: 'medium',
        category: 'unknown-trigramme',
        title: 'Flux avec trigramme hors référentiel',
        detail: `${fluxLabel} référence ${trigramme}, absent de data/trigrammes.json.`,
        entity: fluxLabel,
        recommendation: 'Ajouter le trigramme au référentiel ou corriger le flux.',
      }));
    }
  }

  for (const trigramme of fluxTrigrammes) {
    if (!appTrigrammes.has(trigramme) && !serverTrigrammes.has(trigramme)) {
      addIssue(state, 'exploitability', {
        severity: 'medium',
        category: 'impact-readiness',
        title: 'Dépendance de flux non exploitable',
        detail: `${trigramme} apparaît dans les flux mais n’a ni application ni serveur rattaché.`,
        entity: trigramme,
        recommendation: 'Créer la fiche applicative ou documenter la dépendance externe.',
      });
    }
  }

  const scores = computeScores(state.dimensions);
  const issues = state.issues.sort(issueSort).map(issue => ({
    ...issue,
    dimensionLabel: DIMENSIONS[issue.dimension].label,
    severityLabel: SEVERITY_LABEL[issue.severity],
  }));

  const severityCounts = Object.fromEntries(
    Object.keys(SEVERITY_LABEL).map(severity => [
      severity,
      issues.filter(issue => issue.severity === severity).length,
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    score: scores.global,
    dimensions: scores.dimensions,
    metrics: {
      sources: {
        applications: sources.applications || 'json',
        infrastructure: sources.infrastructure || 'json',
        network: sources.network || 'json',
        flux: sources.flux || 'json',
      },
      netbox,
      establishments: appEstablishments.size,
      applications: applications.length,
      servers: servers.length,
      networkServers: networkServers.length,
      vlans: vlans.length,
      flux: flux.length,
      knownTrigrammes: knownTrigrammes.size,
      issues: issues.length,
      severityCounts,
    },
    issues,
    recommendations: buildRecommendations(issues),
  };
}
