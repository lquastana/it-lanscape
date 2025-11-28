import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const FIELD_CATALOG = [
  { key: 'VM', label: 'VM (identifiant unique)', hint: 'Nom ou identifiant machine' },
  { key: 'PrimaryIPAddress', label: 'Adresse IP', hint: 'PrimaryIPAddress / IP' },
  { key: 'RoleServeur', label: 'Rôle serveur', hint: 'Description fonctionnelle' },
  { key: 'CPUs', label: 'CPU', hint: 'Nombre de vCPU' },
  { key: 'MemoryMiB', label: 'Mémoire (MiB)', hint: 'RAM en MiB' },
  { key: 'TotalDiskCapacityMiB', label: 'Disque total (MiB)', hint: 'Capacité disque' },
  { key: 'OS', label: 'Système', hint: 'OS' },
  { key: 'Antivirus', label: 'Antivirus', hint: 'Solution déployée' },
  { key: 'Backup', label: 'Sauvegarde', hint: 'Politique de backup' },
  { key: 'Contact', label: 'Contact', hint: 'Exploitant / email' },
  { key: 'Editeur', label: 'Éditeur', hint: 'Fournisseur applicatif' },
  { key: 'trigramme', label: 'Trigramme applicatif', hint: 'Colonne permettant le rattachement' },
];

const AUTO_GUESSES = {
  VM: ['vm', 'hostname', 'machine'],
  PrimaryIPAddress: ['ip', 'adresse'],
  RoleServeur: ['role', 'service', 'fonction'],
  CPUs: ['cpu', 'vcpus', 'coeur'],
  MemoryMiB: ['memoire', 'ram'],
  TotalDiskCapacityMiB: ['disque', 'storage', 'disk'],
  OS: ['os', 'windows', 'linux'],
  Antivirus: ['antivirus', 'av'],
  Backup: ['backup', 'sauvegarde'],
  Contact: ['contact', 'email'],
  Editeur: ['editeur', 'publisher', 'vendor'],
  trigramme: ['trigramme', 'appli', 'application'],
};

const numberFields = new Set(['CPUs', 'MemoryMiB', 'TotalDiskCapacityMiB']);

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

const ensureId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const getMatchKey = (server) => server.PrimaryIPAddress || server.VM || null;

const mergeIncremental = (existing = [], incoming = []) => {
  const merged = new Map();
  existing.forEach(srv => {
    const key = getMatchKey(srv) || ensureId();
    merged.set(key, { ...srv });
  });
  incoming.forEach(srv => {
    const key = getMatchKey(srv) || ensureId();
    if (merged.has(key)) {
      const previous = merged.get(key);
      merged.set(key, { ...previous, ...srv, VM: srv.VM ?? previous.VM });
    } else {
      merged.set(key, { ...srv });
    }
  });
  return Array.from(merged.values());
};

export default function InfrastructureImport() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [existingData, setExistingData] = useState(null);
  const [trigrammes, setTrigrammes] = useState({});
  const [excelRows, setExcelRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('replace');
  const [status, setStatus] = useState('');
  const [libReady, setLibReady] = useState(false);
  const [libError, setLibError] = useState('');

  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(({ files }) => setFiles(files.filter(f => f.endsWith('.infra.json'))))
      .catch(() => setStatus('Impossible de charger la liste des fichiers infra'));
  }, []);

  useEffect(() => {
    fetch('/api/file/trigrammes')
      .then(r => (r.ok ? r.json() : {}))
      .then(setTrigrammes)
      .catch(() => setTrigrammes({}));
  }, []);

  useEffect(() => {
    if (!selectedFile) { setExistingData(null); return; }
    const base = selectedFile.replace(/\.json$/, '');
    fetch('/api/file/' + encodeURIComponent(base))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => setExistingData(data))
      .catch(() => setStatus('Lecture du fichier infra impossible'));
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
      const srv = {};
      FIELD_CATALOG.forEach(({ key }) => {
        const col = mapping[key];
        if (!col) return;
        const value = raw[col];
        if (value === undefined || value === null || value === '') return;
        srv[key] = numberFields.has(key) ? Number(value) : value;
      });
      if (srv.trigramme) srv.trigramme = normalizeTrigram(srv.trigramme);
      return {
        srv,
        application: srv.trigramme ? trigrammes[srv.trigramme] : '',
      };
    });
  }, [excelRows, mapping, trigrammes]);

  const unknownTrigramRows = useMemo(
    () => mappedRows.filter(({ srv }) => srv.trigramme && !trigrammes[srv.trigramme]),
    [mappedRows, trigrammes],
  );

  const incoherences = useMemo(() => {
    let unknownTrigram = 0;
    let missingKey = 0;
    mappedRows.forEach(({ srv }) => {
      if (srv.trigramme && !trigrammes[srv.trigramme]) unknownTrigram += 1;
      if (!srv.VM && !srv.PrimaryIPAddress) missingKey += 1;
    });
    return { unknownTrigram, missingKey };
  }, [mappedRows, trigrammes]);

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
    const target = existingData || { etablissement: base, serveurs: [] };
    const newServeurs = mappedRows.map(m => m.srv);
    const serveurs = mode === 'replace' ? newServeurs : mergeIncremental(target.serveurs, newServeurs);

    const payload = { ...target, serveurs };
    const res = await fetch('/api/file/' + encodeURIComponent(base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2),
    });
    setStatus(res.ok ? '✅ Import terminé' : '❌ Erreur lors de l\'enregistrement');
    if (res.ok) setExistingData(payload);
  };

  const previewHeaders = ['VM', 'PrimaryIPAddress', 'RoleServeur', 'trigramme', 'Application']
    .concat(FIELD_CATALOG.filter(f => !['VM', 'PrimaryIPAddress', 'RoleServeur', 'trigramme'].includes(f.key)).map(f => f.key));

  return (
    <>
      <Head>
        <title>Import infrastructure</title>
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Import Excel infrastructure</h1>
              <p className="hero-subtitle">Chargez un extrait, mappez les colonnes et choisissez le mode d'intégration.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/">Vue Métier</Link>
            <Link href="/applications">Vue Applicative</Link>
            <Link href="/network">Vue Réseau</Link>
            <Link href="/admin">Admin</Link>
            <Link className="active" href="/infrastructure-import">Import Infra</Link>
          </nav>
        </div>
      </header>

      <main className="import-layout page-shell">
        <section className="card">
          <h2>1. Sélection du périmètre</h2>
          <label>Fichier infrastructure cible
            <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
              <option value="">— Choisir un établissement —</option>
              {files.map(f => <option key={f} value={f}>{f.replace('.infra.json', '')}</option>)}
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
                    <div className="hint">{field.hint}</div>
                  </div>
                  <select value={mapping[field.key] || ''} onChange={e => updateMapping(field.key, e.target.value)}>
                    <option value="">Ignorer</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>3. Association applicative</h2>
          <p>La colonne « Trigramme applicatif » permet de lier chaque ligne à une application. Les correspondances sont affichées dans la prévisualisation.</p>
          <div className="chips">
            <span className="chip">{Object.keys(trigrammes).length} trigrammes connus</span>
            <span className={incoherences.unknownTrigram ? 'chip warn' : 'chip ok'}>
              {incoherences.unknownTrigram ? `${incoherences.unknownTrigram} trigramme(s) non reconnus` : 'Tous les trigrammes sont connus'}
            </span>
          </div>
          {unknownTrigramRows.length > 0 && (
            <div className="unknowns">
              <p>Trigrammes inconnus détectés :</p>
              <ul>
                {unknownTrigramRows.map(({ srv }, idx) => (
                  <li key={`${srv.trigramme}-${idx}`}>
                    <strong>{srv.trigramme}</strong> — {srv.VM || 'VM manquante'} / {srv.PrimaryIPAddress || 'IP manquante'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card">
          <h2>4. Prévisualisation</h2>
          {!mappedRows.length && <p className="hint">Aucune ligne détectée.</p>}
          {mappedRows.length > 0 && (
            <div className="preview">
              <div className="chips">
                <span className="chip">{mappedRows.length} ligne(s) prêtes</span>
                <span className={incoherences.missingKey ? 'chip warn' : 'chip ok'}>
                  {incoherences.missingKey ? `${incoherences.missingKey} sans VM ou IP` : 'Identifiant OK' }
                </span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {previewHeaders.map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.map(({ srv, application }, idx) => (
                      <tr key={idx}>
                        {previewHeaders.map(h => {
                          const value = h === 'Application' ? application : srv[h] ?? '';
                          const cls = (h === 'trigramme' && srv.trigramme && !application) ? 'warn' : '';
                          return <td key={h} className={cls}>{value || '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h2>5. Mode d'intégration</h2>
          <div className="mode">
            <label><input type="radio" name="mode" value="replace" checked={mode==='replace'} onChange={e => setMode(e.target.value)} /> Annule et remplace</label>
            <p>Le fichier cible est entièrement remplacé par le contenu de l'extraction.</p>
            <label><input type="radio" name="mode" value="incremental" checked={mode==='incremental'} onChange={e => setMode(e.target.value)} /> Mise à jour incrémentale</label>
            <p>Les lignes sont fusionnées sur l'IP ou la VM. En cas de correspondance, les champs sont mis à jour et la valeur du champ VM est écrasée si fournie par l'Excel.</p>
          </div>
          <button className="primary" onClick={handleImport} disabled={!selectedFile || !mappedRows.length}>Lancer l'import</button>
        </section>
      </main>

      <style jsx>{`
        .import-layout {
          display: grid;
          gap: 20px;
          padding: 26px 0 60px;
          grid-template-columns: 1fr;
          margin-top: -34px;
          position: relative;
          z-index: 1;
        }
        .card {
          background: var(--color-white);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
          box-shadow: var(--shadow-card);
        }
        .card h2 { margin-top: 0; }
        label { display:block; margin-bottom:12px; font-weight:600; color: var(--color-primary); }
        select, input[type=file] {
          width: 100%;
          padding: 10px;
          margin-top: 6px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
        }
        .mapping-grid { display:flex; flex-direction:column; gap:12px; }
        .map-line { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .map-line select { max-width:260px; }
        .hint { color:#6b7280; font-weight:400; margin-top:2px; }
        .status { font-weight:600; color: var(--color-primary); }
        .warning { color:#b91c1c; }
        .chips { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0; }
        .chip { background:#eef2ff; color:#4338ca; padding:4px 10px; border-radius:999px; font-weight:600; font-size:.9rem; }
        .chip.ok { background:#ecfdf3; color:#15803d; }
        .chip.warn { background:#fef2f2; color:#b91c1c; }
        .unknowns { border:1px dashed #fca5a5; padding:10px 12px; border-radius:8px; background:#fff7ed; }
        .unknowns ul { margin:8px 0 0 18px; color:#b91c1c; }
        .preview { display:flex; flex-direction:column; gap:10px; }
        .table-wrapper { overflow:auto; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:6px 8px; border-bottom:1px solid #e5e7eb; text-align:left; }
        td.warn { background:#fff1f2; }
        .mode p { margin:4px 0 12px 26px; color:#4b5563; }
        .primary {
          background: var(--color-accent);
          color: var(--color-white);
          border: none;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 6px 14px rgba(40, 166, 191, 0.25);
        }
        .primary:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>
    </>
  );
}
