// hooks/useMetrics.js
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

    /* --- compteurs bruts --- */
    let procTotal = 0,
        procWithApps = 0,
        procAppsTotal = 0,
        appShown = 0,
        multi = 0,
        critStandard = 0,
        critCritique = 0,
        fieldsFilled = 0,
        fieldsTotal  = 0,
        dpAppTotal   = 0;

    const hebergCounts   = {};
    const ifaceCoverage  = {};
    const procAppsMap    = {};   // pour l’alignement inter‑étab.
    const noAppProcesses = [];
    const alignDiffs     = [];
    const nonMultiApps   = [];
    const incompleteApps = [];

    data.etablissements.forEach(etab => {
      etab.domaines.forEach(domain => {

        domain.processus.forEach(proc => {
          procTotal++;
          if (proc.applications.length) procWithApps++; else
            noAppProcesses.push({ domain: domain.nom, process: proc.nom });

          procAppsTotal += proc.applications.length;

          const key = `${domain.nom}::${proc.nom}`;
          procAppsMap[key] = procAppsMap[key] || {};

          proc.applications.forEach(app => {
            /* --- métriques générales --- */
            appShown++;
            if (app.multiEtablissement) multi++; else
              nonMultiApps.push({ app: app.nom, etab: etab.nom, domain: domain.nom, process: proc.nom });

            if (app.criticite === 'Critique') critCritique++; else critStandard++;

            hebergCounts[app.hebergement] = (hebergCounts[app.hebergement] || 0) + 1;

            fieldsTotal += 3;
            const missing = [];
            if (app.editeur)   fieldsFilled++;   else missing.push('editeur');
            if (app.referent)  fieldsFilled++;   else missing.push('referent');
            if (app.lienPRTG)  fieldsFilled++;   else missing.push('supervision');
            if (missing.length)
              incompleteApps.push({ ...missing, app: app.nom, etab: etab.nom, domain: domain.nom, process: proc.nom });

            /* --- alignement inter‑établissements --- */
            procAppsMap[key][etab.nom] = procAppsMap[key][etab.nom] || new Set();
            procAppsMap[key][etab.nom].add(app.nom);

            /* --- interfaces sur domaines DP --- */
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

    /* --- alignement apps inter‑étab. --- */
    let alignTotal = 0, alignOk = 0;
    Object.entries(procAppsMap).forEach(([procKey, map]) => {
      const signatures = Object.values(map).map(set => [...set].sort().join('|'));
      if (signatures.length > 1) {
        alignTotal++;
        if (new Set(signatures).size === 1) alignOk++;
        else alignDiffs.push({ process: procKey, detail: map });
      }
    });

    /* --- pour le bouton « 📋 » : texte diff --- */
    const diffLines = [];
    noAppProcesses.forEach(p  => diffLines.push(`Processus sans appli : ${p.domain} :: ${p.process}`));
    alignDiffs.forEach(d      => diffLines.push(`Incohérence apps : ${d.process}`));
    nonMultiApps.forEach(a    => diffLines.push(`Pas mutualisé : ${a.app} (${a.etab})`));
    incompleteApps.forEach(a  => diffLines.push(`Champs manquants : ${a.app} (${a.domain}/${a.process})`));

    /* --- taux / pourcentages --- */
    const pct = (num, den) => den ? (num / den * 100).toFixed(1) : 0;

    return {
      /* KPI généraux */
      applications : appShown,
      procPct      : pct(procWithApps, procTotal),
      alignPct     : pct(alignOk, alignTotal),
      multiPct     : pct(multi, appShown),
      complPct     : pct(fieldsFilled, fieldsTotal),

      /* Répartitions */
      critStandard, critCritique,
      hebergCounts,
      ifaceCoverage,
      dpAppTotal,

      /* Pour le copier‑coller */
      diffText     : diffLines.join('\n'),
    };
  }, [data]);
}
