// hooks/useMetrics.js
// -----------------------------------------------------------------------------
// Calcul des indicateurs SIH – version « convergence multi‑établissements »
// -----------------------------------------------------------------------------
//  > Alignement processus :
//      • 1 seul établissement  → 100 %
//      • ≥ 2 établissements     → moyenne de similarité Jaccard
//        entre tous les couples d'établissements.
//  > Le tableau diff (bouton 📋) inclut désormais :
//      • Processus non couverts par établissement
//      • Incohérences d'applications (détail par établissement)
//      • Apps non mutualisées
//      • Champs manquants (liste précise)
// -----------------------------------------------------------------------------

import { useMemo } from 'react';

const DP_DOMAINS = [
  'DP Spécialités',
  'DP Administrative',
  'DP Commun',
  'Dossier médico-techniques',
];

export default function useMetrics(data) {
  return useMemo(() => {
    if (!data) return {};

    /* === compteurs === */
    let procTotal       = 0,
        procWithApps    = 0,
        procAppsTotal   = 0,
        appShown        = 0,
        multi           = 0,
        critStandard    = 0,
        critCritique    = 0,
        fieldsFilled    = 0,
        fieldsTotal     = 0,
        dpAppTotal      = 0;

    const hebergCounts   = {};
    const ifaceCoverage  = {};
    const procAppsMap    = {};   // domain::process ➜ { etab ➜ Set(apps) }
    const procPresence   = {};   // domain::process ➜ Set(etabs)

    const noAppProcesses = [];
    const alignDiffs     = [];
    const nonMultiApps   = [];
    const incompleteApps = [];

    /* === parcours JSON === */
    data.etablissements.forEach(etab => {
      etab.domaines.forEach(domain => {
        domain.processus.forEach(proc => {
          const procKey = `${domain.nom}::${proc.nom}`;
          procTotal++;

          procPresence[procKey] = procPresence[procKey] || new Set();

          if (proc.applications.length) {
            procWithApps++;
            procPresence[procKey].add(etab.nom);
          } else {
            noAppProcesses.push({ domain: domain.nom, process: proc.nom, etab: etab.nom });
          }

          procAppsTotal += proc.applications.length;
          procAppsMap[procKey] = procAppsMap[procKey] || {};

          proc.applications.forEach(app => {
            /* -- compteurs généraux -- */
            appShown++;

            if (app.multiEtablissement) {
              multi++;
            } else {
              nonMultiApps.push({ app: app.nom, etab: etab.nom, domain: domain.nom, process: proc.nom });
            }

            if (app.criticite === 'Critique') critCritique++; else critStandard++;

            hebergCounts[app.hebergement] = (hebergCounts[app.hebergement] || 0) + 1;

            /* complétude */
            fieldsTotal += 3;
            const missing = [];
            if (app.editeur)  fieldsFilled++; else missing.push('editeur');
            if (app.referent) fieldsFilled++; else missing.push('referent');
            if (app.lienPRTG) fieldsFilled++; else missing.push('supervision');
            if (missing.length) {
              incompleteApps.push({ missing, app: app.nom, etab: etab.nom, domain: domain.nom, process: proc.nom });
            }

            /* alignement apps */
            procAppsMap[procKey][etab.nom] = procAppsMap[procKey][etab.nom] || new Set();
            procAppsMap[procKey][etab.nom].add(app.nom);

            /* interfaces DP */
            if (DP_DOMAINS.includes(domain.nom)) {
              dpAppTotal++;
              Object.entries(app.interfaces).forEach(([iface, active]) => {
                if (active) ifaceCoverage[iface] = (ifaceCoverage[iface] || 0) + 1;
              });
            }
          });
        });
      });
    });

    /* === alignement APPS inter‑étabs === */
    let alignTotal = 0, alignOk = 0;
    Object.entries(procAppsMap).forEach(([procKey, map]) => {
      const signatures = Object.values(map).map(set => [...set].sort().join('|'));
      if (signatures.length > 1) {
        alignTotal++;
        const uniq = new Set(signatures);
        if (uniq.size === 1) {
          alignOk++;
        } else {
          alignDiffs.push({ process: procKey, detail: map });
        }
      }
    });

    /* === alignement PROCESSUS (similarité Jaccard) === */
    const etabNames = data.etablissements.map(e => e.nom);
    let simSum = 0, simPairs = 0;
    for (let i = 0; i < etabNames.length; i++) {
      for (let j = i + 1; j < etabNames.length; j++) {
        const e1 = etabNames[i], e2 = etabNames[j];
        const set1 = new Set(Object.entries(procPresence).filter(([, s]) => s.has(e1)).map(([k]) => k));
        const set2 = new Set(Object.entries(procPresence).filter(([, s]) => s.has(e2)).map(([k]) => k));
        const inter = [...set1].filter(x => set2.has(x));
        const union = new Set([...set1, ...set2]);
        const sim   = union.size ? inter.length / union.size : 1;
        simSum += sim;
        simPairs++;
      }
    }
    const procPct = etabNames.length === 1 ? 100 : ((simSum / simPairs) * 100);

    /* === différences présence processus === */
    etabNames.forEach(etab => {
      Object.entries(procPresence).forEach(([procKey, set]) => {
        if (!set.has(etab)) {
          const [domName, procName] = procKey.split('::');
          noAppProcesses.push({ domain: domName, process: procName, etab });
        }
      });
    });

    /* === construction diffText === */
    const diffLines = [];

    // Processus non couverts
    noAppProcesses.forEach(p => {
      diffLines.push(`Processus non couvert : ${p.domain} :: ${p.process} (${p.etab})`);
    });

    // Incohérences d'applications (détail)
    alignDiffs.forEach(d => {
      const list = Object.entries(d.detail)
        .map(([etab, set]) => `${etab}: ${[...set].sort().join(', ') || '—'}`)
        .join(' | ');
      diffLines.push(`Incohérence apps : ${d.process} → ${list}`);
    });

    // Apps non mutualisées
    nonMultiApps.forEach(a => {
      diffLines.push(`Pas mutualisé : ${a.app} (${a.etab})`);
    });

    // Champs manquants détaillés
    incompleteApps.forEach(a => {
      diffLines.push(`Champs manquants : ${a.app} (${a.domain}/${a.process}) → ${a.missing.join(', ')}`);
    });

    /* === helper pour % === */
    const pct = (num, den) => den ? (num / den * 100).toFixed(1) : 0;

    return {
      /* KPI généraux */
      applications : appShown,
      procPct      : procPct.toFixed(1),
      alignPct     : pct(alignOk, alignTotal),
      multiPct     : pct(multi, appShown),
      complPct     : pct(fieldsFilled, fieldsTotal),

      /* répartitions */
      critStandard, critCritique,
      hebergCounts,
      ifaceCoverage,
      dpAppTotal,

      /* clipboard */
      diffText     : diffLines.join('\n'),
    };
  }, [data]);
}