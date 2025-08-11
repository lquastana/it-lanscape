import { useEffect, useMemo, useState } from 'react';

export default function useNetworkData() {
  const [raw, setRaw] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(setRaw)
      .catch(() => {});
  }, []);

  const data = useMemo(() => {
    if (!raw) return null;
    const term = filters.search.toLowerCase();
    if (!term) return raw;
    const etablissements = raw.etablissements
      .map(e => ({
        ...e,
        vlans: e.vlans.filter(v => {
          if (`vlan-${v.id}`.toLowerCase().includes(term)) return true;
          if ((v.description || '').toLowerCase().includes(term)) return true;
          if ((v.network || '').includes(term)) return true;
          if ((v.gateway || '').includes(term)) return true;
          return v.serveurs.some(s => s.nom.toLowerCase().includes(term) || s.ip.includes(term));
        }),
      }))
      .filter(e => e.vlans.length > 0);
    return { etablissements };
  }, [raw, filters]);

  const updateFilter = (name, value) => {
    if (name === 'reset') {
      setFilters({ search: '' });
    } else {
      setFilters(f => ({ ...f, [name]: value }));
    }
  };

  return { data, filters, updateFilter };
}
