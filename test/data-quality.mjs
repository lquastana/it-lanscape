import assert from 'node:assert/strict';
import { analyzeDataQuality } from '../lib/qualityAnalysis.js';

const result = analyzeDataQuality({
  trigrammes: {
    APP: 'Application coeur',
    EAI: 'Moteur EAI',
  },
  landscape: {
    etablissements: [
      {
        nom: 'Site A',
        domaines: [
          {
            nom: 'Domaine',
            description: '',
            processus: [
              {
                nom: 'Processus',
                description: '',
                applications: [
                  {
                    nom: 'Application coeur',
                    description: 'Dossier critique',
                    editeur: 'Editeur',
                    referent: '',
                    hebergement: 'Site A',
                    criticite: 'Critique',
                    multiEtablissement: false,
                    lienPRTG: null,
                    interfaces: {
                      Planification: false,
                      Facturation: false,
                      Administrative: true,
                      Medicale: false,
                      Autre: false,
                    },
                    trigramme: 'APP',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  infrastructure: {
    etablissements: [
      {
        nom: 'Site A',
        serveurs: [
          {
            VM: 'srv-app-01',
            PrimaryIPAddress: '10.0.0.10',
            RoleServeur: 'Applicatif',
            CPUs: 2,
            MemoryMiB: 4096,
            TotalDiskCapacityMiB: 102400,
            OS: 'Linux',
            Antivirus: 'EDR',
            Backup: 'RPO 4h',
            Contact: 'dsi@example.org',
            Editeur: 'Editeur',
            trigramme: 'APP',
          },
          {
            VM: 'srv-orphan-01',
            PrimaryIPAddress: '10.0.0.99',
            RoleServeur: 'Technique',
            CPUs: 2,
            MemoryMiB: 4096,
            TotalDiskCapacityMiB: 102400,
            OS: 'Linux',
            Antivirus: 'EDR',
            Backup: 'RPO 24h',
            Contact: 'dsi@example.org',
            Editeur: 'DSI',
            trigramme: 'ZZZ',
          },
        ],
      },
    ],
  },
  network: {
    etablissements: [
      {
        nom: 'Site A',
        vlans: [
          {
            id: 10,
            nom: 'VLAN-APP',
            description: 'Applications',
            network: '10.0.0.0/24',
            interco: 'CORE',
            gateway: '10.0.0.254',
            serveurs: [
              { ip: '10.0.0.10', nom: 'srv-app-01' },
              { ip: '10.0.0.55', nom: 'srv-network-only' },
            ],
          },
        ],
      },
    ],
  },
  fluxData: {
    etablissements: [
      {
        nom: 'Site A',
        flux: [
          {
            id: 'F-001',
            sourceTrigramme: 'APP',
            targetTrigramme: 'MIS',
            protocol: 'HL7',
            port: 2575,
            messageType: 'ADT',
            interfaceType: 'Administrative',
            eaiName: 'EAI',
            description: 'Flux patient',
          },
        ],
      },
    ],
  },
});

assert.ok(result.score < 100);
assert.equal(result.metrics.applications, 1);
assert.equal(result.metrics.servers, 2);
assert.equal(result.metrics.flux, 1);
assert.ok(result.dimensions.completeness.score > 0);
assert.ok(result.issues.some(issue => issue.category === 'orphan-server'));
assert.ok(result.issues.some(issue => issue.category === 'network-infra-mismatch'));
assert.ok(result.issues.some(issue => issue.category === 'unknown-trigramme'));
assert.ok(result.recommendations.length > 0);
assert.equal(result.metrics.sources.infrastructure, 'json');

const netboxResult = analyzeDataQuality({
  sources: {
    applications: 'json',
    infrastructure: 'netbox',
    network: 'netbox',
    flux: 'json',
  },
  trigrammes: {
    APP: 'Application coeur',
  },
  landscape: {
    etablissements: [
      {
        nom: 'Site A',
        domaines: [
          {
            nom: 'Domaine',
            description: '',
            processus: [
              {
                nom: 'Processus',
                description: '',
                applications: [
                  {
                    nom: 'Application coeur',
                    description: 'Dossier critique',
                    editeur: 'Editeur',
                    referent: 'DSI',
                    hebergement: 'Site A',
                    criticite: 'Critique',
                    multiEtablissement: false,
                    lienPRTG: null,
                    interfaces: {
                      Planification: false,
                      Facturation: false,
                      Administrative: true,
                      Medicale: false,
                      Autre: false,
                    },
                    trigramme: 'APP',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  infrastructure: {
    etablissements: [
      {
        nom: 'Non rattaché',
        serveurs: [
          {
            nom: 'nbx-vm-01',
            ip: '10.20.0.10',
            role: 'Applicatif',
            trigramme: 'APP',
            OS: 'Linux',
            Antivirus: 'EDR',
            Backup: 'RPO 4h',
            Contact: 'dsi@example.org',
          },
        ],
      },
    ],
  },
  network: {
    etablissements: [
      {
        nom: 'Non rattaché',
        vlans: [
          {
            id: 20,
            description: 'VLAN NetBox',
            network: '10.20.0.0/24, 10.21.0.0/24',
            gateway: '',
            serveurs: [{ ip: '10.20.0.10', nom: 'nbx-vm-01' }],
          },
        ],
      },
    ],
  },
  fluxData: {
    etablissements: [
      {
        nom: 'Site A',
        flux: [
          {
            id: 'F-NBX',
            sourceTrigramme: 'APP',
            targetTrigramme: 'APP',
            protocol: 'HTTPS',
            port: 443,
            messageType: 'API',
            interfaceType: 'Administrative',
            eaiName: 'API',
            description: 'Flux technique',
          },
        ],
      },
    ],
  },
});

assert.equal(netboxResult.metrics.sources.infrastructure, 'netbox');
assert.equal(netboxResult.metrics.sources.network, 'netbox');
assert.ok(netboxResult.issues.some(issue => issue.category === 'netbox-unassigned-site'));
assert.ok(netboxResult.recommendations.some(recommendation => recommendation.title.includes('NetBox')));

console.log('Data quality tests: OK');
