// pages/Admin.jsx  – UI harmonisée + gestion des interfaces
// -----------------------------------------------------------------------------
//  • Palette et typographies alignées sur la « cartographie » principale (bleu #0d6efd)
//  • Formulaire d’application enrichi : check‑boxes pour chaque type d’interface
//  • Rendu toujours React déclaratif, aucun framework CSS externe.
// -----------------------------------------------------------------------------

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';

/* ---------- structures vides ---------- */
const EMPTY_PROCESS = { nom: '', description: '', applications: [] };
const IFACE_KEYS = ['Planification','Facturation','Administrative','Medicale','Autre'];
const EMPTY_APP = {
  nom:'', description:'', editeur:'', referent:'', hebergement:'',
  criticite:'Standard', multiEtablissement:false, lienPRTG:null,
  interfaces: Object.fromEntries(IFACE_KEYS.map(k=>[k,false]))
};

export default function Admin() {
  /* ---------------- état ---------------- */
  const [files, setFiles]           = useState([]);
  const [currentFile, setCurrent]   = useState('');
  const [data, setData]             = useState(null);
  const [status, setStatus]         = useState('');
  const [edit,  setEdit]            = useState(null);   // { type, path[], obj, isNew }
  const dlgRef = useRef(null);

  /* ---------------- chargement liste fichiers ---------------- */
  useEffect(() => {
    fetch('/api/files')
      .then(r => r.json())
      .then(({ files }) => setFiles(files))
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
        interfaces:interfacesObj
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
      <header className="hd"><h1>Administration des données SIH</h1></header>

      <section className="toolbar">
        <select value={currentFile} onChange={e=>setCurrent(e.target.value)}>
          <option value="">— Sélectionner un fichier —</option>
          {files.map(f=> <option key={f}>{f}</option>)}
        </select>
        <button className="primary" disabled={!data} onClick={handleSave}>💾 Enregistrer</button>
        <span className="status">{status}</span>
      </section>

      <main className="content">
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
          <form onSubmit={handleSubmit} style={{minWidth:'300px'}}>
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
      <style jsx global>{`
        body { margin:0; font-family: "Segoe UI", Roboto, sans-serif; background:#f8fbfe; }
        .hd { background:#0d6efd; color:#fff; padding:14px 30px; box-shadow:0 2px 6px #0003; }
        h1 { margin:0; font-weight:600; font-size:1.5rem; }
        .toolbar { display:flex; gap:14px; align-items:center; padding:16px 30px; background:#fff; box-shadow:0 2px 4px #0001; }
        select { font-size:1rem; padding:4px 8px; }
        .primary { background:#0d6efd; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:500; }
        .primary:disabled { opacity:.4; cursor:default; }
        .status { font-weight:600; min-width:160px; }
        .content { padding:20px 30px 60px; }
        details { border:1px solid #dde1e6; border-radius:6px; margin-bottom:10px; background:#fff; }
        summary { padding:8px 12px; cursor:pointer; list-style:none; user-select:none; font-weight:600; display:flex; align-items:center; justify-content:space-between; }
        details.lvl2 { margin-left:18px; }
        details.lvl3 { margin-left:36px; }
        .badge { background:#adb5bd; color:#fff; border-radius:12px; padding:0 6px; font-size:.75rem; margin-left:6px; }
        ul.apps { margin:6px 0 12px 20px; padding-left:0; }
        ul.apps li { list-style:"1F4E6 "; margin:4px 0; display:flex; justify-content:space-between; align-items:center; }
        .sm { font-size:.9rem; background:transparent; border:none; cursor:pointer; margin-left:6px; }
        .act { display:inline-flex; gap:4px; }
        .hint { opacity:.6; margin:40px 30px; }
        dialog#editor { border:none; padding:24px; border-radius:10px; box-shadow:0 4px 20px #0005; }
      `}</style>
    </>
  );
}
