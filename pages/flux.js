import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { INTERFACE_COLORS } from '../lib/constants';

const INTERFACE_TYPES = ['Administrative', 'Medicale', 'Facturation', 'Planification', 'Autre'];

const normalize = (value = '') => (value ?? '').toString().trim().toLowerCase();

export default function FluxPage() {
  const [data, setData] = useState([]);
  const [trigrammes, setTrigrammes] = useState({});
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [interfaceType, setInterfaceType] = useState('');
  const [protocol, setProtocol] = useState('');
  const [eaiName, setEaiName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState('liste');
  const [diagramTransform, setDiagramTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  useEffect(() => {
    setStatus('Chargement des flux...');
    fetch('/api/flux')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(({ etablissements }) => {
        setData(etablissements || []);
        setStatus('');
      })
      .catch(() => setStatus('Impossible de charger les flux'));
  }, []);

  useEffect(() => {
    fetch('/api/file/trigrammes')
      .then(r => (r.ok ? r.json() : {}))
      .then(setTrigrammes)
      .catch(() => setTrigrammes({}));
  }, []);

  const flattened = useMemo(() => (
    data.flatMap(etab => (etab.flux || []).map(flow => ({
      ...flow,
      etablissement: etab.nom,
    })))
  ), [data]);

  const etablissements = useMemo(() => (
    data.map(etab => etab.nom).filter(Boolean).sort((a, b) => a.localeCompare(b))
  ), [data]);

  const protocols = useMemo(() => {
    const set = new Set();
    flattened.forEach(flow => {
      if (flow.protocol) set.add(flow.protocol);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flattened]);

  const sources = useMemo(() => {
    const set = new Set();
    flattened.forEach(flow => {
      if (flow.sourceTrigramme) set.add(flow.sourceTrigramme);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flattened]);

  const targets = useMemo(() => {
    const set = new Set();
    flattened.forEach(flow => {
      if (flow.targetTrigramme) set.add(flow.targetTrigramme);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flattened]);

  const eaiNames = useMemo(() => {
    const set = new Set();
    flattened.forEach(flow => {
      if (flow.eaiName) set.add(flow.eaiName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flattened]);

  const sourceOptions = useMemo(() => {
    const items = sources.map(tri => ({
      tri,
      label: trigrammes[tri] || tri,
    }));
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [sources, trigrammes]);

  const targetOptions = useMemo(() => {
    const items = targets.map(tri => ({
      tri,
      label: trigrammes[tri] || tri,
    }));
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [targets, trigrammes]);

  const resolveTrigram = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const exact = sources.find(tri => tri === trimmed) || targets.find(tri => tri === trimmed);
    if (exact) return exact;
    const match = Object.entries(trigrammes).find(([, label]) => label?.toLowerCase() === trimmed.toLowerCase());
    if (match) return match[0];
    return trimmed;
  };

  const formatLabel = (tri) => {
    return trigrammes[tri] || tri;
  };

  const resetFilters = () => {
    setSearch('');
    setEtablissement('');
    setSource('');
    setTarget('');
    setInterfaceType('');
    setProtocol('');
    setEaiName('');
  };

  const getInterfaceStyle = (type) => ({
    background: INTERFACE_COLORS[type] || '#e5e7eb',
    color: type === 'Administrative' ? '#1f2937' : '#fff',
  });

  const filtered = useMemo(() => {
    const term = normalize(search);
    const sourceTri = resolveTrigram(source);
    const targetTri = resolveTrigram(target);
    return flattened.filter(flow => {
      if (etablissement && flow.etablissement !== etablissement) return false;
      if (sourceTri && flow.sourceTrigramme !== sourceTri) return false;
      if (targetTri && flow.targetTrigramme !== targetTri) return false;
      if (interfaceType && flow.interfaceType !== interfaceType) return false;
      if (protocol && flow.protocol !== protocol) return false;
      if (eaiName && flow.eaiName !== eaiName) return false;
      if (!term) return true;
      const haystack = [
        formatLabel(flow.sourceTrigramme),
        formatLabel(flow.targetTrigramme),
        flow.protocol,
        flow.messageType,
        flow.eaiName,
        flow.description,
        flow.etablissement,
      ].map(normalize).join(' ');
      return haystack.includes(term);
    });
  }, [flattened, etablissement, source, target, interfaceType, protocol, eaiName, search, trigrammes]);

  const diagramData = useMemo(() => {
    const nodesMap = new Map();
    const links = filtered.map(flow => {
      const source = flow.sourceTrigramme;
      const target = flow.targetTrigramme;
      nodesMap.set(source, { id: source, label: formatLabel(source) });
      nodesMap.set(target, { id: target, label: formatLabel(target) });
      return {
        id: flow.id,
        source,
        target,
        type: flow.interfaceType,
        label: flow.messageType || flow.protocol || '',
        protocol: flow.protocol,
        port: flow.port,
        eaiName: flow.eaiName,
        etablissement: flow.etablissement,
      };
    });
    const nodes = Array.from(nodesMap.values());

    const roles = nodes.map(node => {
      const hasSource = links.some(link => link.source === node.id);
      const hasTarget = links.some(link => link.target === node.id);
      return { ...node, role: hasSource && hasTarget ? 'both' : hasSource ? 'source' : 'target' };
    });

    const columns = {
      source: roles.filter(node => node.role === 'source'),
      both: roles.filter(node => node.role === 'both'),
      target: roles.filter(node => node.role === 'target'),
    };

    const columnOrder = ['source', 'both', 'target'];
    const columnWidth = 360;
    const rowGap = 120;
    const nodeSize = { width: 220, height: 64 };

    const layout = {};
    columnOrder.forEach((key, colIdx) => {
      const column = columns[key];
      const startY = 120;
      column.forEach((node, rowIdx) => {
        layout[node.id] = {
          ...node,
          x: colIdx * columnWidth,
          y: startY + rowIdx * rowGap,
        };
      });
    });

    const width = columnOrder.length * columnWidth + nodeSize.width;
    const height = Math.max(
      ...Object.values(layout).map(node => node.y + nodeSize.height),
      400,
    );

    return { nodes: Object.values(layout), links, width, height, nodeSize };
  }, [filtered, formatLabel]);

  const resetDiagramView = () => {
    setDiagramTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setDiagramTransform(prev => {
      const nextScale = Math.min(2.5, Math.max(0.4, prev.scale + delta));
      return { ...prev, scale: nextScale };
    });
  };

  const startPan = (event) => {
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX - diagramTransform.x,
      y: event.clientY - diagramTransform.y,
    };
  };

  const onPan = (event) => {
    if (!isPanning) return;
    setDiagramTransform(prev => ({
      ...prev,
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    }));
  };

  const endPan = () => setIsPanning(false);

  return (
    <>
      <Head>
        <title>Flux applicatifs - Cartographie des Hôpitaux Publics de Corse</title>
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
                Flux applicatifs
              </motion.h1>
              <p className="hero-subtitle">Analysez les échanges entre applications, protocoles et EAI.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/">Vue Métier</Link>
            <Link href="/applications">Vue Applicative</Link>
            <Link href="/flux" className="active">Vue Flux</Link>
            <Link href="/network">Vue Réseau</Link>
            <button onClick={handleLogout} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline' }}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <section className="legend-wrapper page-shell">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
        <div className="search-row">
          <label className="wide">
            Recherche
            <input
              type="search"
              placeholder="Rechercher un flux..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <div className="search-actions">
            <div className="view-toggle" role="group" aria-label="Modes d'affichage">
              <button
                type="button"
                className={viewMode === 'liste' ? 'active' : ''}
                onClick={() => setViewMode('liste')}
              >
                Vue Liste
              </button>
              <button
                type="button"
                className={viewMode === 'diagramme' ? 'active' : ''}
                onClick={() => setViewMode('diagramme')}
              >
                Vue Diagramme
              </button>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => setShowAdvanced(v => !v)}
            >
              Filtres avancés {showAdvanced ? '▲' : '▼'}
            </button>
            <button type="button" className="primary" onClick={resetFilters}>Réinitialiser</button>
          </div>
        </div>
        {showAdvanced && (
          <div className="filters-grid">
            <label>
              Établissement
              <select value={etablissement} onChange={e => setEtablissement(e.target.value)}>
                <option value="">Tous</option>
                {etablissements.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Source
              <input
                list="sources-list"
                placeholder="Rechercher une source..."
                value={source}
                onChange={e => setSource(e.target.value)}
              />
              <datalist id="sources-list">
                {sourceOptions.map(item => (
                  <option key={item.tri} value={item.label} />
                ))}
              </datalist>
            </label>
            <label>
              Cible
              <input
                list="targets-list"
                placeholder="Rechercher une cible..."
                value={target}
                onChange={e => setTarget(e.target.value)}
              />
              <datalist id="targets-list">
                {targetOptions.map(item => (
                  <option key={item.tri} value={item.label} />
                ))}
              </datalist>
            </label>
            <label>
              Type d'interface
              <select value={interfaceType} onChange={e => setInterfaceType(e.target.value)}>
                <option value="">Tous</option>
                {INTERFACE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Protocole
              <select value={protocol} onChange={e => setProtocol(e.target.value)}>
                <option value="">Tous</option>
                {protocols.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              EAI
              <select value={eaiName} onChange={e => setEaiName(e.target.value)}>
                <option value="">Tous</option>
                {eaiNames.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {status && <p className="status">{status}</p>}
      </section>

      <main className="page-shell">
        {filtered.length === 0 ? (
          <p className="hint">Aucun flux à afficher.</p>
        ) : viewMode === 'liste' ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Source</th>
                  <th>Cible</th>
                  <th>Type</th>
                  <th>Protocole</th>
                  <th>Port</th>
                  <th>Message</th>
                  <th>EAI</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(flow => (
                  <tr key={flow.id}>
                    <td>{flow.etablissement}</td>
                    <td>{formatLabel(flow.sourceTrigramme)}</td>
                    <td>{formatLabel(flow.targetTrigramme)}</td>
                    <td>
                      <span className="pill" style={getInterfaceStyle(flow.interfaceType)}>
                        {flow.interfaceType}
                      </span>
                    </td>
                    <td>{flow.protocol}</td>
                    <td>{flow.port ?? '-'}</td>
                    <td>{flow.messageType || '-'}</td>
                    <td>
                      {flow.eaiName ? (
                        <span className="eai-tag">{flow.eaiName}</span>
                      ) : (
                        <span className="muted">Direct</span>
                      )}
                    </td>
                    <td className="desc">{flow.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="diagram-wrapper">
            <div className="diagram-toolbar">
              <span className="muted">Zoom: {(diagramTransform.scale * 100).toFixed(0)}%</span>
              <button type="button" className="secondary" onClick={resetDiagramView}>Réinitialiser la vue</button>
            </div>
            <div
              className="diagram-canvas"
              onWheel={handleWheel}
              onMouseDown={startPan}
              onMouseMove={onPan}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              role="presentation"
            >
              <svg
                width={diagramData.width}
                height={diagramData.height}
                style={{
                  transform: `translate(${diagramTransform.x}px, ${diagramTransform.y}px) scale(${diagramTransform.scale})`,
                  transformOrigin: '0 0',
                }}
              >
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                  </marker>
                </defs>
                {diagramData.links.map((link) => {
                  const sourceNode = diagramData.nodes.find(node => node.id === link.source);
                  const targetNode = diagramData.nodes.find(node => node.id === link.target);
                  if (!sourceNode || !targetNode) return null;
                  const startX = sourceNode.x + diagramData.nodeSize.width;
                  const startY = sourceNode.y + diagramData.nodeSize.height / 2;
                  const endX = targetNode.x;
                  const endY = targetNode.y + diagramData.nodeSize.height / 2;
                  const stroke = INTERFACE_COLORS[link.type] || '#64748b';
                  const midX = (startX + endX) / 2;
                  return (
                    <g key={link.id}>
                      <title>{`Source: ${formatLabel(link.source)}\nCible: ${formatLabel(link.target)}\nType: ${link.type}\nProtocole: ${link.protocol || '-'}\nMessage: ${link.label || '-'}\nPort: ${link.port ?? '-'}\nEAI: ${link.eaiName || 'Direct'}\nÉtablissement: ${link.etablissement}`}</title>
                      <path
                        d={`M${startX},${startY} C${midX},${startY} ${midX},${endY} ${endX},${endY}`}
                        fill="none"
                        stroke={stroke}
                        strokeWidth="2"
                        markerEnd="url(#arrow)"
                      />
                    </g>
                  );
                })}
                {diagramData.nodes.map(node => (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <rect
                      width={diagramData.nodeSize.width}
                      height={diagramData.nodeSize.height}
                      rx="14"
                      fill="#f8fafc"
                      stroke="#dbe3f0"
                    />
                    <text
                      x={diagramData.nodeSize.width / 2}
                      y={diagramData.nodeSize.height / 2 + 4}
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
      </main>

      <style jsx>{`
        .search-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          margin-bottom: 12px;
        }
        .search-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .view-toggle {
          display: inline-flex;
          border: 1px solid #d0d7e4;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .view-toggle button {
          border: none;
          background: transparent;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 600;
          color: #1f2937;
        }
        .view-toggle button.active {
          background: #002b6f;
          color: #fff;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          align-items: end;
        }
        .wide {
          flex: 1;
          min-width: 280px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.9rem;
        }
        input, select {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d6dbe6;
          background: #fff;
        }
        .primary {
          background: #002b6f;
          color: #fff;
          border: none;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
        }
        .secondary {
          background: #fff;
          color: #002b6f;
          border: 1px solid #002b6f;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
        }
        .table-wrapper {
          margin-top: 20px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(15, 38, 73, 0.08);
          background: #fff;
        }
        .diagram-wrapper {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .diagram-toolbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
        }
        .diagram-canvas {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 25px rgba(15, 38, 73, 0.08);
          overflow: hidden;
          min-height: 420px;
          cursor: grab;
          position: relative;
        }
        .diagram-canvas:active {
          cursor: grabbing;
        }
        svg {
          display: block;
        }
        .node {
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.92rem;
        }
        thead {
          background: #f3f6fb;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
        }
        th, td {
          padding: 12px 14px;
          border-bottom: 1px solid #eef2f7;
          text-align: left;
        }
        tr:hover {
          background: #f9fbff;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .eai-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #e7f7ee;
          color: #137333;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .muted {
          color: #6b7280;
        }
        .desc {
          max-width: 280px;
        }
        .status {
          margin-top: 8px;
          color: #1f2937;
        }
        .hint {
          margin-top: 20px;
          color: #6b7280;
        }
      `}</style>
    </>
  );
}
