import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import AdminNav from '../components/AdminNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

const EMPTY_PROCESS = { nom: '', description: '', applications: [] };
const IFACE_KEYS = ['Planification', 'Facturation', 'Administrative', 'Medicale', 'Autre'];
const EMPTY_APP = {
  nom: '', description: '', editeur: '', referent: '', hebergement: '',
  criticite: 'Standard', multiEtablissement: false, lienPRTG: null,
  interfaces: Object.fromEntries(IFACE_KEYS.map(k => [k, false])),
  trigramme: '',
};

export default function AdminMetier() {
  const [files, setFiles]           = useState([]);
  const [fileLabels, setFileLabels] = useState({});
  const [currentFile, setCurrent]   = useState('');
  const [data, setData]             = useState(null);
  const [status, setStatus]         = useState('');
  const [edit, setEdit]             = useState(null);
  const dlgRef = useRef(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(async ({ files }) => {
        const filtered = files.filter(f => !f.endsWith('.infra.json') && !f.endsWith('.network.json') && !f.endsWith('.flux.json') && f !== 'trigrammes.json');
        setFiles(filtered);
        const labels = {};
        await Promise.all(filtered.map(async f => {
          try {
            const base = f.replace(/\.json$/, '');
            const res = await fetch('/api/file/' + encodeURIComponent(base));
            if (!res.ok) return;
            const js = await res.json();
            labels[f] = js.etablissement || js.etablissements?.[0]?.nom || '';
          } catch { /* keep filename as fallback */ }
        }));
        setFileLabels(labels);
      })
      .catch(() => setStatus('Erreur de chargement'));
  }, []);

  useEffect(() => {
    if (!currentFile) { setData(null); return; }
    setStatus('Chargement…');
    fetch('/api/file/' + encodeURIComponent(currentFile.replace(/\.json$/, '')))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(js => { setData(js); setStatus(''); })
      .catch(() => setStatus('Erreur de lecture'));
  }, [currentFile]);

  const handleSave = async () => {
    if (!currentFile || !data) return;
    setStatus('Enregistrement…');
    const res = await fetch('/api/file/' + encodeURIComponent(currentFile.replace(/\.json$/, '')), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    setStatus(res.ok ? '✅ Enregistré avec succès' : '❌ Erreur d\'enregistrement');
  };

  const patchAtPath = (path, mutator) => {
    setData(prev => {
      const clone = structuredClone(prev);
      let ptr = clone;
      for (let i = 0; i < path.length - 1; i++) ptr = ptr[path[i]];
      ptr[path[path.length - 1]] = mutator(ptr[path[path.length - 1]]);
      return clone;
    });
  };

  const editProcess = (eIdx, dIdx, pIdx) => {
    const proc = pIdx != null ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx] : EMPTY_PROCESS;
    setEdit({ type: 'process', path: ['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx ?? '__new'], obj: proc, isNew: pIdx == null });
    dlgRef.current.showModal();
  };

  const editApp = (eIdx, dIdx, pIdx, aIdx) => {
    const app = aIdx != null ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx].applications[aIdx] : EMPTY_APP;
    setEdit({ type: 'app', path: ['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx, 'applications', aIdx ?? '__new'], obj: app, isNew: aIdx == null });
    dlgRef.current.showModal();
  };

  const delAtPath = path => {
    patchAtPath(path.slice(0, -1), arr => { const copy = [...arr]; copy.splice(path[path.length - 1], 1); return copy; });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (edit.type === 'process') {
      const newProc = { nom: fd.get('nom'), description: fd.get('description'), applications: edit.obj.applications ?? [] };
      if (edit.isNew) patchAtPath(edit.path.slice(0, -1), arr => [...arr, newProc]);
      else patchAtPath(edit.path, () => newProc);
    } else {
      const interfacesObj = Object.fromEntries(IFACE_KEYS.map(k => [k, fd.get('iface_' + k) === 'on']));
      const newApp = {
        nom: fd.get('nom'), description: fd.get('description'),
        editeur: fd.get('editeur'), referent: fd.get('referent'),
        hebergement: fd.get('hebergement'), criticite: fd.get('criticite'),
        multiEtablissement: fd.get('multi') === 'on', lienPRTG: edit.obj.lienPRTG,
        interfaces: interfacesObj,
        trigramme: (fd.get('trigramme') || '').toUpperCase(),
      };
      if (edit.isNew) patchAtPath(edit.path.slice(0, -1), arr => [...arr, newApp]);
      else patchAtPath(edit.path, () => newApp);
    }
    dlgRef.current.close(); setEdit(null);
  };

  const statusClass = status.startsWith('✅') ? 'ok' : status.startsWith('❌') ? 'error' : 'info';

  return (
    <>
      <Head><title>Administration métier — {APP_TITLE}</title></Head>

      <header className="hero business-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME} — Administration</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                Vue métier
              </motion.h1>
              <p className="hero-subtitle">Gestion des établissements, domaines, processus et applications.</p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      <main className="page-shell admin-page">

        {/* Toolbar */}
        <div className="admin-toolbar">
          <select
            className="admin-select"
            style={{ flex: 1, minWidth: 220 }}
            value={currentFile}
            onChange={e => setCurrent(e.target.value)}
          >
            <option value="">— Sélectionner un établissement —</option>
            {files.map(f => <option key={f} value={f}>{fileLabels[f] || f}</option>)}
          </select>
          <button className="admin-btn primary" disabled={!data} onClick={handleSave}>
            Enregistrer
          </button>
          {status && <span className={`admin-status ${statusClass}`}>{status}</span>}
        </div>

        {/* Contenu */}
        <div className="admin-card">
          {!data && <p style={{ opacity: 0.5, margin: '16px 0' }}>Choisissez un établissement à éditer…</p>}
          {data && (
            <div className="metier-tree">
              {data.etablissements?.map((etab, eIdx) => (
                <details key={eIdx} className="tree-node lvl1" open>
                  <summary className="tree-summary">
                    <span className="tree-label">{etab.nom}</span>
                    <span className="admin-badge neutral">{etab.domaines?.length ?? 0} domaines</span>
                  </summary>
                  <div className="tree-children">
                    {etab.domaines.map((dom, dIdx) => (
                      <details key={dIdx} className="tree-node lvl2">
                        <summary className="tree-summary">
                          <span className="tree-label">{dom.nom}</span>
                          <span className="tree-actions">
                            <button
                              className="admin-btn ghost sm"
                              onClick={e => { e.stopPropagation(); editProcess(eIdx, dIdx, null); }}
                              aria-label={`Ajouter un processus dans le domaine ${dom.nom}`}
                            >
                              + Processus
                            </button>
                          </span>
                        </summary>
                        <div className="tree-children">
                          {dom.processus.map((proc, pIdx) => (
                            <details key={pIdx} className="tree-node lvl3">
                              <summary className="tree-summary">
                                <span className="tree-label">
                                  {proc.nom}
                                  <span className="admin-badge accent" style={{ marginLeft: 8 }}>{proc.applications.length}</span>
                                </span>
                                <span className="tree-actions">
                                  <button
                                    className="admin-btn ghost sm"
                                    onClick={e => { e.stopPropagation(); editApp(eIdx, dIdx, pIdx, null); }}
                                    aria-label={`Ajouter une application au processus ${proc.nom}`}
                                  >+ App</button>
                                  <button
                                    className="admin-btn ghost sm"
                                    onClick={e => { e.stopPropagation(); editProcess(eIdx, dIdx, pIdx); }}
                                    aria-label={`Éditer le processus ${proc.nom}`}
                                  >Éditer</button>
                                  <button
                                    className="admin-btn danger sm"
                                    onClick={e => { e.stopPropagation(); if (confirm('Supprimer ce processus ?')) delAtPath(['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx]); }}
                                    aria-label={`Supprimer le processus ${proc.nom}`}
                                  >Supprimer</button>
                                </span>
                              </summary>
                              <ul className="app-list">
                                {proc.applications.map((app, aIdx) => (
                                  <li key={aIdx} className="app-item">
                                    <span className="app-name">
                                      {app.trigramme && <code className="admin-code">{app.trigramme}</code>}
                                      {app.nom}
                                      {app.criticite === 'Critique' && <span className="admin-badge danger" style={{ marginLeft: 6 }}>Critique</span>}
                                    </span>
                                    <span className="tree-actions">
                                      <button
                                        className="admin-btn ghost sm"
                                        onClick={() => editApp(eIdx, dIdx, pIdx, aIdx)}
                                        aria-label={`Éditer l'application ${app.nom}`}
                                      >Éditer</button>
                                      <button
                                        className="admin-btn danger sm"
                                        onClick={() => { if (confirm('Supprimer cette application ?')) delAtPath(['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx, 'applications', aIdx]); }}
                                        aria-label={`Supprimer l'application ${app.nom}`}
                                      >Supprimer</button>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dialog */}
      <dialog ref={dlgRef} className="admin-dialog" onCancel={() => setEdit(null)} aria-labelledby="admin-metier-dialog-title">
        {edit && (
          <form onSubmit={handleSubmit} key={edit.path?.join('/')}>
            <div className="admin-dialog-head">
              <span className="business-section-kicker">{edit.isNew ? 'Nouveau' : 'Modifier'}</span>
              <h2 id="admin-metier-dialog-title">{edit.type === 'process' ? 'Processus' : 'Application'}</h2>
            </div>
            <div className="admin-dialog-body admin-form-stack">
              <label className="admin-label">
                Nom
                <input className="admin-input" name="nom" defaultValue={edit.obj.nom} required />
              </label>
              <label className="admin-label">
                Description
                <input className="admin-input" name="description" defaultValue={edit.obj.description} />
              </label>

              {edit.type === 'app' && (<>
                <div className="admin-form-row">
                  <label className="admin-label">Éditeur<input className="admin-input" name="editeur" defaultValue={edit.obj.editeur || ''} /></label>
                  <label className="admin-label">Référent<input className="admin-input" name="referent" defaultValue={edit.obj.referent || ''} /></label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Hébergement<input className="admin-input" name="hebergement" defaultValue={edit.obj.hebergement || ''} /></label>
                  <label className="admin-label">Trigramme<input className="admin-input" name="trigramme" defaultValue={edit.obj.trigramme || ''} maxLength={10} /></label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">
                    Criticité
                    <select className="admin-select" name="criticite" defaultValue={edit.obj.criticite || 'Standard'}>
                      <option>Standard</option>
                      <option>Critique</option>
                    </select>
                  </label>
                  <label className="admin-label inline" style={{ marginTop: 22 }}>
                    <input type="checkbox" name="multi" defaultChecked={edit.obj.multiEtablissement} />
                    Multi-établissement
                  </label>
                </div>
                <fieldset className="admin-fieldset">
                  <legend>Interfaces</legend>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: 8 }}>
                    {IFACE_KEYS.map(k => (
                      <label key={k} className="admin-label inline">
                        <input type="checkbox" name={'iface_' + k} defaultChecked={edit.obj.interfaces?.[k]} /> {k}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>)}
            </div>
            <div className="admin-dialog-footer">
              <button type="button" className="admin-btn ghost" onClick={() => dlgRef.current.close()}>Annuler</button>
              <button type="submit" className="admin-btn primary">Valider</button>
            </div>
          </form>
        )}
      </dialog>

      <style jsx>{`
        .metier-tree { display: flex; flex-direction: column; gap: 10px; }

        .tree-node { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
        .tree-node.lvl2 { margin: 8px 0 0 16px; }
        .tree-node.lvl3 { margin: 6px 0 0 16px; }

        .tree-summary {
          padding: 10px 14px;
          list-style: none;
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-weight: 600;
          color: var(--color-primary);
          background: linear-gradient(90deg, rgba(10,46,74,0.04), rgba(31,166,168,0.06));
        }
        .tree-summary::-webkit-details-marker { display: none; }
        .tree-label { display: flex; align-items: center; gap: 6px; }
        .tree-actions { display: flex; gap: 6px; flex-shrink: 0; }

        .tree-children { padding: 6px 10px 10px; display: flex; flex-direction: column; gap: 6px; }

        .app-list { list-style: none; margin: 0; padding: 6px 10px 8px; display: flex; flex-direction: column; gap: 4px; }
        .app-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          font-size: 13px;
        }
        .app-name { display: flex; align-items: center; gap: 6px; }
      `}</style>
    </>
  );
}
