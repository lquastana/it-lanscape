const NETBOX_TRIGRAMME_PREFIX = process.env.NETBOX_TRIGRAMME_TAG_PREFIX || 'app:';

function isNetboxEnabled() {
  const config = getNetboxConfig();
  return Boolean(config.url && config.token);
}

function getNetboxConfig() {
  const url = process.env.NETBOX_URL?.trim() || '';
  const token = process.env.NETBOX_TOKEN?.trim() || '';

  return {
    enabled: Boolean(url && token),
    url,
    urlSource: url ? 'env' : 'missing',
    token,
    tokenSource: token ? 'env' : 'missing',
  };
}

function buildUrl(endpoint, params = {}) {
  const config = getNetboxConfig();
  const url = new URL(`/api/${endpoint.replace(/^\//, '')}`, config.url);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  url.searchParams.set('limit', '0');
  return url;
}

async function netboxGet(endpoint, params = {}) {
  const config = getNetboxConfig();
  const url = buildUrl(endpoint, params);
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${config.token}`,
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

  const siteNames = new Map();
  for (const s of sites) siteNames.set(s.id, s.name);

  const bySite = new Map();
  for (const s of sites) bySite.set(s.id, { nom: s.name, applications: {}, serveurs: [] });

  function parseComments(comments = '') {
    const result = {};
    for (const line of comments.split('\n')) {
      const m = line.match(/^([^:]+):\s*(.+)$/);
      if (m) result[m[1].trim()] = m[2].trim();
    }
    return result;
  }

  const all = [
    ...devices.map(d => ({
      _siteId: d.site?.id,
      nom: d.name,
      type: 'physical',
      site: siteNames.get(d.site?.id) ?? d.site?.name ?? '',
      role: d.role?.name,
      ip: (d.primary_ip4?.address || d.primary_ip?.address || '').split('/')[0],
      trigramme: extractTrigrammeFromTags(d.tags) || extractAppCode(d),
      CPUs: d.vcpus ?? null,
      MemoryMiB: d.memory ?? null,
      TotalDiskCapacityMiB: d.disk ? d.disk * 1024 : null,
      ...parseComments(d.comments),
    })),
    ...vms.map(vm => ({
      _siteId: vm.site?.id,
      nom: vm.name,
      type: 'vm',
      site: siteNames.get(vm.site?.id) ?? vm.site?.name ?? '',
      description: vm.description || '',
      ip: (vm.primary_ip4?.address || vm.primary_ip?.address || '').split('/')[0],
      trigramme: extractTrigrammeFromTags(vm.tags) || extractAppCode(vm),
      CPUs: vm.vcpus ?? null,
      MemoryMiB: vm.memory ?? null,
      TotalDiskCapacityMiB: vm.disk ? vm.disk * 1024 : null,
      ...parseComments(vm.comments),
    })),
  ];

  for (const s of all) {
    const etab = bySite.get(s._siteId) || { nom: 'Non rattaché', applications: {}, serveurs: [] };
    const { _siteId, ...display } = s;
    etab.serveurs.push(display);
    if (display.trigramme) {
      if (!etab.applications[display.trigramme]) etab.applications[display.trigramme] = [];
      etab.applications[display.trigramme].push(display);
    }
    if (!bySite.has(s._siteId)) bySite.set(s._siteId, etab);
  }

  return { etablissements: Array.from(bySite.values()) };
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
}

function ipInCidr(ip, cidr) {
  const [net, bits] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(net) & mask);
}

export async function getNetworkFromNetbox() {
  const [sites, vlans, prefixes, vms, devices, gwIps] = await Promise.all([
    netboxGet('dcim/sites/'),
    netboxGet('ipam/vlans/'),
    netboxGet('ipam/prefixes/'),
    netboxGet('virtualization/virtual-machines/', { status: 'active' }),
    netboxGet('dcim/devices/', { status: 'active' }),
    netboxGet('ipam/ip-addresses/', { role: 'anycast' }),
  ]);

  // IP → nom du serveur
  const ipToServer = new Map();
  for (const vm of vms) {
    const ip = (vm.primary_ip4?.address || vm.primary_ip?.address || '').split('/')[0];
    if (ip) ipToServer.set(ip, vm.name);
  }
  for (const d of devices) {
    const ip = (d.primary_ip4?.address || d.primary_ip?.address || '').split('/')[0];
    if (ip) ipToServer.set(ip, d.name);
  }

  // IPs gateway indexées par IP (ex: "10.10.10.254")
  const gatewayByIp = new Map();
  for (const ip of gwIps) {
    const addr = (ip.address || '').split('/')[0];
    if (addr) gatewayByIp.set(addr, addr);
  }

  // prefixe → liste VLANs
  const prefixesByVlan = new Map();
  for (const p of prefixes) {
    const vlanId = p.vlan?.id;
    if (!vlanId) continue;
    if (!prefixesByVlan.has(vlanId)) prefixesByVlan.set(vlanId, []);
    prefixesByVlan.get(vlanId).push(p.prefix);
  }

  const bySite = new Map();
  for (const s of sites) bySite.set(s.id, { nom: s.name, vlans: [] });

  for (const v of vlans) {
    const vlanPrefixes = prefixesByVlan.get(v.id) || [];

    // Serveurs dont l'IP est dans un des préfixes du VLAN
    const serveurs = [];
    for (const [ip, nom] of ipToServer) {
      if (vlanPrefixes.some(cidr => ipInCidr(ip, cidr))) {
        serveurs.push({ nom, ip });
      }
    }

    // Trouver la passerelle : IP anycast dans un des préfixes du VLAN
    let gateway = '';
    for (const [ip] of gatewayByIp) {
      if (vlanPrefixes.some(cidr => ipInCidr(ip, cidr))) {
        gateway = ip;
        break;
      }
    }

    const target = bySite.get(v.site?.id) || { nom: 'Non rattaché', vlans: [] };
    target.vlans.push({
      id: v.vid,
      description: v.name,
      network: vlanPrefixes.join(', '),
      gateway,
      serveurs,
    });
    if (!bySite.has(v.site?.id)) bySite.set(v.site?.id, target);
  }

  return { etablissements: Array.from(bySite.values()) };
}

export { getNetboxConfig, isNetboxEnabled };
