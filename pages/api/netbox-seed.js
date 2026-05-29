import fs from 'fs/promises';
import { getNetboxConfig } from '../../lib/netbox.js';
import { withAuthz } from '../../lib/authz.js';
import { resolveDataPath } from '../../lib/dataPaths.js';

function toSlug(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

async function getHandler(req, res) {
  const { enabled } = getNetboxConfig();
  return res.status(200).json({ enabled });
}

async function postHandler(req, res) {
  const config = getNetboxConfig();
  if (!config.enabled) {
    return res.status(503).json({ error: 'Netbox non configuré (NETBOX_URL et NETBOX_TOKEN requis)' });
  }

  const { nom, filename } = req.body || {};
  if (!nom || !String(nom).trim()) {
    return res.status(400).json({ error: 'Nom requis' });
  }

  const nomTrimmed = String(nom).trim();
  const slug = toSlug(nomTrimmed);
  const TRIGRAMME_PREFIX = process.env.NETBOX_TRIGRAMME_TAG_PREFIX || 'app:';

  const h = {
    Authorization: `Token ${config.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const errors = [];

  async function apiGet(endpoint, params = {}) {
    const url = new URL(`/api/${endpoint}`, config.url);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('limit', '0');
    const r = await fetch(url, { headers: h });
    if (!r.ok) throw new Error(`GET ${endpoint} → ${r.status}`);
    return (await r.json()).results ?? [];
  }

  async function apiPost(endpoint, body) {
    const r = await fetch(`${config.url}/api/${endpoint}`, {
      method: 'POST', headers: h, body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) { errors.push(`POST ${endpoint}: ${JSON.stringify(data).slice(0, 120)}`); return null; }
    return data;
  }

  async function apiPatch(endpoint, id, body) {
    const r = await fetch(`${config.url}/api/${endpoint}${id}/`, {
      method: 'PATCH', headers: h, body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) { errors.push(`PATCH ${endpoint}${id}: ${JSON.stringify(data).slice(0, 120)}`); return null; }
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

  try {
    // ── 1. Site ───────────────────────────────────────────────────────────────
    const existing = await apiGet('dcim/sites/', { slug, limit: 1 });
    let site, siteCreated;
    if (existing.length > 0) {
      site = existing[0];
      siteCreated = false;
    } else {
      site = await apiPost('dcim/sites/', { name: nomTrimmed, slug, status: 'active' });
      if (!site) return res.status(502).json({ error: 'Erreur création site Netbox', errors });
      siteCreated = true;
    }

    const vmsCreated = [];
    const vlansCreated = [];

    if (filename) {
      // ── 2. VMs (depuis .infra.json) ────────────────────────────────────────
      let infra = null;
      try {
        infra = JSON.parse(await fs.readFile(resolveDataPath(`${filename}.infra.json`), 'utf-8'));
      } catch { /* fichier absent, on passe */ }

      if (infra?.serveurs?.length) {
        const vmMap = new Map();

        for (const srv of infra.serveurs) {
          const tagName = `${TRIGRAMME_PREFIX}${srv.trigramme}`;
          const tagSlug = toSlug(tagName);
          await getOrCreate('extras/tags/', { slug: tagSlug }, {
            name: tagName, slug: tagSlug, color: '0d6efd',
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
                srv.OS      ? `OS: ${srv.OS}`           : '',
                srv.Backup  ? `Backup: ${srv.Backup}`   : '',
                srv.Editeur ? `Éditeur: ${srv.Editeur}` : '',
                srv.Contact ? `Contact: ${srv.Contact}` : '',
              ].filter(Boolean).join('\n'),
              tags: [{ name: tagName }],
            },
            { description: srv.RoleServeur || '' },
          );
          if (vm) {
            vmMap.set(srv.VM, { vm, ip: srv.PrimaryIPAddress });
            vmsCreated.push({ name: srv.VM, ip: srv.PrimaryIPAddress || null });
          }
        }

        // ── 3. IPs assignées aux interfaces ────────────────────────────────
        for (const [, { vm, ip }] of vmMap) {
          if (!ip) continue;
          const address = `${ip}/32`;
          const ipObj = await getOrCreate('ipam/ip-addresses/', { address }, { address, status: 'active' });
          if (vm && ipObj) {
            const iface = await getOrCreate(
              'virtualization/interfaces/',
              { virtual_machine_id: vm.id, name: 'eth0' },
              { virtual_machine: vm.id, name: 'eth0' },
            );
            if (iface && !ipObj.assigned_object_id) {
              await apiPatch('ipam/ip-addresses/', ipObj.id, {
                assigned_object_type: 'virtualization.vminterface',
                assigned_object_id: iface.id,
              });
              await apiPatch('virtualization/virtual-machines/', vm.id, { primary_ip4: ipObj.id });
            }
          }
        }
      }

      // ── 4. VLANs + Préfixes + Passerelles (depuis .network.json) ──────────
      let network = null;
      try {
        network = JSON.parse(await fs.readFile(resolveDataPath(`${filename}.network.json`), 'utf-8'));
      } catch { /* fichier absent, on passe */ }

      if (network?.vlans?.length) {
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
          vlansCreated.push({ id: vlan.id, nom: vlan.nom, network: vlan.network || null });

          if (vlan.network) {
            await getOrCreate(
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
          }

          if (vlan.gateway) {
            await getOrCreate(
              'ipam/ip-addresses/',
              { address: `${vlan.gateway}/32` },
              {
                address: `${vlan.gateway}/32`,
                status: 'active',
                role: 'anycast',
                description: `Passerelle ${vlan.nom}`,
                comments: `gateway:${vlan.gateway}`,
              },
            );
          }
        }
      }
    }

    return res.status(siteCreated ? 201 : 200).json({
      ok: true,
      site,
      created: siteCreated,
      vms: vmsCreated,
      vlans: vlansCreated,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    return res.status(502).json({ error: 'Netbox inaccessible', detail: e.message });
  }
}

export default async function routeHandler(req, res) {
  if (req.method === 'GET') return withAuthz('read', getHandler)(req, res);
  if (req.method === 'POST') return withAuthz('write', postHandler)(req, res);
  return res.status(405).end();
}
