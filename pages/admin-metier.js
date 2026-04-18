import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import AdminNav from '../components/AdminNav';

const EMPTY_PROCESS = { nom: '', description: '', applications: [] };
const IFACE_KEYS = ['Planification','Facturation','Administrative','Medicale','Autre'];
const EMPTY_APP = {
  nom:'', description:'', editeur:'', referent:'', hebergement:'',
  criticite:'Standard', multiEtablissement:false, lienPRTG:null,
  interfaces: Object.fromEntries(IFACE_KEYS.map(k=>[k,false])),
  trigramme:''
};

export default function Admin() {
  const [files, setFiles]         = useState([]);
  const [currentFile, setCurrent] = useState('');
  const [data, setData]           = useState(null);
  const [status, setStatus]       = useState('');
  const [edit, setEdit]           = useState(null);
  const dlgRef = useRef(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(({ files }) =>
        setFiles(files.filter(f => !f.endsWith('.infra.json') && !f.endsWith('.network.json') && f !== 'trigrammes.json'))
      )
      .catch(() => setStatus('Erreur de chargement de la liste des fichiers'));
  }, []);

  useEffect(() => {
    if (!currentFile) { setData(null); return; }
    setStatus('Chargement…');
    fetch('/api/file/' + encodeURIComponent(currentFile))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(js => { setData(js); setStatus(''); })
      .catch(() => setStatus('Erreur de lecture du fichier'));
  }, [currentFile]);

  const handleSave = async () => {
    if (!currentFile || !data) return;
    setStatus('Enregistrement…');
    const res = await fetch('/api/file/' + encodeURIComponent(currentFile), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2)
    });
    setStatus(res.ok ? '✅ Enregistré' : '❌ Erreur d\'enregistrement');
  };

  const patchAtPath = (path, mutator) => {
    setData(prev => {
      const clone = structuredClone(prev);
      let ptr = clone;
      for (let i = 0; i < path.length - 1; i++) ptr = ptr[path[i]];
      const key = path[path.length - 1];
      ptr[key] = mutator(ptr[key]);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (edit.type === 'process') {
      const newProc = { nom: fd.get('nom'), description: fd.get('description'), applications: edit.obj.applications ?? [] };
      if (edit.isNew) patchAtPath(edit.path.slice(0, -1), arr => [...arr, newProc]);
      else patchAtPath(edit.path, () => newProc);
    } else {
      const interfacesObj = Object.fromEntries(IFACE_KEYS.map(k => ['' + k, fd.get('iface_' + k) === 'on']));
      const newApp = {
        nom: fd.get('nom'), description: fd.get('description'),
        editeur: fd.get('editeur'), referent: fd.get('referent'),
        hebergement: fd.get('hebergement'), criticite: fd.get('criticite'),
        multiEtablissement: fd.get('multi') === 'on', lienPRTG: edit.obj.lienPRTG,
        interfaces: interfacesObj,
        trigramme: (fd.get('trigramme') || '').toUpperCase()
      };
      if (edit.isNew) patchAtPath(edit.path.slice(0, -1), arr => [...arr, newApp]);
      else patchAtPath(edit.path, () => newApp);
    }
    dlgRef.current.close(); setEdit(null);
  };

  return (
    <>
      <Head><title>Administration données SIH</title></Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Administration des données SIH</h1>
              <p className="hero-subtitle">Gestion centralisée des établissements, domaines et applications.</p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="page-shell" style={{ padding: '1.5rem 0 3rem' }}>
        <div className="toolbar">
          <select value={currentFile} onChange={e => setCurrent(e.target.value)}>
            <option value="">— Sélectionner un fichier —</option>
            {files.map(f => <option key={f}>{f}</option>)}
          </select>
          <button className="primary" disabled={!data} onClick={handleSave}>Enregistrer</button>
          {status && <p className="status">{status}</p>}
        </div>

        <div className="content">
          {!data && <p className="muted">Choisissez un fichier à éditer…</p>}
          {data && data.etablissements?.map((etab, eIdx) => (
            <details key={eIdx} open>
              <summary>{etab.nom}</summary>
              {etab.domaines.map((dom, dIdx) => (
                <details key={dIdx} className="lvl2">
                  <summary>
                    <span>{dom.nom}</span>
                    <button className="act-btn" title="Ajouter un processus" onClick={e => { e.stopPropagation(); editProcess(eIdx, dIdx, null); }}>+ Processus</button>
                  </summary>
                  {dom.processus.map((proc, pIdx) => (
                    <details key={pIdx} className="lvl3">
                      <summary>
                        <span>{proc.nom} <span className="badge">{proc.applications.length}</span></span>
                        <span className="act">
                          <button className="icon-btn" title="Modifier" onClick={e => { e.stopPropagation(); editProcess(eIdx, dIdx, pIdx); }}>✏️</button>
                          <button className="icon-btn" title="Supprimer" onClick={e => { e.stopPropagation(); if (confirm('Supprimer le processus ?')) delAtPath(['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx]); }}>🗑️</button>
                          <button className="act-btn" title="Ajouter une application" onClick={e => { e.stopPropagation(); editApp(eIdx, dIdx, pIdx, null); }}>+ Application</button>
                        </span>
                      </summary>
                      <ul className="apps">
                        {proc.applications.map((app, aIdx) => (
                          <li key={aIdx}>
                            <span>{app.nom}</span>
                            <span className="act">
                              <button className="icon-btn" onClick={() => editApp(eIdx, dIdx, pIdx, aIdx)}>✏️</button>
                              <button className="icon-btn" onClick={() => { if (confirm('Supprimer ?')) delAtPath(['etablissements', eIdx, 'domaines', dIdx, 'processus', pIdx, 'applications', aIdx]); }}>🗑️</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </details>
              ))}
            </details>
          ))}
        </div>
      </section>

      <dialog ref={dlgRef} onCancel={() => setEdit(null)}>
        {edit && (
          <form onSubmit={handleSubmit} key={edit.path?.join('/')}>
            <h2>{edit.type === 'process' ? 'Processus' : 'Application'}</h2>
            <div className="form-stack">
              <label>Nom<input name="nom" defaultValue={edit.obj.nom} required /></label>
              <label>Description<input name="description" defaultValue={edit.obj.description} /></label>
              {edit.type === 'app' && (<>
                <div className="form-row">
                  <label>Éditeur<input name="editeur" defaultValue={edit.obj.editeur || ''} /></label>
                  <label>Référent<input name="referent" defaultValue={edit.obj.referent || ''} /></label>
                </div>
                <div className="form-row">
                  <label>Hébergement<input name="hebergement" defaultValue={edit.obj.hebergement || ''} /></label>
                  <label>Trigramme<input name="trigramme" defaultValue={edit.obj.trigramme || ''} /></label>
                </div>
                <div className="form-row">
                  <label>Criticité
                    <select name="criticite" defaultValue={edit.obj.criticite || 'Standard'}>
                      <option>Standard</option>
                      <option>Critique</option>
                    </select>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="multi" defaultChecked={edit.obj.multiEtablissement} />
                    Multi-établissement
                  </label>
                </div>
                <fieldset>
                  <legend>Interfaces</legend>
                  <div className="iface-grid">
                    {IFACE_KEYS.map(k => (
                      <label key={k} className="checkbox-label">
                        <input type="checkbox" name={'iface_' + k} defaultChecked={edit.obj.interfaces?.[k]} /> {k}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>)}
            </div>
            <div className="dialog-footer">
              <button type="button" className="ghost" onClick={() => dlgRef.current.close()}>Annuler</button>
              <button type="submit" className="primary">Valider</button>
            </div>
          </form>
        )}
      </dialog>

      <style jsx>{`
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding: 14px 20px;
          background: var(--color-white);
          box-shadow: var(--shadow-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          margin-bottom: 24px;
        }
        .toolbar select {
          flex: 1;
          min-width: 200px;
          font-size: 0.95rem;
          padding: 10px 12px;
          border: 1px solid #cfd8e3;
          border-radius: 10px;
          background: #fff;
        }
        .status {
          font-weight: 600;
          color: var(--color-primary);
          padding: 0.5rem 1rem;
          background: #f0f6ff;
          border: 1px solid #cfe0ff;
          border-radius: 10px;
          margin: 0;
        }
        .muted { opacity: .6; margin: 30px 0; }
        .content { display: grid; gap: 12px; }
        details {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-white);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        summary {
          padding: 10px 14px;
          cursor: pointer;
          list-style: none;
          user-select: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: var(--color-primary);
          background: linear-gradient(90deg, rgba(0,51,102,0.04), rgba(40,166,191,0.08));
        }
        details.lvl2 { margin: 6px 12px; }
        details.lvl3 { margin: 6px 24px; }
        .badge {
          background: var(--color-accent);
          color: var(--color-white);
          border-radius: 12px;
          padding: 1px 8px;
          font-size: .72rem;
          margin-left: 6px;
          font-weight: 600;
        }
        ul.apps {
          margin: 6px 16px 12px;
          padding: 0;
          display: grid;
          gap: 4px;
        }
        ul.apps li {
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          background: #f8fafc;
          font-size: 0.9rem;
          color: var(--color-text);
        }
        .act { display: inline-flex; gap: 4px; align-items: center; }
        .icon-btn {
          font-size: .9rem;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          line-height: 1;
        }
        .icon-btn:hover { background: rgba(0,51,102,0.08); }
        .act-btn {
          font-size: 0.78rem;
          font-weight: 600;
          background: rgba(40,166,191,0.12);
          color: #0e7490;
          border: 1px solid rgba(40,166,191,0.3);
          border-radius: 6px;
          padding: 2px 8px;
          cursor: pointer;
          white-space: nowrap;
        }
        .act-btn:hover { background: rgba(40,166,191,0.22); }
        .primary {
          background: linear-gradient(135deg, #1d74e7, #0f5bd6);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(29,116,231,0.25);
          white-space: nowrap;
        }
        .primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghost {
          border: 1px solid #c8d6e5;
          background: #f5f8ff;
          padding: 9px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #1b4d9b;
        }
        dialog {
          border: none;
          padding: 28px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,51,102,0.18);
          width: min(560px, 90vw);
        }
        dialog::backdrop { background: rgba(0,30,60,0.4); }
        dialog h2 { margin-bottom: 20px; }
        .form-stack {
          display: grid;
          gap: 12px;
        }
        .form-stack label,
        .form-row label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--color-primary);
        }
        .form-stack input,
        .form-stack select,
        .form-row input,
        .form-row select {
          padding: 9px 12px;
          border: 1px solid #cfd8e3;
          border-radius: 10px;
          font-size: 0.95rem;
          background: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-stack input:focus,
        .form-stack select:focus,
        .form-row input:focus,
        .form-row select:focus {
          border-color: #1d74e7;
          box-shadow: 0 0 0 3px rgba(29,116,231,0.15);
          outline: none;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .checkbox-label {
          flex-direction: row !important;
          align-items: center;
          gap: 8px !important;
          font-weight: 500 !important;
          cursor: pointer;
        }
        fieldset {
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 12px 16px;
        }
        fieldset legend {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--color-primary);
          padding: 0 6px;
        }
        .iface-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
          margin-top: 6px;
        }
        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </>
  );
}
