import { flattenLandscape } from './quality/flatteners.js';
import { blank, normalizeTrig } from './quality/helpers.js';

const TRIGRAMME_RE = /^[A-Z0-9]{3}$/;

const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function tagName(tag) {
  return typeof tag === 'string' ? tag : tag?.name || tag?.slug || '';
}

function splitIp(address = '') {
  return String(address || '').split('/')[0];
}

function ipToInt(ip) {
  if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return null;
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function ipInCidr(ip, cidr) {
  const ipInt = ipToInt(ip);
  if (ipInt === null || !cidr || !cidr.includes('/')) return false;
  const [network, bitsRaw] = cidr.split('/');
  const networkInt = ipToInt(network);
  const bits = Number(bitsRaw);
  if (networkInt === null || Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function objectLabel(object) {
  return object.name || object.display || object.url || `#${object.id || 'inconnu'}`;
}

function siteLabel(object) {
  return object.site?.name || object.site?.display || object.site?.slug || '';
}

function objectPrimaryIp(object) {
  return splitIp(object.primary_ip4?.address || object.primary_ip?.address);
}

function objectDescription(object) {
  return [
    object.name,
    object.description,
    object.comments,
    object.role?.name,
    object.device_type?.display,
  ].filter(Boolean).join(' ');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractCustomCode(object) {
  const cf = object.custom_fields || {};
  return cf.trigramme || cf.app_code || cf.application_code || '';
}

function extractSignals(object, tagPrefix) {
  const tags = (object.tags || []).map(tagName).filter(Boolean);
  const prefixedTags = tags
    .filter(name => name.toLowerCase().startsWith(tagPrefix.toLowerCase()))
    .map(name => normalizeTrig(name.slice(tagPrefix.length)));
  const bareTrigrammeTags = tags.filter(name => TRIGRAMME_RE.test(normalizeTrig(name))).map(normalizeTrig);
  const customCode = normalizeTrig(extractCustomCode(object));
  const signals = [...prefixedTags, ...bareTrigrammeTags, customCode].filter(Boolean);

  return {
    tags,
    prefixedTags,
    bareTrigrammeTags,
    customCode,
    signals,
    uniqueSignals: [...new Set(signals)],
    invalidPrefixedTags: tags
      .filter(name => name.toLowerCase().startsWith(tagPrefix.toLowerCase()))
      .filter(name => !TRIGRAMME_RE.test(normalizeTrig(name.slice(tagPrefix.length)))),
  };
}

function buildApplicationIndex(landscape) {
  const { applications } = flattenLandscape(landscape);
  const byTrig = new Map();
  const nameCandidates = [];

  applications.forEach(app => {
    if (!app.trigramme) return;
    byTrig.set(app.trigramme, app);
    if (app.nom) {
      nameCandidates.push({
        trigramme: app.trigramme,
        name: app.nom,
        normalizedName: normalizeSearchText(app.nom),
      });
    }
  });

  return { byTrig, nameCandidates };
}

function suggestMapping(object, appIndex) {
  const text = normalizeSearchText(objectDescription(object));
  if (!text) return null;

  for (const trigramme of appIndex.byTrig.keys()) {
    if (text.includes(trigramme.toLowerCase())) {
      const app = appIndex.byTrig.get(trigramme);
      return {
        trigramme,
        label: app?.nom || trigramme,
        reason: `Le libellé contient le trigramme ${trigramme}.`,
      };
    }
  }

  const byName = appIndex.nameCandidates.find(candidate => (
    candidate.normalizedName.length >= 4 && text.includes(candidate.normalizedName)
  ));
  if (!byName) return null;

  return {
    trigramme: byName.trigramme,
    label: byName.name,
    reason: `Le libellé ressemble à l'application ${byName.name}.`,
  };
}

function issue({ type, severity = 'medium', title, detail, entity, entityType, site, recommendation, suggestion }) {
  return {
    id: `${type}:${entityType}:${entity}:${detail}`.toLowerCase().replace(/\s+/g, '-'),
    type,
    severity,
    title,
    detail,
    entity,
    entityType,
    site: site || 'Non rattaché',
    recommendation,
    suggestion,
  };
}

function sortIssues(a, b) {
  const severityDelta = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
  if (severityDelta !== 0) return severityDelta;
  return String(a.entity).localeCompare(String(b.entity));
}

function vlanLabel(vlan) {
  const id = vlan.vid || vlan.id || '?';
  return `${vlan.name || vlan.display || 'VLAN'} (${id})`;
}

function buildVlanUsage({ vlans, prefixes, computeObjects }) {
  const prefixesByVlan = new Map();
  prefixes.forEach(prefix => {
    const vlanId = prefix.vlan?.id;
    if (!vlanId) return;
    if (!prefixesByVlan.has(vlanId)) prefixesByVlan.set(vlanId, []);
    prefixesByVlan.get(vlanId).push(prefix.prefix);
  });

  return vlans.map(vlan => {
    const cidrs = prefixesByVlan.get(vlan.id) || [];
    const members = computeObjects.filter(object => {
      const ip = objectPrimaryIp(object);
      return ip && cidrs.some(cidr => ipInCidr(ip, cidr));
    });
    return { vlan, cidrs, members };
  });
}

export function analyzeNetboxReconciliation({
  landscape = { etablissements: [] },
  netbox = {},
  tagPrefix = 'app:',
} = {}) {
  const appIndex = buildApplicationIndex(landscape);
  const virtualMachines = netbox.virtualMachines || netbox.vms || [];
  const devices = netbox.devices || [];
  const vlans = netbox.vlans || [];
  const prefixes = netbox.prefixes || [];
  const computeObjects = [
    ...virtualMachines.map(object => ({ ...object, __type: 'VM' })),
    ...devices.map(object => ({ ...object, __type: 'Device' })),
  ];

  const issues = [];
  const suggestions = [];

  computeObjects.forEach(object => {
    const entity = objectLabel(object);
    const entityType = object.__type;
    const site = siteLabel(object);
    const signals = extractSignals(object, tagPrefix);
    const mappingSuggestion = suggestMapping(object, appIndex);

    if (entityType === 'VM' && signals.uniqueSignals.length === 0) {
      issues.push(issue({
        type: 'vm-missing-trigramme',
        severity: 'high',
        title: 'VM NetBox sans trigramme',
        detail: `${entity} ne porte aucun tag ${tagPrefix} ni custom field applicatif.`,
        entity,
        entityType,
        site,
        recommendation: 'Ajouter un tag applicatif ou renseigner le custom field trigramme/app_code.',
        suggestion: mappingSuggestion,
      }));
    }

    if (!site) {
      issues.push(issue({
        type: 'unattached-object',
        severity: 'high',
        title: 'Objet NetBox non rattaché',
        detail: `${entity} n'est rattaché à aucun site NetBox.`,
        entity,
        entityType,
        site,
        recommendation: 'Rattacher l’objet au site/établissement correspondant.',
        suggestion: mappingSuggestion,
      }));
    }

    if (signals.invalidPrefixedTags.length > 0) {
      issues.push(issue({
        type: 'inconsistent-tags',
        severity: 'medium',
        title: 'Tag applicatif invalide',
        detail: `${entity} porte un tag applicatif invalide : ${signals.invalidPrefixedTags.join(', ')}.`,
        entity,
        entityType,
        site,
        recommendation: `Utiliser le format ${tagPrefix}XXX avec un trigramme sur 3 caractères.`,
        suggestion: mappingSuggestion,
      }));
    }

    if (signals.uniqueSignals.length > 1) {
      issues.push(issue({
        type: 'inconsistent-tags',
        severity: 'high',
        title: 'Tags applicatifs incohérents',
        detail: `${entity} expose plusieurs mappings applicatifs : ${signals.uniqueSignals.join(', ')}.`,
        entity,
        entityType,
        site,
        recommendation: 'Conserver un seul trigramme applicatif cohérent entre tags et custom fields.',
        suggestion: mappingSuggestion,
      }));
    }

    signals.uniqueSignals.forEach(trigramme => {
      if (!appIndex.byTrig.has(trigramme)) {
        issues.push(issue({
          type: 'inconsistent-tags',
          severity: 'medium',
          title: 'Mapping absent de la cartographie applicative',
          detail: `${entity} référence ${trigramme}, absent de la cartographie applicative.`,
          entity,
          entityType,
          site,
          recommendation: 'Corriger le tag/custom field ou créer la fiche applicative correspondante.',
          suggestion: mappingSuggestion,
        }));
      }
    });

    if (blank(signals.customCode)) {
      issues.push(issue({
        type: 'missing-custom-field',
        severity: 'low',
        title: 'Custom field applicatif manquant',
        detail: `${entity} n'a pas de custom field trigramme/app_code/application_code.`,
        entity,
        entityType,
        site,
        recommendation: 'Renseigner un custom field applicatif pour stabiliser les synchronisations.',
        suggestion: mappingSuggestion,
      }));
    }

    if (mappingSuggestion && signals.uniqueSignals.length === 0) {
      suggestions.push({
        entity,
        entityType,
        site: site || 'Non rattaché',
        trigramme: mappingSuggestion.trigramme,
        label: mappingSuggestion.label,
        reason: mappingSuggestion.reason,
      });
    }
  });

  vlans.forEach(vlan => {
    if (!siteLabel(vlan)) {
      issues.push(issue({
        type: 'unattached-object',
        severity: 'medium',
        title: 'VLAN NetBox non rattaché',
        detail: `${vlanLabel(vlan)} n'est rattaché à aucun site NetBox.`,
        entity: vlanLabel(vlan),
        entityType: 'VLAN',
        site: siteLabel(vlan),
        recommendation: 'Rattacher le VLAN au site/établissement correspondant.',
      }));
    }
  });

  prefixes.forEach(prefix => {
    if (!prefix.site?.name && !prefix.scope?.name) {
      issues.push(issue({
        type: 'unattached-object',
        severity: 'low',
        title: 'Préfixe NetBox non rattaché',
        detail: `${prefix.prefix || prefix.display || 'Préfixe'} n'a ni site ni scope explicite.`,
        entity: prefix.prefix || prefix.display || `#${prefix.id}`,
        entityType: 'Préfixe',
        site: '',
        recommendation: 'Rattacher le préfixe à un site, scope ou VLAN exploitable.',
      }));
    }
  });

  buildVlanUsage({ vlans, prefixes, computeObjects }).forEach(({ vlan, cidrs, members }) => {
    const mappedMembers = members
      .map(member => ({ member, signals: extractSignals(member, tagPrefix) }))
      .filter(({ signals }) => signals.uniqueSignals.some(trigramme => appIndex.byTrig.has(trigramme)));

    if (mappedMembers.length > 0) return;

    const memberSignals = members
      .flatMap(member => extractSignals(member, tagPrefix).uniqueSignals)
      .filter(Boolean);
    const candidate = memberSignals[0] ? {
      trigramme: memberSignals[0],
      label: appIndex.byTrig.get(memberSignals[0])?.nom || memberSignals[0],
      reason: 'Un objet du VLAN porte ce trigramme, mais il n’est pas exploitable dans la cartographie.',
    } : null;

    issues.push(issue({
      type: 'vlan-without-app-usage',
      severity: cidrs.length === 0 ? 'medium' : 'low',
      title: 'VLAN sans usage applicatif',
      detail: `${vlanLabel(vlan)} ne contient aucun objet rattaché à une application cartographiée.`,
      entity: vlanLabel(vlan),
      entityType: 'VLAN',
      site: siteLabel(vlan),
      recommendation: cidrs.length === 0
        ? 'Associer au moins un préfixe au VLAN ou documenter son usage.'
        : 'Associer les VM/devices du VLAN aux bons trigrammes applicatifs.',
      suggestion: candidate,
    }));
  });

  const uniqueIssues = Array.from(new Map(issues.map(item => [item.id, item])).values()).sort(sortIssues);
  const severityCounts = Object.fromEntries(
    Object.keys(SEVERITY_WEIGHT).map(severity => [
      severity,
      uniqueIssues.filter(item => item.severity === severity).length,
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    tagPrefix,
    metrics: {
      applications: appIndex.byTrig.size,
      virtualMachines: virtualMachines.length,
      devices: devices.length,
      vlans: vlans.length,
      prefixes: prefixes.length,
      issues: uniqueIssues.length,
      suggestions: suggestions.length,
      severityCounts,
    },
    issues: uniqueIssues,
    suggestions,
  };
}
