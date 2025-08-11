import { useCallback, useEffect, useMemo, useState } from 'react';
import useMetrics from './useMetrics';

// --- Constantes « globales » -----------------------------
export const interfaceColors = {
  Medicale: '#4caf50',
  Administrative: '#ffeb3b',
  Planification: '#2196f3',
  Facturation: '#f44336',
  Autre: '#9e9e9e',
};



// ---------------------------------------------------------
// 1)   Chargement JSON   ----------------------------------
// ---------------------------------------------------------
function useRawLandscape() {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/landscape')
      .then(r => r.json())
      .then(setRaw)
      .catch(e => setError(e));
  }, []);

  return { raw, error };
}

// ---------------------------------------------------------
// 2)   Construction des sets (valeurs distinctes) ---------
// ---------------------------------------------------------
function useFilterSets(raw) {
  return useMemo(() => {
    if (!raw) {
      return { etab: [], domaine: [], heberg: [], interface: [], multi: [] };
    }
    const sets = {
      etab: new Set(),
      domaine: new Set(),
      heberg: new Set(),
      interface: new Set(),
      multi: new Set(),
    };

    raw.etablissements.forEach(e => {
      sets.etab.add(e.nom);
      e.domaines.forEach(d => {
        sets.domaine.add(d.nom);
        d.processus.forEach(p =>
          p.applications.forEach(a => {
            sets.heberg.add(a.hebergement);
            sets.multi.add(a.multiEtablissement ? 'Oui' : 'Non');
            Object.entries(a.interfaces).forEach(([k, v]) => v && sets.interface.add(k));
          }),
        );
      });
    });

    return Object.fromEntries(
      Object.entries(sets).map(([k, s]) => [k, Array.from(s).sort()]),
    );
  }, [raw]);
}

// ---------------------------------------------------------
// 3)   Filtrage en fonction des filtres utilisateur -------
// ---------------------------------------------------------
function useFilteredData(raw, filters) {
  return useMemo(() => {
    if (!raw) return null;

    const { etab, domaine, criticite, heberg, interface: iface, multi } = filters;

    // Deep–clone (on ne modifie jamais raw)
    const clone = structuredClone(raw);

    clone.etablissements = clone.etablissements
      .filter(e => !etab.length || etab.includes(e.nom))
      .map(e => ({
        ...e,
        domaines: e.domaines
          .filter(d => !domaine.length || domaine.includes(d.nom))
          .map(d => ({
            ...d,
            processus: d.processus.map(p => ({
              ...p,
              applications: p.applications.filter(app => {
                const critOk =
                  !criticite ||
                  (criticite === 'Standard' && app.criticite !== 'Critique') ||
                  (criticite === 'Critique' && app.criticite === 'Critique');

                const ifaceOk = !iface || app.interfaces[iface];
                const multiOk = !multi || (multi === 'Oui') === app.multiEtablissement;
                const hebergOk = !heberg || app.hebergement === heberg;

                return critOk && ifaceOk && multiOk && hebergOk;
              }),
            })),
          })),
      }));

    return clone;
  }, [raw, filters]);
}



// ---------------------------------------------------------
//  EXPORT du hook principal -------------------------------
// ---------------------------------------------------------
export function useLandscapeData() {
  const { raw, error } = useRawLandscape();

  const [filters, setFilters] = useState({
    etab: [],
    domaine: [],
    criticite: '',
    heberg: '',
    interface: '',
    multi: '',
    search: '',
  });

  const sets = useFilterSets(raw);
  const data = useFilteredData(raw, filters);
  const metrics = useMetrics(data);

  /* pour les composants */
  const updateFilter = (name, value) => {
    if (name === 'reset') {
      setFilters({                  // valeurs par défaut
        etab: [], domaine: [],
        criticite: '', heberg: '',
        interface: '', multi: '',
        search: '',
      });
    } else {
      setFilters(f => ({ ...f, [name]: value }));
    }
  };

  return { data, sets, filters, updateFilter, interfaceColors, metrics, error };
}


