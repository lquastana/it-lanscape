import { useEffect, useMemo, useState } from 'react';

const interfaceColors = {
  Medicale: '#4caf50',
  Administrative: '#ffeb3b',
  Planification: '#2196f3',
  Facturation: '#f44336',
  Autre: '#9e9e9e'
};

export function useLandscapeData() {
  const [rawData, setRawData] = useState(null);
  const [filters, setFilters] = useState({
    etab: [],
    domaine: [],
    criticite: '',
    heberg: '',
    interface: '',
    multi: ''
  });

  useEffect(() => {
    fetch('/api/landscape')
      .then(r => r.json())
      .then(setRawData)
      .catch(() => setRawData(null));
  }, []);

  const sets = useMemo(() => {
    const res = {
      etab: new Set(),
      domaine: new Set(),
      heberg: new Set(),
      interface: new Set(),
      multi: new Set()
    };
    if (!rawData) return {
      etab: [],
      domaine: [],
      heberg: [],
      interface: [],
      multi: []
    };
    rawData.etablissements.forEach(e => {
      res.etab.add(e.nom);
      e.domaines.forEach(d => {
        res.domaine.add(d.nom);
        d.processus.forEach(p => p.applications.forEach(a => {
          res.heberg.add(a.hebergement);
          res.multi.add(a.multiEtablissement ? 'Oui' : 'Non');
          Object.entries(a.interfaces).forEach(([k, v]) => v && res.interface.add(k));
        }));
      });
    });
    return Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Array.from(v).sort()]));
  }, [rawData]);

  const filteredData = useMemo(() => {
    if (!rawData) return null;
    const f = filters;
    const deep = JSON.parse(JSON.stringify(rawData));
    deep.etablissements = deep.etablissements
      .filter(e => !f.etab.length || f.etab.includes(e.nom))
      .map(e => ({
        ...e,
        domaines: e.domaines
          .filter(d => !f.domaine.length || f.domaine.includes(d.nom))
          .map(d => ({
            ...d,
            processus: d.processus.map(p => ({
              ...p,
              applications: p.applications.filter(app => {
                const critOk = !f.criticite ||
                  (f.criticite === 'Standard' && app.criticite !== 'Critique') ||
                  (f.criticite === 'Critique' && app.criticite === 'Critique');
                const intOk = !f.interface || app.interfaces[f.interface];
                const multiOk = !f.multi || ((f.multi === 'Oui') === app.multiEtablissement);
                if (f.heberg && app.hebergement !== f.heberg) return false;
                return critOk && intOk && multiOk;
              })
            }))
          }))
      }));
    return deep;
  }, [rawData, filters]);

  const metrics = useMemo(() => {
    if (!filteredData) return { applications: 0 };
    let apps = 0;
    filteredData.etablissements.forEach(e => e.domaines.forEach(d => d.processus.forEach(p => {
      apps += p.applications.length;
    })));
    return { applications: apps };
  }, [filteredData]);

  const updateFilter = (name, value) => {
    setFilters(f => ({ ...f, [name]: value }));
  };

  return { data: filteredData, sets, filters, updateFilter, interfaceColors, metrics };
}
