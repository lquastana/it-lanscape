const INCIDENT_STATUS_LABELS = {
  hs: 'Indisponible',
  degrade: 'Dégradé',
  latence: 'Latence',
  intermittent: 'Intermittent',
};

function asText(value, fallback = 'Non renseigné') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function escapeMarkdown(value) {
  return asText(value, '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function bulletList(items = []) {
  if (!items.length) return '- Aucun élément.';
  return items.map(item => `- ${asText(item)}`).join('\n');
}

function table(headers, rows) {
  if (!rows.length) return '_Aucune donnée._';
  const headerLine = `| ${headers.map(escapeMarkdown).join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map(row => `| ${row.map(escapeMarkdown).join(' | ')} |`);
  return [headerLine, separatorLine, ...rowLines].join('\n');
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function severityLabel(value) {
  const labels = {
    critical: 'Critique',
    high: 'Forte',
    medium: 'Moyenne',
    low: 'Faible',
  };
  return labels[value] || value || 'Non qualifiée';
}

function sourceLabel(source, netbox) {
  if (source === 'netbox') return 'NetBox';
  if (source === 'json' && netbox?.enabled === false) {
    if (!netbox.hasUrl && !netbox.hasToken) return 'JSON (NetBox non configuré)';
    if (!netbox.hasUrl) return 'JSON (NETBOX_URL manquant)';
    if (!netbox.hasToken) return 'JSON (NETBOX_TOKEN manquant)';
  }
  return source || 'Non renseignée';
}

export function formatIncidentStatus(value) {
  return INCIDENT_STATUS_LABELS[value] || value || 'Non renseigné';
}

export function describeIncidentStatus(status) {
  switch (status) {
    case 'hs':
      return 'Arrêt complet du service';
    case 'degrade':
      return 'Fonctionnalités limitées ou performance réduite';
    case 'latence':
      return 'Temps de réponse élevé';
    case 'intermittent':
      return 'Dysfonctionnements intermittents';
    default:
      return '';
  }
}

export function incidentActionsByContext(status, causes = []) {
  const types = new Set(causes.map(c => c.type));
  const actions = [];

  if (status === 'hs') {
    actions.push('Déclencher le PRA/PCA si disponible');
    actions.push('Notifier la DSI et les équipes support');
  }
  if (types.has('Infrastructure')) {
    actions.push("Vérifier l'état du serveur (monitoring, logs système)");
    if (status === 'hs') actions.push('Basculer sur le serveur de secours ou redémarrer');
    else actions.push('Surveiller les métriques (CPU, RAM, disque)');
  }
  if (types.has('Interface') || types.has('Interface sortante')) {
    actions.push("Vérifier la disponibilité du middleware / de l'interface");
    actions.push('Activer le mode dégradé sans les flux dépendants');
    if (status === 'hs') actions.push('Identifier un canal de substitution pour les données critiques');
  }
  if (types.has('Hébergeur')) {
    actions.push("Contacter l'hébergeur et obtenir un ETA de rétablissement");
    actions.push('Vérifier les engagements SLA contractuels');
  }
  if (types.has('Dépendance amont')) {
    actions.push('Identifier et traiter le composant source en priorité');
    actions.push('Activer un mode de saisie manuelle si possible');
  }
  if (status === 'degrade' || status === 'latence') {
    actions.push('Prioriser les flux et processus critiques');
    actions.push('Informer les utilisateurs du mode dégradé');
  }
  if (status === 'intermittent') {
    actions.push("Analyser les logs pour identifier le pattern d'instabilité");
    actions.push('Planifier une fenêtre de maintenance préventive');
  }
  if (status === 'latence') {
    actions.push('Vérifier la saturation réseau et les ressources applicatives');
  }
  return [...new Set(actions)];
}

export function markdownFilename(prefix, date = new Date()) {
  const timestamp = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `${prefix}-${timestamp}.md`;
}

export function downloadMarkdownFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildQualityMarkdownReport(quality, options = {}) {
  const generatedAt = options.generatedAt || quality?.generatedAt || new Date();
  const metrics = quality?.metrics || {};
  const severityCounts = metrics.severityCounts || {};
  const sources = metrics.sources || {};
  const dimensions = quality?.dimensions || {};

  return [
    '# Data Quality Center',
    '',
    `Généré le ${formatDateTime(generatedAt)}.`,
    '',
    '## Synthèse',
    '',
    table(
      ['Indicateur', 'Valeur'],
      [
        ['Score global', `${quality?.score ?? 0}/100`],
        ['Applications', metrics.applications ?? 0],
        ['Établissements', metrics.establishments ?? 0],
        ['Serveurs', metrics.servers ?? 0],
        ['Serveurs réseau', metrics.networkServers ?? 0],
        ['Flux', metrics.flux ?? 0],
        ['Anomalies', metrics.issues ?? 0],
        ['Critiques', severityCounts.critical ?? 0],
        ['Fortes', severityCounts.high ?? 0],
      ],
    ),
    '',
    '## Sources analysées',
    '',
    table(
      ['Source', 'Origine'],
      [
        ['Applications', sources.applications || 'Non renseignée'],
        ['Infrastructure', sourceLabel(sources.infrastructure, quality?.metrics?.netbox)],
        ['Réseau', sourceLabel(sources.network, quality?.metrics?.netbox)],
        ['Flux', sources.flux || 'Non renseignée'],
      ],
    ),
    '',
    '## Dimensions',
    '',
    table(
      ['Dimension', 'Score', 'Contrôles conformes'],
      Object.values(dimensions).map(dimension => [
        dimension.label,
        `${dimension.score}%`,
        `${dimension.passed}/${dimension.total}`,
      ]),
    ),
    '',
    '## Recommandations',
    '',
    table(
      ['Priorité', 'Volume', 'Action'],
      (quality?.recommendations || []).map(recommendation => [
        recommendation.title,
        recommendation.count,
        recommendation.action,
      ]),
    ),
    '',
    '## Anomalies',
    '',
    table(
      ['Sévérité', 'Dimension', 'Anomalie', 'Détail', 'Recommandation'],
      (quality?.issues || []).map(issue => [
        issue.severityLabel || severityLabel(issue.severity),
        issue.dimensionLabel,
        issue.title,
        issue.detail,
        issue.recommendation,
      ]),
    ),
    '',
  ].join('\n');
}

export function buildIncidentMarkdownReport({
  selectedComponents = [],
  analysis = null,
  reportByEtablissement = [],
  generatedAt = new Date(),
} = {}) {
  const impactedApps = analysis?.impactedApps || [];
  const blockedFlows = analysis?.blockedFlows || [];
  const impactedProcesses = analysis?.impactedProcesses || [];
  const impactedOther = analysis?.impactedOther || [];

  const sections = [
    '# Rapport incident / PRA-PCA',
    '',
    `Généré le ${formatDateTime(generatedAt)}.`,
    '',
    '## Scénario',
    '',
    table(
      ['Composant', 'Type', 'Statut', 'Périmètre', 'Détail'],
      selectedComponents.map(component => [
        component.label,
        component.type,
        formatIncidentStatus(component.status),
        component.etablissement || component.hebergement || 'Non renseigné',
        component.detail || component.note || component.vm || '',
      ]),
    ),
    '',
    '## Synthèse des impacts',
    '',
    table(
      ['Indicateur', 'Valeur'],
      [
        ['Composants du scénario', selectedComponents.length],
        ['Applications impactées', new Set(impactedApps.map(app => app.trigramme)).size],
        ['Processus touchés', impactedProcesses.length],
        ['Flux bloqués ou dégradés', blockedFlows.length],
        ['Composants externes', impactedOther.length],
      ],
    ),
    '',
  ];

  if (!analysis) {
    sections.push('_Aucune analyse lancée._', '');
    return sections.join('\n');
  }

  if (!reportByEtablissement.length) {
    sections.push('## Rapport par établissement', '', '_Aucun impact identifié._', '');
  }

  reportByEtablissement.forEach(report => {
    sections.push(
      `## ${report.etablissement}`,
      '',
      '### Applications impactées',
      '',
      table(
        ['Application', 'Trigramme', 'Statut', 'Criticité', 'Processus', 'Hébergeur', 'Causes'],
        report.impactedApps.map(app => [
          app.label,
          app.trigramme,
          formatIncidentStatus(app.status),
          app.criticite,
          `${app.domaine} / ${app.processus}`,
          app.hebergement,
          (app.causes || []).map(cause => `${cause.label} (${formatIncidentStatus(cause.status)})`).join('<br>'),
        ]),
      ),
      '',
      '### Actions recommandées',
      '',
    );

    report.impactedApps.forEach(app => {
      sections.push(
        `#### ${app.label} (${app.trigramme})`,
        '',
        `${describeIncidentStatus(app.status) || 'Situation à qualifier.'}`,
        '',
        bulletList(incidentActionsByContext(app.status, app.causes || [])),
        '',
      );
    });

    sections.push(
      '### Services et processus touchés',
      '',
      bulletList(report.impactedProcesses),
      '',
      '### Flux bloqués / dégradés',
      '',
      table(
        ['Source', 'Cible', 'Type', 'Protocole', 'Message'],
        report.blockedFlows.map(flow => [
          flow.sourceLabel || flow.source,
          flow.targetLabel || flow.target,
          flow.interfaceType || 'Flux',
          flow.protocol || '',
          flow.messageType || '',
        ]),
      ),
      '',
      '### Propagation',
      '',
      table(
        ['Source', 'Cible', 'Statut propagé', 'Type'],
        report.propagation.map(edge => [
          edge.sourceLabel || edge.source,
          edge.targetLabel || edge.target,
          formatIncidentStatus(edge.status),
          edge.interfaceType || 'Dépendance',
        ]),
      ),
      '',
    );
  });

  if (impactedOther.length) {
    sections.push(
      '## Composants externes à cartographier',
      '',
      table(
        ['Composant', 'Statut'],
        impactedOther.map(item => [item.label, formatIncidentStatus(item.status)]),
      ),
      '',
    );
  }

  return sections.join('\n');
}
