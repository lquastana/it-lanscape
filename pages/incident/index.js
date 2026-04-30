import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import MainNav from '../../components/MainNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../../lib/branding';

const STATUS_OPTIONS = [
  { value: 'hs', label: 'HS' },
  { value: 'degrade', label: 'Dégradé' },
  { value: 'latence', label: 'Latence' },
  { value: 'intermittent', label: 'Intermittent' },
];

const STATUS_LABELS = {
  hs: 'Indisponible',
  degrade: 'Dégradé',
  latence: 'Latence',
  intermittent: 'Intermittent',
};

const STATUS_RANK = {
  hs: 4,
  degrade: 3,
  intermittent: 2,
  latence: 1,
};

const STATUS_COLORS = {
  hs: '#b91c1c',
  degrade: '#f97316',
  latence: '#2563eb',
  intermittent: '#7c3aed',
};

const CRITICITE_RANK = {
  Critique: 2,
  Standard: 1,
};

const COMPONENT_TYPES = [
  { value: 'application', label: 'Application' },
  { value: 'serveur', label: 'Serveur' },
  { value: 'flux', label: 'Interface / Flux' },
  { value: 'hebergeur', label: 'Hébergeur' },
  { value: 'custom', label: 'Autre composant' },
];

const formatStatus = (value) => STATUS_LABELS[value] || value;

const prioritySort = (a, b) => {
  const criticiteA = CRITICITE_RANK[a.criticite] || 0;
  const criticiteB = CRITICITE_RANK[b.criticite] || 0;
  if (criticiteA !== criticiteB) return criticiteB - criticiteA;
  const statusA = STATUS_RANK[a.status] || 0;
  const statusB = STATUS_RANK[b.status] || 0;
  if (statusA !== statusB) return statusB - statusA;
  return a.depth - b.depth;
};

const normalizeStatus = (value) => {
  if (!value) return 'degrade';
  if (value === 'hs') return 'hs';
  if (value === 'degrade') return 'degrade';
  if (value === 'intermittent') return 'intermittent';
  return 'latence';
};

const mergeStatus = (current, incoming) => {
  if (!current) return incoming;
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
};

const mapIndirectStatus = (status) => (status === 'hs' ? 'degrade' : status);

const describeStatus = (status) => {
  switch (status) {
    case 'hs':
      return 'Arrêt complet du service';
    case 'degrade':
      return 'Fonctionnalités limitées ou performance réduite';
    case 'latence':
      return 'Temps de réponse élevé';
    case 'intermittent':
      return 'Dysfonctionnements intermittents';
    default:
      return '';
  }
};

const actionsByContext = (status, causes = []) => {
  const types = new Set(causes.map(c => c.type));
  const actions = [];

  if (status === 'hs') {
    actions.push('Déclencher le PRA/PCA si disponible');
    actions.push('Notifier la DSI et les équipes support');
  }
  if (types.has('Infrastructure')) {
    actions.push("Vérifier l'état du serveur (monitoring, logs système)");
    if (status === 'hs') actions.push('Basculer sur le serveur de secours ou redémarrer');
    else actions.push('Surveiller les métriques (CPU, RAM, disque)');
  }
  if (types.has('Interface') || types.has('Interface sortante')) {
    actions.push("Vérifier la disponibilité du middleware / de l'interface");
    actions.push('Activer le mode dégradé sans les flux dépendants');
    if (status === 'hs') actions.push('Identifier un canal de substitution pour les données critiques');
  }
  if (types.has('Hébergeur')) {
    actions.push("Contacter l'hébergeur et obtenir un ETA de rétablissement");
    actions.push('Vérifier les engagements SLA contractuels');
  }
  if (types.has('Dépendance amont')) {
    actions.push('Identifier et traiter le composant source en priorité');
    actions.push('Activer un mode de saisie manuelle si possible');
  }
  if (status === 'degrade' || status === 'latence') {
    actions.push('Prioriser les flux et processus critiques');
    actions.push('Informer les utilisateurs du mode dégradé');
  }
  if (status === 'intermittent') {
    actions.push("Analyser les logs pour identifier le pattern d'instabilité");
    actions.push('Planifier une fenêtre de maintenance préventive');
  }
  if (status === 'latence') {
    actions.push('Vérifier la saturation réseau et les ressources applicatives');
  }
  return [...new Set(actions)];
};

export default function IncidentSimulationPage() {
  const [landscape, setLandscape] = useState(null);
  const [infrastructure, setInfrastructure] = useState(null);
  const [flux, setFlux] = useState(null);
  const [status, setStatus] = useState('Chargement des données...');
  const [selectionType, setSelectionType] = useState('application');
  const [selectionStatus, setSelectionStatus] = useState('hs');
  const [selectionValue, setSelectionValue] = useState('');
  const [selectionNote, setSelectionNote] = useState('');
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [scenarioName, setScenarioName] = useState('');
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [autoRun, setAutoRun] = useState(false);
  const printDetailsStateRef = useRef(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/landscape').then(r => r.json()),
      fetch('/api/infrastructure').then(r => r.json()),
      fetch('/api/flux').then(r => r.json()),
    ])
      .then(([landscapeData, infraData, fluxData]) => {
        setLandscape(landscapeData);
        setInfrastructure(infraData);
        setFlux(fluxData);
        setStatus('');
      })
      .catch(() => setStatus('Impossible de charger les données.'));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('incident-scenarios');
    if (saved) {
      try {
        setSavedScenarios(JSON.parse(saved));
      } catch {
        setSavedScenarios([]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('incident-scenarios', JSON.stringify(savedScenarios));
  }, [savedScenarios]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const selector = '.impact-details details.impact-report';
    const handleBeforePrint = () => {
      const detailsList = Array.from(document.querySelectorAll(selector));
      printDetailsStateRef.current = detailsList.map(detail => detail.open);
      detailsList.forEach(detail => {
        detail.open = true;
      });
    };
    const handleAfterPrint = () => {
      const detailsList = Array.from(document.querySelectorAll(selector));
      detailsList.forEach((detail, index) => {
        const previous = printDetailsStateRef.current?.[index];
        detail.open = Boolean(previous);
      });
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const { appMeta, serverOptions, flowOptions, links, serversByApp, hebergeurOptions } = useMemo(() => {
    const appIndex = new Map();
    const hebergeurs = new Set();
    if (landscape?.etablissements) {
      landscape.etablissements.forEach(etab => {
        etab.domaines.forEach(dom => {
          dom.processus.forEach(proc => {
            proc.applications.forEach(app => {
              if (!app.trigramme) return;
              if (!appIndex.has(app.trigramme)) {
                appIndex.set(app.trigramme, {
                  app,
                  entries: [],
                  multiEtablissement: false,
                });
              }
              const entry = appIndex.get(app.trigramme);
              entry.entries.push({
                etablissement: etab.nom,
                domaine: dom.nom,
                processus: proc.nom,
                hebergement: app.hebergement,
              });
              entry.multiEtablissement = entry.multiEtablissement || Boolean(app.multiEtablissement);
              if (app.hebergement) {
                hebergeurs.add(app.hebergement);
              }
            });
          });
        });
      });
    }

    const labelForTri = (tri) => appIndex.get(tri)?.app?.nom || tri;

    const servers = [];
    const serversByTri = new Map();
    if (infrastructure?.etablissements) {
      infrastructure.etablissements.forEach(etab => {
        Object.entries(etab.applications || {}).forEach(([tri, list]) => {
          serversByTri.set(tri, [...(serversByTri.get(tri) || []), ...list]);
          list.forEach(server => {
            const vmName = server.VM || server.nom;
            const value = `${etab.nom}::${vmName}`;
            servers.push({
              value,
              label: `${vmName} (${tri}) • ${etab.nom}`,
              trigramme: tri,
              etablissement: etab.nom,
              vm: vmName,
            });
          });
        });
      });
    }

    const flows = [];
    const linksList = [];
    if (flux?.etablissements) {
      flux.etablissements.forEach(etab => {
        (etab.flux || []).forEach(flow => {
          flows.push({
            value: flow.id || `${flow.sourceTrigramme}-${flow.targetTrigramme}`,
            label: `${labelForTri(flow.sourceTrigramme)} → ${labelForTri(flow.targetTrigramme)} • ${etab.nom}`,
            ...flow,
            etablissement: etab.nom,
          });
          linksList.push({
            id: flow.id || `${flow.sourceTrigramme}-${flow.targetTrigramme}`,
            source: flow.sourceTrigramme,
            target: flow.targetTrigramme,
            sourceLabel: labelForTri(flow.sourceTrigramme),
            targetLabel: labelForTri(flow.targetTrigramme),
            etablissement: etab.nom,
            messageType: flow.messageType,
            protocol: flow.protocol,
            interfaceType: flow.interfaceType,
          });
        });
      });
    }

    return {
      appMeta: appIndex,
      serverOptions: servers,
      flowOptions: flows,
      links: linksList,
      serversByApp: serversByTri,
      hebergeurOptions: Array.from(hebergeurs).sort((a, b) => a.localeCompare(b)),
    };
  }, [landscape, infrastructure, flux]);

  const handleAddComponent = () => {
    if (!selectionType) return;
    if (selectionType === 'custom' && !selectionNote.trim()) return;
    if (selectionType !== 'custom' && !selectionValue) return;

    let item = null;
    if (selectionType === 'application') {
        const meta = appMeta.get(selectionValue);
        const primaryEntry = meta?.entries?.[0];
        item = {
          id: `${selectionType}-${selectionValue}-${Date.now()}`,
          type: selectionType,
          status: selectionStatus,
          label: meta ? `${meta.app.nom} (${selectionValue})` : selectionValue,
          trigramme: selectionValue,
          etablissement: meta?.multiEtablissement ? 'Multi-établissements' : primaryEntry?.etablissement || 'Inconnu',
          detail: primaryEntry ? `${primaryEntry.domaine} / ${primaryEntry.processus}` : '',
        };
      }
    if (selectionType === 'serveur') {
      const server = serverOptions.find(opt => opt.value === selectionValue);
      item = {
        id: `${selectionType}-${selectionValue}-${Date.now()}`,
        type: selectionType,
        status: selectionStatus,
        label: server?.label || selectionValue,
        trigramme: server?.trigramme,
        vm: server?.vm,
        etablissement: server?.etablissement || 'Inconnu',
      };
    }
    if (selectionType === 'flux') {
      const flow = flowOptions.find(opt => opt.value === selectionValue);
      item = {
        id: `${selectionType}-${selectionValue}-${Date.now()}`,
        type: selectionType,
        status: selectionStatus,
        label: flow?.label || selectionValue,
        flowId: selectionValue,
        sourceTrigramme: flow?.sourceTrigramme,
        targetTrigramme: flow?.targetTrigramme,
        etablissement: flow?.etablissement || 'Inconnu',
      };
    }
    if (selectionType === 'hebergeur') {
      item = {
        id: `${selectionType}-${selectionValue}-${Date.now()}`,
        type: selectionType,
        status: selectionStatus,
        label: `Hébergeur : ${selectionValue}`,
        hebergement: selectionValue,
      };
    }
    if (selectionType === 'custom') {
      item = {
        id: `${selectionType}-${Date.now()}`,
        type: selectionType,
        status: selectionStatus,
        label: selectionNote.trim(),
        note: selectionNote.trim(),
      };
    }

    if (!item) return;
    setSelectedComponents(prev => [...prev, item]);
    setSelectionValue('');
    setSelectionNote('');
  };

  const handleRemoveComponent = (id) => {
    setSelectedComponents(prev => prev.filter(item => item.id !== id));
  };

  const runAnalysis = useCallback(() => {
    if (!selectedComponents.length) {
      setAnalysis(null);
      return;
    }
    const impactedApps = new Map();
    const impactedFlows = new Map();
    const impactedOther = [];
    const propagationEdges = [];
    const visited = new Set();
    const MAX_DEPTH = 5;

    const addAppImpact = (tri, status, source, depth) => {
      if (!tri) return false;
      const current = impactedApps.get(tri);
      const mergedStatus = mergeStatus(current?.status, status);
      const causes = current?.causes ? [...current.causes] : [];
      if (source && !causes.some(c => c.label === source.label)) causes.push(source);
      const newDepth = current ? Math.min(depth, current.depth) : depth;
      const statusChanged = !current || mergedStatus !== current.status;
      const depthImproved = !current || depth < current.depth;
      // Toujours persister les causes ; signaler un changement si statut ou profondeur s'améliore
      impactedApps.set(tri, { trigramme: tri, status: mergedStatus, causes, depth: newDepth });
      return statusChanged || depthImproved;
    };

    // Atténue le statut propagé selon la profondeur et le type d'interface
    const propagateStatus = (status, depth, interfaceType) => {
      if (depth >= MAX_DEPTH) return null;
      const isSync = /(sync|temps.r[eé]el|eai|middleware|api)/i.test(interfaceType || '');
      const rank = STATUS_RANK[status] || 0;
      if (depth === 0) return status;
      // Depth 1 : sync → atténuation légère, async/batch → atténuation forte
      if (depth === 1) {
        if (isSync) return mapIndirectStatus(status); // hs→degrade, degrade→degrade
        return rank >= STATUS_RANK.degrade ? 'latence' : null;
      }
      // Depth 2+ : seulement si le statut source est sévère
      if (rank >= STATUS_RANK.degrade) return 'latence';
      return null;
    };

    // Détecte si un serveur est un point de défaillance unique (DB, etc.)
    const isCriticalServer = (server) => {
      const role = (server?.RoleServeur || server?.role || '').toLowerCase();
      return /\b(db|database|base|bdd|sql|oracle|mysql|postgres|mongo|data)\b/.test(role);
    };

    selectedComponents.forEach(component => {
      if (component.type === 'application') {
        addAppImpact(component.trigramme, normalizeStatus(component.status), {
          type: 'Applicatif',
          label: component.label,
          status: component.status,
        }, 0);
      }

      if (component.type === 'serveur') {
        const allServers = serversByApp.get(component.trigramme) || [];
        const status = normalizeStatus(component.status);
        const impactedServer = allServers.find(s => (s.VM || s.nom) === component.vm);
        const critical = isCriticalServer(impactedServer);
        // DB ou seul serveur → HS complet ; sinon dégradé
        const appStatus = (critical || allServers.length <= 1) ? status : status === 'hs' ? 'degrade' : status;
        addAppImpact(component.trigramme, appStatus, {
          type: 'Infrastructure',
          label: component.label,
          status: component.status,
          detail: critical ? 'Serveur de base de données — point de défaillance unique' : null,
        }, 0);
      }

      if (component.type === 'flux') {
        impactedFlows.set(component.flowId, component);
        const flow = flowOptions.find(f => f.value === component.flowId);
        const status = normalizeStatus(component.status);
        // Impact sur la CIBLE (ne peut plus recevoir)
        const targetStatus = propagateStatus(status, 1, flow?.interfaceType) || 'latence';
        addAppImpact(component.targetTrigramme, targetStatus, {
          type: 'Interface',
          label: component.label,
          status: component.status,
        }, 0);
        // Impact sur la SOURCE (ne peut plus envoyer — atténué)
        const sourceStatus = mapIndirectStatus(targetStatus);
        if (sourceStatus && component.sourceTrigramme) {
          addAppImpact(component.sourceTrigramme, sourceStatus, {
            type: 'Interface sortante',
            label: component.label,
            status: component.status,
          }, 0);
        }
      }

      if (component.type === 'hebergeur') {
        const status = normalizeStatus(component.status);
        appMeta.forEach((meta, tri) => {
          if (meta.app.hebergement !== component.hebergement) return;
          addAppImpact(tri, status, {
            type: 'Hébergeur',
            label: component.label,
            status: component.status,
          }, 0);
        });
      }

      if (component.type === 'custom') {
        impactedOther.push(component);
      }
    });

    // BFS avec détection de cycles et atténuation par profondeur
    const queue = Array.from(impactedApps.values()).map(item => ({
      trigramme: item.trigramme,
      status: item.status,
      depth: item.depth,
    }));

    while (queue.length) {
      const current = queue.shift();
      const visitKey = `${current.trigramme}:${current.depth}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      const outgoing = links.filter(link => link.source === current.trigramme);
      outgoing.forEach(link => {
        const propagated = propagateStatus(current.status, current.depth + 1, link.interfaceType);
        if (!propagated) return;

        propagationEdges.push({
          source: link.source,
          target: link.target,
          sourceLabel: link.sourceLabel,
          targetLabel: link.targetLabel,
          status: propagated,
          interfaceType: link.interfaceType,
        });

        if (addAppImpact(link.target, propagated, {
          type: 'Dépendance amont',
          label: `${link.sourceLabel} → ${link.targetLabel}`,
          status: propagated,
        }, current.depth + 1)) {
          queue.push({
            trigramme: link.target,
            status: propagated,
            depth: current.depth + 1,
          });
        }
      });
    }

    const impactedAppsList = Array.from(impactedApps.values()).flatMap(item => {
      const meta = appMeta.get(item.trigramme);
      const entries = meta?.entries?.length
        ? meta.entries
        : [{
            etablissement: 'Inconnu',
            domaine: 'Non renseigné',
            processus: 'Non renseigné',
            hebergement: meta?.app?.hebergement,
          }];
      const shared = {
        ...item,
        label: meta ? meta.app.nom : item.trigramme,
        criticite: meta?.app?.criticite || 'Standard',
        multiEtablissement: Boolean(meta?.multiEtablissement),
      };
      return entries.map(entry => ({
        ...shared,
        etablissement: entry.etablissement,
        domaine: entry.domaine,
        processus: entry.processus,
        hebergement: entry.hebergement || meta?.app?.hebergement || 'Non renseigné',
      }));
    }).sort(prioritySort);

    const impactedProcesses = Array.from(new Set(impactedAppsList.map(app => `${app.etablissement} • ${app.domaine} / ${app.processus}`)));

    const blockedFlows = links.filter(link => {
      const sourceImpact = impactedApps.get(link.source);
      const targetImpact = impactedApps.get(link.target);
      const flowImpact = impactedFlows.has(link.id);
      return flowImpact || (sourceImpact && STATUS_RANK[sourceImpact.status] >= STATUS_RANK.degrade) || (targetImpact && STATUS_RANK[targetImpact.status] >= STATUS_RANK.degrade);
    });

    setAnalysis({
      impactedApps: impactedAppsList,
      impactedOther,
      impactedProcesses,
      blockedFlows,
      propagationEdges,
    });
  }, [selectedComponents, links, appMeta, serversByApp, flowOptions]);

  useEffect(() => {
    if (autoRun && selectedComponents.length > 0) {
      runAnalysis();
      setAutoRun(false);
    }
  }, [autoRun, selectedComponents, runAnalysis]);

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;
    setSavedScenarios(prev => [
      ...prev,
      {
        id: Date.now(),
        name: scenarioName.trim(),
        components: selectedComponents,
      },
    ]);
    setScenarioName('');
  };

  const handleLoadScenario = (scenario) => {
    setSelectedComponents(scenario.components || []);
    setAnalysis(null);
    setAutoRun(true);
  };

  const handleDeleteScenario = (id) => {
    setSavedScenarios(prev => prev.filter(item => item.id !== id));
  };

  const appOptions = useMemo(() => (
    Array.from(appMeta.entries()).map(([tri, meta]) => {
      const etablissementLabel = meta.multiEtablissement
        ? 'Multi-établissements'
        : meta.entries?.[0]?.etablissement || 'Établissement non renseigné';
      return {
        value: tri,
        label: `${meta.app.nom} (${tri}) • ${etablissementLabel}`,
      };
    }).sort((a, b) => a.label.localeCompare(b.label))
  ), [appMeta]);

  const statusBadge = (status) => `status-badge status-${status}`;
  const reportByEtablissement = useMemo(() => {
    if (!analysis) return [];
    const byEtab = new Map();
    const ensureEtab = (etab) => {
      const key = etab || 'Établissement non renseigné';
      if (!byEtab.has(key)) {
        byEtab.set(key, {
          etablissement: key,
          impactedApps: [],
          impactedProcesses: new Set(),
          blockedFlows: [],
          propagation: [],
        });
      }
      return byEtab.get(key);
    };

    const etabsByTri = new Map();
    analysis.impactedApps.forEach(app => {
      const list = etabsByTri.get(app.trigramme) || new Set();
      list.add(app.etablissement || 'Établissement non renseigné');
      etabsByTri.set(app.trigramme, list);
      const entry = ensureEtab(app.etablissement);
      entry.impactedApps.push(app);
      entry.impactedProcesses.add(`${app.domaine} / ${app.processus}`);
    });

    analysis.blockedFlows.forEach(flow => {
      const entry = ensureEtab(flow.etablissement || 'Établissement non renseigné');
      entry.blockedFlows.push(flow);
    });

    analysis.propagationEdges.forEach(edge => {
      const sourceEtabs = etabsByTri.get(edge.source);
      const targetEtabs = etabsByTri.get(edge.target);
      if (!sourceEtabs || !targetEtabs) return;
      sourceEtabs.forEach(etab => {
        if (!targetEtabs.has(etab)) return;
        const entry = ensureEtab(etab);
        entry.propagation.push({
          ...edge,
          etablissement: etab,
        });
      });
    });

    return Array.from(byEtab.values())
      .map(entry => ({
        ...entry,
        impactedApps: entry.impactedApps.sort(prioritySort),
        impactedProcesses: Array.from(entry.impactedProcesses).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.etablissement.localeCompare(b.etablissement));
  }, [analysis]);

  const propagationDiagrams = useMemo(() => {
    const diagrams = new Map();
    reportByEtablissement.forEach(report => {
      if (!report.propagation.length || !report.impactedApps.length) {
        diagrams.set(report.etablissement, null);
        return;
      }
      const nodesMap = new Map();
      report.impactedApps.forEach(app => {
        const nodeId = `${app.trigramme}-${report.etablissement}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          trigramme: app.trigramme,
          label: app.label,
          process: app.processus || 'Processus non renseigné',
          depth: app.depth ?? 0,
          status: app.status,
        });
      });

      const ensureNode = ({ trigramme, label, process, depth, status }) => {
        const nodeId = `${trigramme}-${report.etablissement}`;
        if (nodesMap.has(nodeId)) return nodeId;
        nodesMap.set(nodeId, {
          id: nodeId,
          trigramme,
          label,
          process: process || 'Processus non renseigné',
          depth,
          status,
        });
        return nodeId;
      };

      const nodes = Array.from(nodesMap.values());
      const maxDepth = Math.max(...nodes.map(node => node.depth), 0);
      const nodeSize = { width: 210, height: 64 };
      const nodeGap = 12;
      const processGap = 20;
      const processPadding = 16;
      const establishmentPadding = 18;
      const processLabelHeight = 16;
      const establishmentLabelHeight = 18;
      const establishmentWidth = nodeSize.width + processPadding * 2 + establishmentPadding * 2;
      const columnWidth = establishmentWidth + 120;
      const layout = [];
      const processBlocks = [];
      const establishmentBlocks = [];

      for (let depth = 0; depth <= maxDepth; depth += 1) {
        const column = nodes
          .filter(node => node.depth === depth)
          .sort((a, b) => {
            const procCompare = a.process.localeCompare(b.process);
            if (procCompare !== 0) return procCompare;
            return a.label.localeCompare(b.label);
          });
        if (!column.length) continue;
        const startY = 80;
        const columnX = depth * columnWidth;
        let currentY = startY;
        const processes = Array.from(new Set(column.map(node => node.process)));
        const establishmentStartY = currentY;
        currentY += establishmentLabelHeight + establishmentPadding;
        processes.forEach(process => {
          const processNodes = column.filter(node => node.process === process);
          const processStartY = currentY;
          currentY += processLabelHeight + processPadding;
          processNodes.forEach((node) => {
            layout.push({
              ...node,
              x: columnX + establishmentPadding + processPadding,
              y: currentY,
            });
            currentY += nodeSize.height + nodeGap;
          });
          if (processNodes.length) {
            currentY -= nodeGap;
          }
          currentY += processPadding;
          processBlocks.push({
            id: `${report.etablissement}-${depth}-${process}`,
            label: process,
            x: columnX + establishmentPadding,
            y: processStartY,
            width: nodeSize.width + processPadding * 2,
            height: currentY - processStartY,
          });
          currentY += processGap;
        });
        if (processes.length) {
          currentY -= processGap;
        }
        currentY += establishmentPadding;
        establishmentBlocks.push({
          id: `${report.etablissement}-${depth}`,
          label: report.etablissement,
          x: columnX,
          y: establishmentStartY,
          width: establishmentWidth,
          height: currentY - establishmentStartY,
        });
      }

      const width = (maxDepth + 1) * columnWidth + nodeSize.width;
      const height = Math.max(
        ...layout.map(node => node.y + nodeSize.height),
        ...processBlocks.map(block => block.y + block.height),
        ...establishmentBlocks.map(block => block.y + block.height),
        320,
      );

      const expandedLinks = [];
      report.propagation.forEach(edge => {
        const sourceId = ensureNode({
          trigramme: edge.source,
          label: edge.sourceLabel,
          process: 'Processus non renseigné',
          depth: 0,
          status: edge.status,
        });
        const targetId = ensureNode({
          trigramme: edge.target,
          label: edge.targetLabel,
          process: 'Processus non renseigné',
          depth: 1,
          status: edge.status,
        });
        expandedLinks.push({
          ...edge,
          sourceId,
          targetId,
        });
      });

      diagrams.set(report.etablissement, {
        nodes: layout,
        processBlocks,
        establishmentBlocks,
        links: expandedLinks,
        width,
        height,
        nodeSize,
      });
    });
    return diagrams;
  }, [reportByEtablissement]);

  const incidentMetrics = useMemo(() => {
    if (!analysis) {
      return {
        selected: selectedComponents.length,
        applications: 0,
        processes: 0,
        flows: 0,
      };
    }
    return {
      selected: selectedComponents.length,
      applications: new Set(analysis.impactedApps.map(app => app.trigramme)).size,
      processes: new Set(analysis.impactedApps.map(app => `${app.domaine} / ${app.processus}`)).size,
      flows: analysis.blockedFlows.length,
    };
  }, [analysis, selectedComponents.length]);

  return (
    <>
      <Head>
        <title>Simulation d'incident - {APP_TITLE}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero incident-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                Simulation d'incident
              </motion.h1>
              <p className="hero-subtitle">
                Simulez une indisponibilité et visualisez les impacts directs et indirects.
              </p>
            </div>
          </div>
          <MainNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="business-command-center incident-command-center page-shell">
        <div className="business-command-intro">
          <span className="business-section-kicker">Crise & continuité</span>
          <h2>Simulation d'impact SIH</h2>
          <p>
            Composez un scénario, qualifiez la panne et obtenez une lecture
            priorisée des applications, processus et flux touchés.
          </p>
        </div>
        <div className="business-kpi-grid" aria-label="Indicateurs incident">
          <article className="business-kpi-card highlight">
            <span>Composants</span>
            <strong>{incidentMetrics.selected}</strong>
            <em>Sélectionnés dans le scénario</em>
          </article>
          <article className="business-kpi-card">
            <span>Applications</span>
            <strong>{incidentMetrics.applications}</strong>
            <em>Potentiellement impactées</em>
          </article>
          <article className="business-kpi-card">
            <span>Processus</span>
            <strong>{incidentMetrics.processes}</strong>
            <em>Métiers concernés</em>
          </article>
          <article className="business-kpi-card">
            <span>Flux</span>
            <strong>{incidentMetrics.flows}</strong>
            <em>Bloqués ou dégradés</em>
          </article>
        </div>
      </section>

      <main className="page-shell incident-page incident-modern">
        <section className="incident-panel">
          <span className="business-section-kicker">Préparation</span>
          <h2>Construire un scénario</h2>
          <p className="muted">
            Sélectionnez un ou plusieurs composants du SI, définissez leur statut, puis lancez l'analyse.
          </p>
          {status && <p className="status">{status}</p>}
          <div className="incident-form">
            <label>
              <span>Type de composant</span>
              <select value={selectionType} onChange={e => setSelectionType(e.target.value)}>
                {COMPONENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Statut</span>
              <select value={selectionStatus} onChange={e => setSelectionStatus(e.target.value)}>
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {selectionType === 'custom' ? (
              <label className="span-2">
                <span>Libellé du composant</span>
                <input
                  type="text"
                  placeholder="Ex : Base Oracle DPI, API externe, etc."
                  value={selectionNote}
                  onChange={e => setSelectionNote(e.target.value)}
                />
              </label>
            ) : (
              <label className="span-2">
                <span>Composant</span>
                <select value={selectionValue} onChange={e => setSelectionValue(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {(selectionType === 'application' ? appOptions
                    : selectionType === 'serveur' ? serverOptions
                    : selectionType === 'flux' ? flowOptions
                    : hebergeurOptions.map(item => ({ value: item, label: item }))).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="incident-actions span-2">
              <button type="button" onClick={handleAddComponent} className="btn-secondary">
                Ajouter au scénario
              </button>
              <button type="button" onClick={runAnalysis}>
                Lancer l'analyse
              </button>
            </div>
          </div>

          <div className="incident-selection">
            <h3>Composants sélectionnés</h3>
            {selectedComponents.length === 0 ? (
              <p className="muted">Aucun composant sélectionné.</p>
            ) : (
              <ul className="selection-list">
                {selectedComponents.map(item => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.label}</strong>
                      <span className="muted"> • {item.type}</span>
                      {item.etablissement && <span className="muted"> • {item.etablissement}</span>}
                      {item.detail && <span className="muted"> • {item.detail}</span>}
                    </div>
                    <span className={statusBadge(item.status)}>{formatStatus(item.status)}</span>
                    <button type="button" onClick={() => handleRemoveComponent(item.id)}>Retirer</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="incident-save">
            <h3>Enregistrer / rejouer</h3>
            <div className="incident-save-row">
              <input
                type="text"
                placeholder="Nom du scénario (ex : Panne serveur EAI)"
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={handleSaveScenario}>
                Enregistrer
              </button>
            </div>
            {savedScenarios.length === 0 ? (
              <p className="muted">Aucun scénario enregistré.</p>
            ) : (
              <ul className="scenario-list">
                {savedScenarios.map(item => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span className="muted"> • {item.components?.length || 0} composant(s)</span>
                    </div>
                    <div className="scenario-actions">
                      <button type="button" onClick={() => handleLoadScenario(item)}>Rejouer</button>
                      <button type="button" className="btn-link" onClick={() => handleDeleteScenario(item.id)}>Supprimer</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="incident-results">
          <div className="incident-results-header">
            <div>
              <span className="business-section-kicker">Analyse</span>
              <h2>Résultats &amp; impacts</h2>
            </div>
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
              Exporter en PDF
            </button>
          </div>
          {!analysis ? (
            <p className="muted">Lancez une analyse pour afficher les impacts.</p>
          ) : (
            <>
              <div className="impact-details">
                <h3>Rapport par établissement</h3>
                {reportByEtablissement.length === 0 ? (
                  <p className="muted">Aucun impact identifié.</p>
                ) : (
                  <div className="impact-cards">
                    {reportByEtablissement.map((report, index) => {
                      const diagram = propagationDiagrams.get(report.etablissement);
                      return (
                      <details
                        key={report.etablissement}
                        className={`impact-card impact-report${index > 0 ? ' print-page-break' : ''}`}
                      >
                        <summary>
                          <span className="summary-main">
                            <strong>{report.etablissement}</strong>
                            <span className="muted">
                              {' '}
                              • {new Set(report.impactedApps.map(a => a.trigramme)).size} application(s)
                              • {report.blockedFlows.length} flux
                              • {report.impactedProcesses.length} processus
                            </span>
                          </span>
                        </summary>
                        <div className="impact-body">
                          <div>
                            <h4>Propagation</h4>
                            {report.propagation.length === 0 ? (
                              <p className="muted">Aucune propagation détectée.</p>
                            ) : (
                              <>
                                {diagram && (
                                  <div className="propagation-diagram">
                                    <div className="propagation-canvas">
                                      <svg
                                        width={diagram.width}
                                        height={diagram.height}
                                      >
                                        <defs>
                                          {Object.entries(STATUS_COLORS).map(([key, color]) => (
                                            <marker
                                              key={key}
                                              id={`prop-arrow-${report.etablissement}-${key}`}
                                              markerWidth="10"
                                              markerHeight="10"
                                              refX="8"
                                              refY="3"
                                              orient="auto"
                                            >
                                              <path d="M0,0 L0,6 L9,3 z" fill={color} />
                                            </marker>
                                          ))}
                                        </defs>
                                        {diagram.establishmentBlocks.map(block => (
                                          <g key={block.id}>
                                            <rect
                                              x={block.x}
                                              y={block.y}
                                              width={block.width}
                                              height={block.height}
                                              rx="18"
                                              fill="#eef2ff"
                                              stroke="#c7d2fe"
                                              strokeWidth="1.5"
                                            />
                                            <text
                                              x={block.x + 16}
                                              y={block.y + 22}
                                              fontSize="12"
                                              fontWeight="600"
                                              fill="#1e293b"
                                            >
                                              {block.label}
                                            </text>
                                          </g>
                                        ))}
                                        {diagram.processBlocks.map(block => (
                                          <g key={block.id}>
                                            <rect
                                              x={block.x}
                                              y={block.y}
                                              width={block.width}
                                              height={block.height}
                                              rx="14"
                                              fill="#ffffff"
                                              stroke="#e2e8f0"
                                              strokeWidth="1"
                                            />
                                            <text
                                              x={block.x + 14}
                                              y={block.y + 18}
                                              fontSize="11"
                                              fontWeight="500"
                                              fill="#475569"
                                            >
                                              {block.label}
                                            </text>
                                          </g>
                                        ))}
                                        {diagram.links.map(edge => {
                                          const sourceNode = diagram.nodes.find(node => node.id === edge.sourceId);
                                          const targetNode = diagram.nodes.find(node => node.id === edge.targetId);
                                          if (!sourceNode || !targetNode) return null;
                                          const startX = sourceNode.x + diagram.nodeSize.width;
                                          const startY = sourceNode.y + diagram.nodeSize.height / 2;
                                          const endX = targetNode.x;
                                          const endY = targetNode.y + diagram.nodeSize.height / 2;
                                          const midX = (startX + endX) / 2;
                                          const pathD = `M${startX},${startY} C${midX},${startY} ${midX},${endY} ${endX},${endY}`;
                                          const stroke = STATUS_COLORS[edge.status] || '#64748b';
                                          const title = [
                                            `Propagation depuis ${edge.sourceLabel}`,
                                            `Impact source: ${formatStatus(edge.status)}`,
                                            `Cible: ${edge.targetLabel}`,
                                            `Type: ${edge.interfaceType || 'Dépendance'}`,
                                          ].join('\n');
                                          return (
                                            <g key={`${edge.sourceId}-${edge.targetId}`}>
                                              <path
                                                d={pathD}
                                                fill="none"
                                                stroke="transparent"
                                                strokeWidth="16"
                                                style={{ pointerEvents: 'stroke' }}
                                              >
                                                <title>{title}</title>
                                              </path>
                                              <path
                                                d={pathD}
                                                fill="none"
                                                stroke={stroke}
                                                strokeWidth="2"
                                                markerEnd={`url(#prop-arrow-${report.etablissement}-${edge.status})`}
                                                style={{ pointerEvents: 'none' }}
                                              />
                                            </g>
                                          );
                                        })}
                                        {diagram.nodes.map(node => (
                                          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                                            <rect
                                              width={diagram.nodeSize.width}
                                              height={diagram.nodeSize.height}
                                              rx="14"
                                              fill="#f8fafc"
                                              stroke={STATUS_COLORS[node.status] || '#dbe3f0'}
                                              strokeWidth="2"
                                            />
                                            <text
                                              x={diagram.nodeSize.width / 2}
                                              y={diagram.nodeSize.height / 2 + 4}
                                              textAnchor="middle"
                                              fontSize="12"
                                              fill="#1f2937"
                                            >
                                              {node.label}
                                            </text>
                                          </g>
                                        ))}
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div>
                            <h4>Impacts priorisés</h4>
                            {report.impactedApps.length === 0 ? (
                              <p className="muted">Aucune application impactée.</p>
                            ) : (
                              report.impactedApps.map(app => (
                                <details key={`${app.trigramme}-${app.etablissement}`} className="impact-card">
                                  <summary>
                                    <span className="summary-main">
                                      <strong>{app.label}</strong>
                                      <span className="muted"> • {app.domaine} / {app.processus}</span>
                                    </span>
                                    <span className="summary-badges">
                                      <span className={`status-pill status-${app.status}`}>{formatStatus(app.status)}</span>
                                      <span className="crit-pill">{app.criticite}</span>
                                    </span>
                                  </summary>
                                  <div className="impact-body">
                                    <p>{describeStatus(app.status)}</p>
                                    <div className="impact-meta">
                                      <div>
                                        <span className="label">Périmètre</span>
                                        <p>{app.etablissement}</p>
                                      </div>
                                      <div>
                                        <span className="label">Hébergeur</span>
                                        <p>{app.hebergement}</p>
                                      </div>
                                      <div>
                                        <span className="label">Type de rupture</span>
                                        <p>{Array.from(new Set(app.causes.map(cause => cause.type))).join(', ') || 'Applicatif'}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="label">Dépendances en cause</span>
                                      <ul>
                                        {app.causes.map((cause, index) => (
                                          <li key={`${app.trigramme}-${index}`}>
                                            {cause.label} ({formatStatus(cause.status)})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <span className="label">Actions recommandées</span>
                                      <ul>
                                        {actionsByContext(app.status, app.causes).map(action => (
                                          <li key={action}>{action}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </details>
                              ))
                            )}
                          </div>
                          <div>
                            <h4>Services &amp; processus touchés</h4>
                            {report.impactedProcesses.length === 0 ? (
                              <p className="muted">Aucun processus identifié.</p>
                            ) : (
                              <ul className="impact-list">
                                {report.impactedProcesses.map(item => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h4>Flux bloqués / dégradés</h4>
                            {report.blockedFlows.length === 0 ? (
                              <p className="muted">Aucun flux impacté.</p>
                            ) : (
                              <ul className="impact-list">
                                {report.blockedFlows.map(flow => (
                                  <li key={`${flow.id}-${flow.source}-${flow.target}`}>
                                    {flow.sourceLabel} → {flow.targetLabel} ({flow.interfaceType || 'Flux'})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                  </div>
                )}
                {analysis.impactedOther.length > 0 && (
                  <div className="impact-cards">
                    {analysis.impactedOther.map(item => (
                      <div key={item.id} className="impact-card static-card">
                        <div className="impact-body">
                          <strong>{item.label}</strong>
                          <span className={`status-pill status-${item.status}`}>{formatStatus(item.status)}</span>
                          <p className="muted">Composant externe à cartographier.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
