import assert from 'node:assert/strict';
import {
  buildIncidentMarkdownReport,
  buildQualityMarkdownReport,
} from '../lib/markdownReports.js';

const qualityMarkdown = buildQualityMarkdownReport({
  generatedAt: '2026-05-01T10:00:00.000Z',
  score: 82,
  dimensions: {
    completeness: { label: 'Complétude', score: 80, passed: 8, total: 10 },
  },
  metrics: {
    sources: {
      applications: 'json',
      infrastructure: 'json',
      network: 'json',
      flux: 'json',
    },
    netbox: { enabled: false, hasUrl: false, hasToken: false },
    establishments: 1,
    applications: 12,
    servers: 4,
    networkServers: 4,
    flux: 6,
    issues: 1,
    severityCounts: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
    },
  },
  recommendations: [
    { title: 'Référents manquants', count: 1, action: 'Compléter les référents' },
  ],
  issues: [
    {
      severity: 'high',
      severityLabel: 'Forte',
      dimensionLabel: 'Complétude',
      title: 'Référent absent',
      detail: 'Application sans référent',
      recommendation: 'Renseigner un référent',
    },
  ],
});

assert.match(qualityMarkdown, /^# Data Quality Center/m);
assert.match(qualityMarkdown, /\| Score global \| 82\/100 \|/);
assert.match(qualityMarkdown, /## Anomalies/);
assert.doesNotMatch(qualityMarkdown, /PDF/i);

const incidentMarkdown = buildIncidentMarkdownReport({
  generatedAt: '2026-05-01T10:00:00.000Z',
  selectedComponents: [
    {
      label: 'DPI',
      type: 'application',
      status: 'hs',
      etablissement: 'CH Test',
      detail: 'Soins / Dossier patient',
    },
  ],
  analysis: {
    impactedApps: [
      {
        label: 'DPI',
        trigramme: 'DPI',
        status: 'hs',
        criticite: 'Critique',
      },
    ],
    impactedProcesses: ['CH Test • Soins / Dossier patient'],
    blockedFlows: [],
    impactedOther: [],
  },
  reportByEtablissement: [
    {
      etablissement: 'CH Test',
      impactedApps: [
        {
          label: 'DPI',
          trigramme: 'DPI',
          status: 'hs',
          criticite: 'Critique',
          domaine: 'Soins',
          processus: 'Dossier patient',
          hebergement: 'Interne',
          causes: [{ type: 'Applicatif', label: 'DPI', status: 'hs' }],
        },
      ],
      impactedProcesses: ['Soins / Dossier patient'],
      blockedFlows: [],
      propagation: [],
    },
  ],
});

assert.match(incidentMarkdown, /^# Rapport incident \/ PRA-PCA/m);
assert.match(incidentMarkdown, /Déclencher le PRA\/PCA si disponible/);
assert.doesNotMatch(incidentMarkdown, /PDF/i);

console.log('Markdown report tests: OK');
