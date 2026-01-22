import { useEffect, useMemo, useState } from 'react';
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
          <div className="diagram-grid">
            {filtered.map(flow => (
              <div className="diagram-card" key={flow.id}>
                <div className="diagram-header">
                  <span className="diagram-etab">{flow.etablissement}</span>
                  <span className="pill" style={getInterfaceStyle(flow.interfaceType)}>
                    {flow.interfaceType}
                  </span>
                </div>
                <div className="diagram-flow">
                  <div className="node">
                    <span className="node-label">{formatLabel(flow.sourceTrigramme)}</span>
                  </div>
                  <div className="arrow">→</div>
                  <div className="node">
                    <span className="node-label">{formatLabel(flow.targetTrigramme)}</span>
                  </div>
                </div>
                <div className="diagram-meta">
                  <span>Protocole: {flow.protocol || '-'}</span>
                  <span>Message: {flow.messageType || '-'}</span>
                  <span>Port: {flow.port ?? '-'}</span>
                  <span>EAI: {flow.eaiName || 'Direct'}</span>
                </div>
                {flow.description && <p className="diagram-desc">{flow.description}</p>}
              </div>
            ))}
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
        .diagram-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .diagram-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 25px rgba(15, 38, 73, 0.08);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .diagram-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .diagram-etab {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9rem;
        }
        .diagram-flow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
        }
        .node {
          padding: 10px 12px;
          border-radius: 12px;
          background: #f3f6fb;
          text-align: center;
          font-weight: 600;
          color: #1f2937;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .node-label {
          font-size: 0.9rem;
        }
        .arrow {
          font-size: 1.4rem;
          color: #002b6f;
        }
        .diagram-meta {
          display: grid;
          gap: 4px;
          font-size: 0.82rem;
          color: #4b5563;
        }
        .diagram-desc {
          margin: 0;
          font-size: 0.85rem;
          color: #374151;
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
