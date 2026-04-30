#!/usr/bin/env node
// Peuple NetBox depuis les fichiers *.infra.json et *.network.json
// Usage : node scripts/netbox-seed.js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

const NETBOX_URL = process.env.NETBOX_URL || 'http://localhost:8080';
const NETBOX_TOKEN = process.env.NETBOX_TOKEN || '0123456789abcdef0123456789abcdef01234567';
const TRIGRAMME_PREFIX = process.env.NETBOX_TRIGRAMME_TAG_PREFIX || 'app:';

const headers = {
  Authorization: `Token ${NETBOX_TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const ETABLISSEMENTS = [
  { file: 'ch_val_de_lys',       name: 'CH Val-de-Lys',      slug: 'ch-val-de-lys' },
  { file: 'hopital_saint_roch',  name: 'Hôpital Saint-Roch', slug: 'hopital-saint-roch' },
  { file: 'clinique_des_dunes',  name: 'Clinique des Dunes',  slug: 'clinique-des-dunes' },
];

async function apiGet(endpoint, params = {}) {
  const url = new URL(`/api/${endpoint}`, NETBOX_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('limit', '0');
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${endpoint} → ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${NETBOX_URL}/api/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`  ⚠️  POST ${endpoint} échoué :`, JSON.stringify(data).slice(0, 200));
    return null;
  }
  return data;
}

async function apiPatch(endpoint, id, body) {
  const res = await fetch(`${NETBOX_URL}/api/${endpoint}${id}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`  ⚠️  PATCH ${endpoint}${id}/ échoué :`, JSON.stringify(data).slice(0, 200));
    return null;
  }
  return data;
}

async function getOrCreate(endpoint, searchParams, body) {
  const existing = await apiGet(endpoint, searchParams);
  if (existing.length > 0) return existing[0];
  return apiPost(endpoint, body);
}

async function getOrCreateOrUpdate(endpoint, searchParams, body, updateFields) {
  const existing = await apiGet(endpoint, searchParams);
  if (existing.length > 0) {
    const obj = existing[0];
    const needsUpdate = Object.entries(updateFields).some(([k, v]) => obj[k] !== v);
    if (needsUpdate) await apiPatch(endpoint, obj.id, updateFields);
    return { ...obj, ...updateFields };
  }
  return apiPost(endpoint, body);
}

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

async function main() {
  console.log(`🚀 Import NetBox depuis ${NETBOX_URL}\n`);

  // ── 1. Sites ──────────────────────────────────────────────────────────────
  console.log('📍 Sites...');
  const siteMap = new Map();
  for (const etab of ETABLISSEMENTS) {
    const site = await getOrCreate(
      'dcim/sites/',
      { slug: etab.slug },
      { name: etab.name, slug: etab.slug, status: 'active' },
    );
    if (site) {
      siteMap.set(etab.file, site);
      console.log(`  ✓ ${etab.name} (id=${site.id})`);
    }
  }

  // ── 2. VMs ────────────────────────────────────────────────────────────────
  console.log('\n🖥️  Machines virtuelles...');
  const vmMap = new Map(); // nom → vm object (pour IPs plus tard)

  for (const etab of ETABLISSEMENTS) {
    const infra = JSON.parse(readFileSync(join(DATA_DIR, `${etab.file}.infra.json`), 'utf8'));
    const site = siteMap.get(etab.file);
    if (!site) continue;

    for (const srv of infra.serveurs) {
      const tagName = `${TRIGRAMME_PREFIX}${srv.trigramme}`;
      const tagSlug = toSlug(tagName);

      // Tag trigramme
      await getOrCreate('extras/tags/', { slug: tagSlug }, {
        name: tagName,
        slug: tagSlug,
        color: '0d6efd',
      });

      const vm = await getOrCreateOrUpdate(
        'virtualization/virtual-machines/',
        { name: srv.VM, site_id: site.id },
        {
          name: srv.VM,
          site: site.id,
          status: 'active',
          description: srv.RoleServeur || '',
          vcpus: srv.CPUs,
          memory: srv.MemoryMiB,
          disk: Math.round((srv.TotalDiskCapacityMiB || 0) / 1024),
          comments: [
            srv.OS       ? `OS: ${srv.OS}`           : '',
            srv.Backup   ? `Backup: ${srv.Backup}`   : '',
            srv.Editeur  ? `Éditeur: ${srv.Editeur}` : '',
            srv.Contact  ? `Contact: ${srv.Contact}` : '',
          ].filter(Boolean).join('\n'),
          tags: [{ name: tagName }],
        },
        { description: srv.RoleServeur || '' },
      );
      if (vm) {
        vmMap.set(srv.VM, { vm, ip: srv.PrimaryIPAddress });
        console.log(`  ✓ ${srv.VM} [${srv.trigramme}] — ${etab.name}`);
      }
    }
  }

  // ── 3. IPs et assignation aux VMs ─────────────────────────────────────────
  console.log('\n🔌 Adresses IP...');
  for (const [vmName, { vm, ip }] of vmMap) {
    if (!ip) continue;
    const address = `${ip}/32`;
    const ipObj = await getOrCreate(
      'ipam/ip-addresses/',
      { address },
      { address, status: 'active' },
    );

    // Créer une interface sur la VM puis assigner l'IP
    if (vm && ipObj) {
      const iface = await getOrCreate(
        'virtualization/interfaces/',
        { virtual_machine_id: vm.id, name: 'eth0' },
        { virtual_machine: vm.id, name: 'eth0' },
      );
      if (iface && !ipObj.assigned_object_id) {
        await fetch(`${NETBOX_URL}/api/ipam/ip-addresses/${ipObj.id}/`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            assigned_object_type: 'virtualization.vminterface',
            assigned_object_id: iface.id,
          }),
        });
        // Définir comme IP primaire de la VM
        await fetch(`${NETBOX_URL}/api/virtualization/virtual-machines/${vm.id}/`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ primary_ip4: ipObj.id }),
        });
      }
      console.log(`  ✓ ${vmName} → ${address}`);
    }
  }

  // ── 4. VLANs + Préfixes ───────────────────────────────────────────────────
  console.log('\n🌐 VLANs et préfixes...');
  for (const etab of ETABLISSEMENTS) {
    const network = JSON.parse(readFileSync(join(DATA_DIR, `${etab.file}.network.json`), 'utf8'));
    const site = siteMap.get(etab.file);
    if (!site) continue;

    for (const vlan of network.vlans) {
      const vlanObj = await getOrCreate(
        'ipam/vlans/',
        { vid: vlan.id, site_id: site.id },
        {
          vid: vlan.id,
          name: vlan.nom,
          description: vlan.description || '',
          site: site.id,
          status: 'active',
        },
      );
      if (!vlanObj) continue;
      console.log(`  ✓ VLAN ${vlan.id} ${vlan.nom} (${etab.name})`);

      if (vlan.network) {
        const prefix = await getOrCreate(
          'ipam/prefixes/',
          { prefix: vlan.network, site_id: site.id },
          {
            prefix: vlan.network,
            site: site.id,
            vlan: vlanObj.id,
            status: 'active',
            description: vlan.description || '',
          },
        );
        if (prefix) console.log(`    ✓ Préfixe ${vlan.network}`);
      }

      // Passerelle
      if (vlan.gateway) {
        const gwAddress = `${vlan.gateway}/32`;
        await getOrCreate(
          'ipam/ip-addresses/',
          { address: gwAddress },
          {
            address: gwAddress,
            status: 'active',
            role: 'anycast',
            description: `Passerelle ${vlan.nom}`,
            comments: `gateway:${vlan.gateway}`,
          },
        );
        console.log(`    ✓ Passerelle ${vlan.gateway}`);
      }
    }
  }

  console.log('\n✅ Import terminé !');
}

main().catch(err => { console.error('❌ Erreur :', err.message); process.exit(1); });
