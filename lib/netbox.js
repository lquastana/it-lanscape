const NETBOX_URL = process.env.NETBOX_URL;
const NETBOX_TOKEN = process.env.NETBOX_TOKEN;
const NETBOX_TRIGRAMME_PREFIX = process.env.NETBOX_TRIGRAMME_TAG_PREFIX || 'app:';

function isNetboxEnabled() {
  return Boolean(NETBOX_URL && NETBOX_TOKEN);
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`/api/${endpoint.replace(/^\//, '')}`, NETBOX_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  url.searchParams.set('limit', '0');
  return url;
}

async function netboxGet(endpoint, params = {}) {
  const url = buildUrl(endpoint, params);
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${NETBOX_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NetBox API ${endpoint} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.results || [];
}

function extractTrigrammeFromTags(tags = []) {
  const names = tags.map(t => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
  const prefixed = names.find(n => n.startsWith(NETBOX_TRIGRAMME_PREFIX));
  if (prefixed) return prefixed.slice(NETBOX_TRIGRAMME_PREFIX.length).toUpperCase();
  const trigrammeTag = names.find(n => /^[a-zA-Z0-9]{3}$/.test(n));
  if (trigrammeTag) return trigrammeTag.toUpperCase();
  return null;
}

function extractAppCode(device) {
  const cf = device.custom_fields || {};
  return cf.trigramme || cf.app_code || cf.application_code || null;
}

export async function getInfrastructureFromNetbox() {
  const [sites, devices, vms] = await Promise.all([
    netboxGet('dcim/sites/'),
    netboxGet('dcim/devices/', { status: 'active' }),
    netboxGet('virtualization/virtual-machines/', { status: 'active' }),
  ]);

  const bySite = new Map();
  for (const s of sites) bySite.set(s.id, { nom: s.name, applications: {}, serveurs: [] });

  const all = [
    ...devices.map(d => ({
      nom: d.name,
      type: 'physical',
      site: d.site?.id,
      role: d.role?.name,
      ip: d.primary_ip4?.address || d.primary_ip?.address || '',
      trigramme: extractTrigrammeFromTags(d.tags) || extractAppCode(d),
    })),
    ...vms.map(vm => ({
      nom: vm.name,
      type: 'vm',
      site: vm.site?.id,
      role: vm.role?.name,
      ip: vm.primary_ip4?.address || vm.primary_ip?.address || '',
      trigramme: extractTrigrammeFromTags(vm.tags) || extractAppCode(vm),
    })),
  ];

  for (const s of all) {
    const etab = bySite.get(s.site) || { nom: 'Non rattaché', applications: {}, serveurs: [] };
    etab.serveurs.push(s);
    if (s.trigramme) {
      if (!etab.applications[s.trigramme]) etab.applications[s.trigramme] = [];
      etab.applications[s.trigramme].push(s);
    }
    if (!bySite.has(s.site)) bySite.set(s.site, etab);
  }

  return { etablissements: Array.from(bySite.values()) };
}

export async function getNetworkFromNetbox() {
  const [sites, vlans, prefixes] = await Promise.all([
    netboxGet('dcim/sites/'),
    netboxGet('ipam/vlans/'),
    netboxGet('ipam/prefixes/'),
  ]);

  const bySite = new Map();
  for (const s of sites) bySite.set(s.id, { nom: s.name, vlans: [] });

  const prefixesByVlan = new Map();
  for (const p of prefixes) {
    const vlanId = p.vlan?.id;
    if (!vlanId) continue;
    if (!prefixesByVlan.has(vlanId)) prefixesByVlan.set(vlanId, []);
    prefixesByVlan.get(vlanId).push(p.prefix);
  }

  for (const v of vlans) {
    const target = bySite.get(v.site?.id) || { nom: 'Non rattaché', vlans: [] };
    target.vlans.push({
      id: v.vid,
      description: v.name,
      network: (prefixesByVlan.get(v.id) || []).join(', '),
      gateway: '',
      serveurs: [],
    });
    if (!bySite.has(v.site?.id)) bySite.set(v.site?.id, target);
  }

  return { etablissements: Array.from(bySite.values()) };
}

export { isNetboxEnabled };
