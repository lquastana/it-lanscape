import { useEffect, useMemo, useState } from 'react';

export default function useNetworkData() {
  const [raw, setRaw] = useState(null);
  const [filters, setFilters] = useState({ search: '', mode: 'vlan' });
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
      .map(e => {
        const vlans = e.vlans
          .map(v => {
            if (filters.mode === 'server') {
              const serveurs = v.serveurs.filter(
                s => s.nom.toLowerCase().includes(term) || s.ip.includes(term)
              );
              if (serveurs.length === 0) return null;
              return { ...v, serveurs };
            }
            if (`vlan-${v.id}`.toLowerCase().includes(term)) return v;
            if ((v.description || '').toLowerCase().includes(term)) return v;
            if ((v.network || '').includes(term)) return v;
            if ((v.gateway || '').includes(term)) return v;
            return null;
          })
          .filter(Boolean);
        return { ...e, vlans };
      })
      .filter(e => e.vlans.length > 0);
    return { etablissements };
  }, [raw, filters]);

  const updateFilter = (name, value) => {
    if (name === 'reset') {
      setFilters({ search: '', mode: 'vlan' });
    } else {
      setFilters(f => ({ ...f, [name]: value }));
    }
  };

  return { data, filters, updateFilter };
}
