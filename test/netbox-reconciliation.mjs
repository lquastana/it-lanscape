import assert from 'node:assert/strict';
import { analyzeNetboxReconciliation } from '../lib/netboxReconciliation.js';

const landscape = {
  etablissements: [
    {
      nom: 'CH Test',
      domaines: [
        {
          nom: 'Soins',
          processus: [
            {
              nom: 'Dossier patient',
              applications: [
                {
                  nom: 'Dossier Patient Informatisé',
                  trigramme: 'DPI',
                  criticite: 'Critique',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const result = analyzeNetboxReconciliation({
  landscape,
  netbox: {
    virtualMachines: [
      {
        id: 1,
        name: 'vm-dossier-patient-informatise-01',
        site: { id: 1, name: 'CH Test' },
        tags: [],
        custom_fields: {},
        primary_ip4: { address: '10.10.1.10/24' },
      },
      {
        id: 2,
        name: 'vm-bad-map',
        site: { id: 1, name: 'CH Test' },
        tags: [{ name: 'app:DPIS' }, { name: 'app:XYZ' }],
        custom_fields: { trigramme: 'DPI' },
        primary_ip4: { address: '10.10.2.10/24' },
      },
      {
        id: 3,
        name: 'vm-no-site',
        site: null,
        tags: [{ name: 'app:DPI' }],
        custom_fields: { trigramme: 'DPI' },
        primary_ip4: { address: '10.10.3.10/24' },
      },
    ],
    devices: [
      {
        id: 4,
        name: 'fw-test',
        site: { id: 1, name: 'CH Test' },
        tags: [{ name: 'app:DPI' }],
        custom_fields: {},
        primary_ip4: { address: '10.10.1.1/24' },
      },
    ],
    vlans: [
      { id: 10, vid: 10, name: 'VLAN-DPI', site: { id: 1, name: 'CH Test' } },
      { id: 20, vid: 20, name: 'VLAN-ORPHELIN', site: { id: 1, name: 'CH Test' } },
      { id: 30, vid: 30, name: 'VLAN-NOSITE', site: null },
    ],
    prefixes: [
      { id: 101, prefix: '10.10.1.0/24', vlan: { id: 10 }, site: { id: 1, name: 'CH Test' } },
      { id: 102, prefix: '10.10.9.0/24', vlan: { id: 20 }, site: { id: 1, name: 'CH Test' } },
      { id: 103, prefix: '10.10.30.0/24', vlan: { id: 30 }, site: null },
    ],
  },
  tagPrefix: 'app:',
});

const types = new Set(result.issues.map(issue => issue.type));

assert.equal(result.metrics.applications, 1);
assert.equal(result.metrics.virtualMachines, 3);
assert.equal(result.metrics.devices, 1);
assert.equal(result.metrics.vlans, 3);
assert(types.has('vm-missing-trigramme'));
assert(types.has('vlan-without-app-usage'));
assert(types.has('unattached-object'));
assert(types.has('inconsistent-tags'));
assert(types.has('missing-custom-field'));
assert(result.suggestions.some(suggestion => suggestion.trigramme === 'DPI'));
assert(result.issues.some(issue => issue.title === 'Tags applicatifs incohérents'));
assert(result.issues.some(issue => issue.title === 'Tag applicatif invalide'));

console.log('NetBox reconciliation tests: OK');
