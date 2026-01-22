import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

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

const actionsByStatus = (status) => {
  if (status === 'hs') {
    return ['Bascule PRA/PCA', 'Communication aux équipes', 'Redémarrage ciblé'];
  }
  if (status === 'degrade') {
    return ['Mode dégradé', 'Priorisation des flux critiques', 'Surveillance renforcée'];
  }
  if (status === 'latence') {
    return ['Vérifier la capacité réseau', 'Réduire les charges non critiques'];
  }
  return ['Analyse des logs', 'Planifier une fenêtre de maintenance'];
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
          serversByTri.set(tri, list);
          list.forEach(server => {
            const value = `${etab.nom}::${server.VM}`;
            servers.push({
              value,
              label: `${server.VM} (${tri}) • ${etab.nom}`,
              trigramme: tri,
              etablissement: etab.nom,
              vm: server.VM,
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

    const addAppImpact = (tri, status, source, depth) => {
      if (!tri) return false;
      const current = impactedApps.get(tri);
      const mergedStatus = mergeStatus(current?.status, status);
      const causes = current?.causes ? [...current.causes] : [];
      if (source) causes.push(source);
      const shouldUpdate = !current || mergedStatus !== current.status || depth < current.depth;
      if (shouldUpdate) {
        impactedApps.set(tri, {
          trigramme: tri,
          status: mergedStatus,
          causes,
          depth: Math.min(depth, current?.depth ?? depth),
        });
      }
      return shouldUpdate;
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
        const servers = serversByApp.get(component.trigramme) || [];
        const status = normalizeStatus(component.status);
        const appStatus = servers.length <= 1 && status === 'hs' ? 'hs' : status === 'hs' ? 'degrade' : status;
        addAppImpact(component.trigramme, appStatus, {
          type: 'Infrastructure',
          label: component.label,
          status: component.status,
        }, 0);
      }
      if (component.type === 'flux') {
        impactedFlows.set(component.flowId, component);
        addAppImpact(component.targetTrigramme, 'degrade', {
          type: 'Interface',
          label: component.label,
          status: component.status,
        }, 0);
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

    const queue = Array.from(impactedApps.values()).map(item => ({
      trigramme: item.trigramme,
      status: item.status,
      depth: item.depth,
    }));

    while (queue.length) {
      const current = queue.shift();
      const outgoing = links.filter(link => link.source === current.trigramme);
      outgoing.forEach(link => {
        propagationEdges.push({
          source: link.source,
          target: link.target,
          sourceLabel: link.sourceLabel,
          targetLabel: link.targetLabel,
          status: current.status,
          interfaceType: link.interfaceType,
        });
        if (addAppImpact(link.target, mapIndirectStatus(current.status), {
          type: 'Dépendance amont',
          label: `${link.sourceLabel} → ${link.targetLabel}`,
          status: current.status,
        }, current.depth + 1)) {
          queue.push({
            trigramme: link.target,
            status: mapIndirectStatus(current.status),
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
      if (meta?.multiEtablissement) {
        return entries.map(entry => ({
          ...shared,
          etablissement: entry.etablissement,
          domaine: entry.domaine,
          processus: entry.processus,
          hebergement: entry.hebergement || meta?.app?.hebergement || 'Non renseigné',
        }));
      }
      const entry = entries[0];
      return [{
        ...shared,
        etablissement: entry.etablissement,
        domaine: entry.domaine,
        processus: entry.processus,
        hebergement: entry.hebergement || meta?.app?.hebergement || 'Non renseigné',
      }];
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
  }, [selectedComponents, links, appMeta, serversByApp]);

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
  const propagationDiagram = useMemo(() => {
    if (!analysis?.propagationEdges?.length) return null;
    const nodesMap = new Map();
    analysis.impactedApps.forEach(app => {
      const nodeId = `${app.trigramme}-${app.etablissement}`;
      if (nodesMap.has(nodeId)) return;
      nodesMap.set(nodeId, {
        id: nodeId,
        trigramme: app.trigramme,
        label: app.label,
        etablissement: app.etablissement,
        process: app.processus,
        depth: app.depth ?? 0,
        status: app.status,
      });
    });
    analysis.propagationEdges.forEach(edge => {
      const sourceMeta = appMeta.get(edge.source);
      const targetMeta = appMeta.get(edge.target);
      const sourceEntries = sourceMeta?.entries?.length
        ? sourceMeta.entries
        : [{ etablissement: edge.source, processus: 'Processus non renseigné' }];
      const targetEntries = targetMeta?.entries?.length
        ? targetMeta.entries
        : [{ etablissement: edge.target, processus: 'Processus non renseigné' }];
      sourceEntries.forEach(entry => {
        const sourceId = `${edge.source}-${entry.etablissement}`;
        if (nodesMap.has(sourceId)) return;
        nodesMap.set(sourceId, {
          id: sourceId,
          trigramme: edge.source,
          label: edge.sourceLabel,
          etablissement: entry.etablissement,
          process: entry.processus,
          depth: 0,
          status: edge.status,
        });
      });
      targetEntries.forEach(entry => {
        const targetId = `${edge.target}-${entry.etablissement}`;
        if (nodesMap.has(targetId)) return;
        nodesMap.set(targetId, {
          id: targetId,
          trigramme: edge.target,
          label: edge.targetLabel,
          etablissement: entry.etablissement,
          process: entry.processus,
          depth: 1,
          status: edge.status,
        });
      });
    });

    const nodes = Array.from(nodesMap.values());
    const maxDepth = Math.max(...nodes.map(node => node.depth), 0);
    const nodeSize = { width: 210, height: 64 };
    const nodeGap = 12;
    const processGap = 20;
    const establishmentGap = 28;
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
        .map(node => ({
          ...node,
          etablissement: node.etablissement || 'Établissement non renseigné',
          process: node.process || 'Processus non renseigné',
        }))
        .sort((a, b) => {
          const estCompare = a.etablissement.localeCompare(b.etablissement);
          if (estCompare !== 0) return estCompare;
          const procCompare = a.process.localeCompare(b.process);
          if (procCompare !== 0) return procCompare;
          return a.label.localeCompare(b.label);
        });
      const startY = 80;
      const columnX = depth * columnWidth;
      let currentY = startY;
      const establishments = Array.from(new Set(column.map(node => node.etablissement)));
      establishments.forEach(establishment => {
        const establishmentNodes = column.filter(node => node.etablissement === establishment);
        const processes = Array.from(new Set(establishmentNodes.map(node => node.process)));
        const establishmentStartY = currentY;
        currentY += establishmentLabelHeight + establishmentPadding;
        processes.forEach(process => {
          const processNodes = establishmentNodes.filter(node => node.process === process);
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
            id: `${depth}-${establishment}-${process}`,
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
          id: `${depth}-${establishment}`,
          label: establishment,
          x: columnX,
          y: establishmentStartY,
          width: establishmentWidth,
          height: currentY - establishmentStartY,
        });
        currentY += establishmentGap;
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
    analysis.propagationEdges.forEach(edge => {
      const sourceMeta = appMeta.get(edge.source);
      const targetMeta = appMeta.get(edge.target);
      const sourceEntries = sourceMeta?.entries?.length
        ? sourceMeta.entries
        : [{ etablissement: edge.source, processus: 'Processus non renseigné' }];
      const targetEntries = targetMeta?.entries?.length
        ? targetMeta.entries
        : [{ etablissement: edge.target, processus: 'Processus non renseigné' }];
      const sourceScoped = sourceMeta?.multiEtablissement ? sourceEntries : sourceEntries.slice(0, 1);
      const targetScoped = targetMeta?.multiEtablissement ? targetEntries : targetEntries.slice(0, 1);
      sourceScoped.forEach(sourceEntry => {
        const sourceId = `${edge.source}-${sourceEntry.etablissement}`;
        targetScoped.forEach(targetEntry => {
          const targetId = `${edge.target}-${targetEntry.etablissement}`;
          expandedLinks.push({
            ...edge,
            sourceId,
            targetId,
          });
        });
      });
    });

    return {
      nodes: layout,
      processBlocks,
      establishmentBlocks,
      links: expandedLinks,
      width,
      height,
      nodeSize,
    };
  }, [analysis, appMeta]);

  return (
    <>
      <Head>
        <title>Simulation d'incident - Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                Simulation d'incident
              </motion.h1>
              <p className="hero-subtitle">
                Simulez une indisponibilité et visualisez les impacts directs et indirects.
              </p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/">Vue Métier</Link>
            <Link href="/applications">Vue Applicative</Link>
            <Link href="/flux">Vue Flux</Link>
            <Link href="/network">Vue Réseau</Link>
            <Link href="/incident" className="active">Simulation d'incident</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <main className="page-shell incident-page">
        <section className="incident-panel">
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
            <h2>Résultats &amp; impacts</h2>
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
              Exporter en PDF
            </button>
          </div>
          {!analysis ? (
            <p className="muted">Lancez une analyse pour afficher les impacts.</p>
          ) : (
            <>
              <div className="impact-graph">
                <h3>Propagation</h3>
                {analysis.propagationEdges.length === 0 ? (
                  <p className="muted">Aucune propagation détectée.</p>
                ) : (
                  <>
                    <p className="muted">Survolez une flèche pour connaître la cause de la propagation.</p>
                    {propagationDiagram && (
                      <div className="propagation-diagram">
                        <div className="propagation-canvas">
                          <svg width={propagationDiagram.width} height={propagationDiagram.height}>
                            <defs>
                              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                                <marker key={key} id={`prop-arrow-${key}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                                  <path d="M0,0 L0,6 L9,3 z" fill={color} />
                                </marker>
                              ))}
                            </defs>
                            {propagationDiagram.establishmentBlocks.map(block => (
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
                            {propagationDiagram.processBlocks.map(block => (
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
                            {propagationDiagram.links.map(edge => {
                              const sourceNode = propagationDiagram.nodes.find(node => node.id === edge.sourceId);
                              const targetNode = propagationDiagram.nodes.find(node => node.id === edge.targetId);
                              if (!sourceNode || !targetNode) return null;
                              const startX = sourceNode.x + propagationDiagram.nodeSize.width;
                              const startY = sourceNode.y + propagationDiagram.nodeSize.height / 2;
                              const endX = targetNode.x;
                              const endY = targetNode.y + propagationDiagram.nodeSize.height / 2;
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
                                    markerEnd={`url(#prop-arrow-${edge.status})`}
                                    style={{ pointerEvents: 'none' }}
                                  />
                                </g>
                              );
                            })}
                            {propagationDiagram.nodes.map(node => (
                              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                                <rect
                                  width={propagationDiagram.nodeSize.width}
                                  height={propagationDiagram.nodeSize.height}
                                  rx="14"
                                  fill="#f8fafc"
                                  stroke={STATUS_COLORS[node.status] || '#dbe3f0'}
                                  strokeWidth="2"
                                />
                                <text
                                  x={propagationDiagram.nodeSize.width / 2}
                                  y={propagationDiagram.nodeSize.height / 2 + 4}
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

              <div className="impact-details">
                <h3>Impacts priorisés</h3>
                <div className="impact-cards">
                  {analysis.impactedApps.map(app => (
                    <details key={`${app.trigramme}-${app.etablissement}`} className="impact-card">
                      <summary>
                        <div>
                          <strong>{app.label}</strong>
                          <span className="muted"> • {app.etablissement}</span>
                        </div>
                        <div>
                          <span className={`status-pill status-${app.status}`}>{formatStatus(app.status)}</span>
                          <span className="crit-pill">{app.criticite}</span>
                        </div>
                      </summary>
                      <div className="impact-body">
                        <p>{describeStatus(app.status)}</p>
                        <div className="impact-meta">
                          <div>
                            <span className="label">Domaine / Processus</span>
                            <p>{app.domaine} • {app.processus}</p>
                          </div>
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
                            {actionsByStatus(app.status).map(action => (
                              <li key={action}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>
                  ))}
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
              </div>

              <div className="impact-summary">
                <div>
                  <h3>Services &amp; processus touchés</h3>
                  {analysis.impactedProcesses.length === 0 ? (
                    <p className="muted">Aucun processus identifié.</p>
                  ) : (
                    <ul className="impact-list">
                      {analysis.impactedProcesses.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3>Flux bloqués / dégradés</h3>
                  {analysis.blockedFlows.length === 0 ? (
                    <p className="muted">Aucun flux impacté.</p>
                  ) : (
                    <ul className="impact-list">
                      {analysis.blockedFlows.map(flow => (
                        <li key={`${flow.id}-${flow.source}-${flow.target}`}>
                          {flow.sourceLabel} → {flow.targetLabel} ({flow.interfaceType || 'Flux'})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
