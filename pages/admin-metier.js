// pages/Admin.jsx  – UI harmonisée + gestion des interfaces
// -----------------------------------------------------------------------------
//  • Palette et typographies alignées sur la « cartographie » principale (bleu #0d6efd)
//  • Formulaire d’application enrichi : check‑boxes pour chaque type d’interface
//  • Rendu toujours React déclaratif, aucun framework CSS externe.
// -----------------------------------------------------------------------------

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

/* ---------- structures vides ---------- */
const EMPTY_PROCESS = { nom: '', description: '', applications: [] };
const IFACE_KEYS = ['Planification','Facturation','Administrative','Medicale','Autre'];
const EMPTY_APP = {
  nom:'', description:'', editeur:'', referent:'', hebergement:'',
  criticite:'Standard', multiEtablissement:false, lienPRTG:null,
  interfaces: Object.fromEntries(IFACE_KEYS.map(k=>[k,false])),
  trigramme:''
};

export default function Admin() {
  /* ---------------- état ---------------- */
  const [files, setFiles]           = useState([]);
  const [currentFile, setCurrent]   = useState('');
  const [data, setData]             = useState(null);
  const [status, setStatus]         = useState('');
  const [edit,  setEdit]            = useState(null);   // { type, path[], obj, isNew }
  const dlgRef = useRef(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  /* ---------------- chargement liste fichiers ---------------- */
  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(({ files }) =>
        setFiles(
          files.filter(
            f => !f.endsWith('.infra.json') && !f.endsWith('.network.json') && f !== 'trigrammes.json'
          )
        )
      )
      .catch(() => setStatus('Erreur de chargement de la liste des fichiers'));
  }, []);

  /* ---------------- chargement d’un fichier ---------------- */
  useEffect(() => {
    if (!currentFile) { setData(null); return; }
    setStatus('Chargement…');
    fetch('/api/file/' + encodeURIComponent(currentFile))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(js => { setData(js); setStatus(''); })
      .catch(() => setStatus('Erreur de lecture du fichier'));
  }, [currentFile]);

  /* ---------------- enregistrement ---------------- */
  const handleSave = async () => {
    if (!currentFile || !data) return;
    setStatus('Enregistrement…');
    const res = await fetch('/api/file/' + encodeURIComponent(currentFile), {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data, null, 2)
    });
    setStatus(res.ok ? '✅ Enregistré' : '❌ Erreur d’enregistrement');
  };

  /* ---------------- helpers mutation ---------------- */
  const patchAtPath = (path, mutator) => {
    setData(prev => {
      const clone = structuredClone(prev);
      let ptr = clone;
      for (let i=0;i<path.length-1;i++) ptr = ptr[path[i]];
      const key = path[path.length-1];
      ptr[key] = mutator(ptr[key]);
      return clone;
    });
  };

  /* ---------------- déclencheurs édition ---------------- */
  const editProcess = (eIdx,dIdx,pIdx) => {
    const proc = pIdx!=null ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx] : EMPTY_PROCESS;
    setEdit({ type:'process', path:['etablissements',eIdx,'domaines',dIdx,'processus',pIdx??'__new'], obj:proc, isNew:pIdx==null });
    dlgRef.current.showModal();
  };
  const editApp = (eIdx,dIdx,pIdx,aIdx) => {
    const app = aIdx!=null ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx].applications[aIdx] : EMPTY_APP;
    setEdit({ type:'app', path:['etablissements',eIdx,'domaines',dIdx,'processus',pIdx,'applications',aIdx??'__new'], obj:app, isNew:aIdx==null });
    dlgRef.current.showModal();
  };

  /* ---------------- suppression ---------------- */
  const delAtPath = path => {
    patchAtPath(path.slice(0,-1), arr => { const copy=[...arr]; copy.splice(path[path.length-1],1); return copy; });
  };

  /* ---------------- soumission modale ---------------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    if (edit.type==='process') {
      const newProc = { nom:fd.get('nom'), description:fd.get('description'), applications: edit.obj.applications??[] };
      if (edit.isNew) patchAtPath(edit.path.slice(0,-1), arr=>[...arr,newProc]);
      else patchAtPath(edit.path, ()=>newProc);

    } else {
      const interfacesObj = Object.fromEntries(IFACE_KEYS.map(k=>[''+k, fd.get('iface_'+k)==='on']));
      const newApp = {
        nom:fd.get('nom'), description:fd.get('description'),
        editeur:fd.get('editeur'), referent:fd.get('referent'),
        hebergement:fd.get('hebergement'), criticite:fd.get('criticite'),
        multiEtablissement:fd.get('multi')==='on', lienPRTG:edit.obj.lienPRTG,
        interfaces:interfacesObj,
        trigramme:(fd.get('trigramme')||'').toUpperCase()
      };
      if (edit.isNew) patchAtPath(edit.path.slice(0,-1), arr=>[...arr,newApp]);
      else patchAtPath(edit.path, ()=>newApp);
    }
    dlgRef.current.close(); setEdit(null);
  };

  /* ---------------- rendu principal ---------------- */
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
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link className="active" href="/admin-metier">Gestion vue métier</Link>
            <Link href="/admin-infra">Gestion vue infrastructure</Link>
            <Link href="/admin-trigramme">Référentiel trigrammes</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <section className="toolbar page-shell">
        <select value={currentFile} onChange={e=>setCurrent(e.target.value)}>
          <option value="">— Sélectionner un fichier —</option>
          {files.map(f=> <option key={f}>{f}</option>)}
        </select>
        <button className="primary" disabled={!data} onClick={handleSave}>💾 Enregistrer</button>
        <span className="status">{status}</span>
      </section>

      <main className="content page-shell">
        {!data && <p className="hint">Choisissez un fichier à éditer…</p>}
        {data && data.etablissements?.map((etab,eIdx)=>(
          <details key={eIdx} open>
            <summary>{etab.nom}</summary>
            {etab.domaines.map((dom,dIdx)=>(
              <details key={dIdx} className="lvl2">
                <summary>
                  {dom.nom}
                  <button className="sm" title="Ajouter processus" onClick={e=>{e.stopPropagation();editProcess(eIdx,dIdx,null);}}>➕</button>
                </summary>
                {dom.processus.map((proc,pIdx)=>(
                  <details key={pIdx} className="lvl3">
                    <summary>
                      {proc.nom} <span className="badge">{proc.applications.length}</span>
                      <span className="act">
                        <button className="sm" title="Modifier" onClick={e=>{e.stopPropagation();editProcess(eIdx,dIdx,pIdx);}}>✏️</button>
                        <button className="sm" title="Supprimer" onClick={e=>{e.stopPropagation(); if(confirm('Supprimer le processus ?')) delAtPath(['etablissements',eIdx,'domaines',dIdx,'processus',pIdx]);}}>🗑️</button>
                        <button className="sm" title="Ajouter application" onClick={e=>{e.stopPropagation();editApp(eIdx,dIdx,pIdx,null);}}>➕</button>
                      </span>
                    </summary>
                    <ul className="apps">
                      {proc.applications.map((app,aIdx)=>(
                        <li key={aIdx}>
                          {app.nom}
                          <span className="act">
                            <button className="sm" onClick={()=>editApp(eIdx,dIdx,pIdx,aIdx)}>✏️</button>
                            <button className="sm" onClick={()=>{ if(confirm('Supprimer ?')) delAtPath(['etablissements',eIdx,'domaines',dIdx,'processus',pIdx,'applications',aIdx]);}}>🗑️</button>
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
      </main>

      {/* ----------- Modale édition ----------- */}
      <dialog ref={dlgRef} id="editor" onCancel={()=>setEdit(null)}>
        {edit && (
          <form onSubmit={handleSubmit} style={{minWidth:'300px'}} key={edit.path?.join('/')}> 
            {edit.type==='process' ? (
              <>
                <h3>Processus</h3>
                <label>Nom<br/><input name="nom" defaultValue={edit.obj.nom} required style={{width:'100%'}}/></label><br/>
                <label>Description<br/><input name="description" defaultValue={edit.obj.description} style={{width:'100%'}}/></label>
              </>
            ) : (
              <>
                <h3>Application</h3>
                <label>Nom<br/><input name="nom" defaultValue={edit.obj.nom} required style={{width:'100%'}}/></label><br/>
                <label>Description<br/><input name="description" defaultValue={edit.obj.description} style={{width:'100%'}}/></label><br/>
                <label>Éditeur<br/><input name="editeur" defaultValue={edit.obj.editeur||''} style={{width:'100%'}}/></label><br/>
                <label>Référent<br/><input name="referent" defaultValue={edit.obj.referent||''} style={{width:'100%'}}/></label><br/>
                <label>Hébergement<br/><input name="hebergement" defaultValue={edit.obj.hebergement||''} style={{width:'100%'}}/></label><br/>
                <label>Trigramme<br/><input name="trigramme" defaultValue={edit.obj.trigramme||''} style={{width:'100%'}}/></label><br/>
                <label>Criticité <select name="criticite" defaultValue={edit.obj.criticite||'Standard'}><option>Standard</option><option>Critique</option></select></label><br/>
                <label><input type="checkbox" name="multi" defaultChecked={edit.obj.multiEtablissement}/> Multi‑établissement</label>
                <fieldset style={{border:'1px solid #ccc',padding:'6px',marginTop:'10px'}}>
                  <legend>Interfaces</legend>
                  {IFACE_KEYS.map(k=>(
                    <label key={k} style={{display:'inline-block',marginRight:'10px'}}>
                      <input type="checkbox" name={'iface_'+k} defaultChecked={edit.obj.interfaces?.[k]} /> {k}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            <menu style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'14px'}}>
              <button type="button" onClick={()=>dlgRef.current.close()}>Annuler</button>
              <button type="submit" value="ok">OK</button>
            </menu>
          </form>
        )}
      </dialog>

      {/* ----------- styles ----------- */}
      <style jsx>{`
        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 14px 20px;
          background: var(--color-white);
          box-shadow: var(--shadow-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }
        select {
          font-size: 1rem;
          padding: 8px 10px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .primary {
          background: var(--color-accent);
          color: var(--color-white);
          border: none;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 6px 14px rgba(40, 166, 191, 0.25);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .primary:hover { transform: translateY(-1px); }
        .primary:disabled { opacity: .5; cursor: not-allowed; }
        .status { font-weight: 600; min-width: 180px; color: var(--color-primary); }
        .content { padding: 20px 0 60px; }
        details {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
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
          color: var(--color-primary);
          background: linear-gradient(90deg, rgba(0,51,102,0.04), rgba(40,166,191,0.08));
        }
        details.lvl2 { margin-left: 18px; }
        details.lvl3 { margin-left: 36px; }
        .badge {
          background: var(--color-accent);
          color: var(--color-white);
          border-radius: 12px;
          padding: 0 8px;
          font-size: .75rem;
          margin-left: 6px;
        }
        ul.apps {
          margin: 6px 0 12px 20px;
          padding-left: 0;
        }
        ul.apps li {
          list-style: "📦 ";
          margin: 4px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--color-text);
        }
        .sm {
          font-size: .9rem;
          background: transparent;
          border: none;
          cursor: pointer;
          margin-left: 6px;
          color: var(--color-primary);
        }
        .act { display: inline-flex; gap: 4px; }
        .hint { opacity: .7; margin: 30px 0; }
        dialog#editor {
          border: none;
          padding: 24px;
          border-radius: 12px;
          box-shadow: var(--shadow-soft);
        }
      `}</style>
    </>
  );
}
