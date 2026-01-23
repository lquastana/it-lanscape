import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const FIELD_CATALOG = [
  { key: 'id', label: 'Identifiant flux', hint: 'ID unique (optionnel)' },
  { key: 'sourceTrigramme', label: 'Source (trigramme)', hint: 'Trigramme application source' },
  { key: 'targetTrigramme', label: 'Cible (trigramme)', hint: 'Trigramme application cible' },
  { key: 'protocol', label: 'Protocole', hint: 'HL7v2, FHIR, DICOM, API, N/A...' },
  { key: 'port', label: 'Port', hint: '443, 104, 2575...' },
  { key: 'messageType', label: 'Type de message', hint: 'ADT, ORU, HPRIMXML...' },
  { key: 'interfaceType', label: 'Type d’interface', hint: 'Administrative, Medicale...' },
  { key: 'eaiName', label: 'Nom EAI', hint: 'EAI régional / local' },
  { key: 'description', label: 'Description', hint: 'Description du flux' },
];

const AUTO_GUESSES = {
  id: ['id', 'identifiant', 'flux_id'],
  sourceTrigramme: ['source', 'src', 'trigramme source', 'app source'],
  targetTrigramme: ['cible', 'target', 'dst', 'trigramme cible', 'app cible'],
  protocol: ['protocole', 'protocol'],
  port: ['port'],
  messageType: ['message', 'message type', 'typemessage'],
  interfaceType: ['interface', 'type interface'],
  eaiName: ['eai', 'broker', 'bus'],
  description: ['description', 'commentaire'],
};

const numberFields = new Set(['port']);

const findBestMatch = (cols, key) => {
  const probes = AUTO_GUESSES[key] || [];
  const lowerCols = cols.map(c => c.toLowerCase());
  for (const probe of probes) {
    const idx = lowerCols.findIndex(c => c.includes(probe));
    if (idx !== -1) return cols[idx];
  }
  return '';
};

const buildAutoMapping = (cols) => Object.fromEntries(FIELD_CATALOG.map(({ key }) => [key, findBestMatch(cols, key)]));

const normalizeTrigram = (value = '') => value.toString().trim().toUpperCase();

const normalizeText = (value = '') => value.toString().trim();

const ensureId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const getMatchKey = (flow) => flow.id || `${flow.sourceTrigramme || ''}|${flow.targetTrigramme || ''}|${flow.protocol || ''}|${flow.messageType || ''}`;

const mergeIncremental = (existing = [], incoming = []) => {
  const merged = new Map();
  existing.forEach(flow => {
    const key = getMatchKey(flow) || ensureId();
    merged.set(key, { ...flow });
  });
  incoming.forEach(flow => {
    const key = getMatchKey(flow) || ensureId();
    if (merged.has(key)) {
      const previous = merged.get(key);
      merged.set(key, { ...previous, ...flow, id: flow.id || previous.id });
    } else {
      merged.set(key, { ...flow });
    }
  });
  return Array.from(merged.values());
};

export default function FluxImport() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [existingData, setExistingData] = useState(null);
  const [excelRows, setExcelRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('replace');
  const [status, setStatus] = useState('');
  const [libReady, setLibReady] = useState(false);
  const [libError, setLibError] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(({ files }) => setFiles(files.filter(f => f.endsWith('.flux.json'))))
      .catch(() => setStatus('Impossible de charger la liste des fichiers flux'));
  }, []);

  useEffect(() => {
    if (!selectedFile) { setExistingData(null); return; }
    const base = selectedFile.replace(/\.json$/, '');
    fetch('/api/file/' + encodeURIComponent(base))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => setExistingData(data))
      .catch(() => setStatus('Lecture du fichier flux impossible'));
  }, [selectedFile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => setLibReady(true);
    script.onerror = () => setLibError('Librairie Excel non chargée (connexion requise)');
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!columns.length) return;
    setMapping(prev => Object.keys(prev).length ? prev : buildAutoMapping(columns));
  }, [columns]);

  const mappedRows = useMemo(() => {
    if (!excelRows.length) return [];
    return excelRows.map(raw => {
      const flow = {};
      FIELD_CATALOG.forEach(({ key }) => {
        const col = mapping[key];
        if (!col) return;
        const value = raw[col];
        if (value === undefined || value === null || value === '') return;
        flow[key] = numberFields.has(key) ? Number(value) : value;
      });
      if (flow.sourceTrigramme) flow.sourceTrigramme = normalizeTrigram(flow.sourceTrigramme);
      if (flow.targetTrigramme) flow.targetTrigramme = normalizeTrigram(flow.targetTrigramme);
      if (flow.protocol) flow.protocol = normalizeText(flow.protocol);
      if (flow.messageType) flow.messageType = normalizeText(flow.messageType);
      if (flow.interfaceType) flow.interfaceType = normalizeText(flow.interfaceType);
      if (flow.eaiName) flow.eaiName = normalizeText(flow.eaiName);
      if (flow.description) flow.description = normalizeText(flow.description);
      if (flow.port !== undefined && Number.isNaN(flow.port)) flow.port = null;
      return {
        flow,
      };
    });
  }, [excelRows, mapping]);

  const handleFile = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file || !libReady || !window.XLSX) return;
    setStatus('Lecture du fichier…');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
      setExcelRows(rows);
      setColumns(rows.length ? Object.keys(rows[0]) : []);
      setStatus(`${rows.length} lignes détectées dans ${firstSheet}`);
    } catch (err) {
      console.error(err);
      setStatus('Erreur lors de la lecture du fichier Excel');
    }
  };

  const updateMapping = (key, value) => setMapping(prev => ({ ...prev, [key]: value }));

  const handleImport = async () => {
    if (!selectedFile) { setStatus('Sélectionnez un établissement'); return; }
    if (!mappedRows.length) { setStatus('Aucune ligne à importer'); return; }
    setStatus('Préparation du jeu de données…');
    const base = selectedFile.replace(/\.json$/, '');
    const target = existingData || { etablissement: base, flux: [] };
    const newFlux = mappedRows.map(m => ({
      ...m.flow,
      id: m.flow.id || ensureId(),
      eaiName: m.flow.eaiName || null,
    }));
    const flux = mode === 'replace' ? newFlux : mergeIncremental(target.flux, newFlux);

    const payload = { ...target, flux };
    const res = await fetch('/api/file/' + encodeURIComponent(base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2),
    });
    setStatus(res.ok ? '✅ Import terminé' : '❌ Erreur lors de l\'enregistrement');
    if (res.ok) setExistingData(payload);
  };

  const previewHeaders = ['sourceTrigramme', 'targetTrigramme', 'protocol', 'port', 'messageType', 'interfaceType', 'eaiName']
    .concat(FIELD_CATALOG.filter(f => !['sourceTrigramme', 'targetTrigramme', 'protocol', 'port', 'messageType', 'interfaceType', 'eaiName'].includes(f.key)).map(f => f.key));

  return (
    <>
      <Head>
        <title>Import flux applicatifs</title>
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div style={{width:'250px'}}>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Import Excel flux</h1>
              <p className="hero-subtitle">Chargez un extrait, mappez les colonnes et importez les flux applicatifs.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/admin-metier">Gestion vue métier</Link>
            <Link href="/admin-infra">Gestion vue infrastructure</Link>
            <Link className="active" href="/admin-flux">Gestion flux</Link>
            <Link href="/admin-trigramme">Référentiel trigrammes</Link>
            <Link href="/admin-habilitations">Habilitations</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <main className="import-layout page-shell">
        <section className="card">
          <h2>1. Sélection du périmètre</h2>
          <label>Fichier flux cible
            <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
              <option value="">— Choisir un établissement —</option>
              {files.map(f => <option key={f} value={f}>{f.replace('.flux.json', '')}</option>)}
            </select>
          </label>
          <label>Fichier Excel (.xlsx)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={!libReady} />
          </label>
          {libError && <p className="warning">{libError}</p>}
          {status && <p className="status">{status}</p>}
        </section>

        <section className="card">
          <h2>2. Mapping des colonnes</h2>
          {!columns.length && <p className="hint">Chargez un fichier pour accéder au mapping.</p>}
          {columns.length > 0 && (
            <div className="mapping-grid">
              {FIELD_CATALOG.map(field => (
                <div key={field.key} className="map-line">
                  <div>
                    <strong>{field.label}</strong>
                    <span>{field.hint}</span>
                  </div>
                  <select value={mapping[field.key] || ''} onChange={e => updateMapping(field.key, e.target.value)}>
                    <option value="">— Ignorer —</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>3. Aperçu</h2>
          {!mappedRows.length && <p className="hint">Aucune donnée à prévisualiser.</p>}
          {!!mappedRows.length && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {previewHeaders.map(header => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map(({ flow }, idx) => (
                    <tr key={idx}>
                      {previewHeaders.map(header => (
                        <td key={header}>{flow[header] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>4. Import</h2>
          <div className="import-actions">
            <label className="inline">
              <input type="radio" name="mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              Remplacer les flux existants
            </label>
            <label className="inline">
              <input type="radio" name="mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              Fusion incrémentale
            </label>
            <button className="primary" onClick={handleImport} disabled={!selectedFile || !mappedRows.length}>Lancer l'import</button>
          </div>
        </section>
      </main>

      <style jsx>{`
        .import-layout {
          display: grid;
          gap: 16px;
          margin-bottom: 40px;
        }
        .card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 25px rgba(15, 38, 73, 0.08);
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        select, input {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d6dbe6;
        }
        .mapping-grid {
          display: grid;
          gap: 12px;
        }
        .map-line {
          display: grid;
          grid-template-columns: 1fr minmax(180px, 240px);
          gap: 16px;
          align-items: center;
        }
        .map-line span {
          display: block;
          color: #6b7280;
          font-size: 0.8rem;
        }
        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #eef2f7;
          margin-top: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        th, td {
          padding: 10px 12px;
          border-bottom: 1px solid #eef2f7;
          text-align: left;
        }
        th {
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          background: #f3f6fb;
        }
        .import-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .inline {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          margin-bottom: 0;
        }
        .hint {
          color: #6b7280;
        }
        .warning {
          color: #b45309;
        }
        .status {
          color: #1f2937;
        }
      `}</style>
    </>
  );
}
