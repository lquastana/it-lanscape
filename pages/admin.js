import { useEffect } from 'react';
import Head from 'next/head';

export default function Admin() {
  useEffect(() => {
    let currentFile = null, data = null, editing = null;

    async function loadFiles() {
      const res = await fetch('/api/files');
      const { files } = await res.json();
      const sel = document.getElementById('file-select');
      sel.innerHTML = '<option value="">-- fichier --</option>';
      files.forEach(f => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        sel.appendChild(o);
      });
    }

    document.getElementById('file-select').onchange = async function () {
      currentFile = this.value;
      if (!currentFile) return;
      const res = await fetch('/api/file/' + currentFile);
      data = await res.json();
      render();
      document.getElementById('msg').textContent = '';
    };

    function render() {
      const cont = document.getElementById('content');
      cont.innerHTML = '';
      if (!data) return;
      data.etablissements.forEach((etab, eIdx) => {
        const ediv = document.createElement('div');
        ediv.innerHTML = '<h2>' + etab.nom + '</h2>';
        ediv.querySelector('h2').onclick = () => ediv.classList.toggle('collapsed');
        etab.domaines.forEach((dom, dIdx) => {
          const d = document.createElement('div');
          d.className = 'domain';
          d.innerHTML = '<h3>' + dom.nom + '</h3>';
          d.querySelector('h3').onclick = () => d.classList.toggle('collapsed');
          const btnAdd = document.createElement('button');
          btnAdd.textContent = 'Ajouter processus';
          btnAdd.onclick = () => editProcess(eIdx, dIdx, null);
          d.appendChild(btnAdd);
          dom.processus.forEach((proc, pIdx) => {
            const p = document.createElement('div');
            p.className = 'process';
            const header = document.createElement('div');
            header.textContent = proc.nom;
            header.onclick = () => p.classList.toggle('collapsed');
            const acts = document.createElement('span');
            acts.className = 'actions';
            const bEdit = document.createElement('button');
            bEdit.textContent = 'Modifier';
            bEdit.onclick = () => editProcess(eIdx, dIdx, pIdx);
            const bDel = document.createElement('button');
            bDel.textContent = 'Supprimer';
            bDel.onclick = () => {
              if (confirm('Supprimer ?')) {
                dom.processus.splice(pIdx, 1);
                render();
              }
            };
            const bAddApp = document.createElement('button');
            bAddApp.textContent = 'Ajouter application';
            bAddApp.onclick = () => editApp(eIdx, dIdx, pIdx, null);
            acts.append(bEdit, bDel, bAddApp);
            header.appendChild(acts);
            p.appendChild(header);
            proc.applications.forEach((app, aIdx) => {
              const a = document.createElement('div');
              a.className = 'app';
              const h = document.createElement('div');
              h.textContent = app.nom;
              const aa = document.createElement('span');
              aa.className = 'actions';
              const eb = document.createElement('button');
              eb.textContent = 'Modifier';
              eb.onclick = () => editApp(eIdx, dIdx, pIdx, aIdx);
              const db = document.createElement('button');
              db.textContent = 'Supprimer';
              db.onclick = () => {
                if (confirm('Supprimer ?')) {
                  proc.applications.splice(aIdx, 1);
                  render();
                }
              };
              aa.append(eb, db);
              h.appendChild(aa);
              a.appendChild(h);
              p.appendChild(a);
            });
            d.appendChild(p);
          });
          ediv.appendChild(d);
        });
        cont.appendChild(ediv);
      });
    }

    function editProcess(eIdx, dIdx, pIdx) {
      editing = { type: 'process', eIdx, dIdx, pIdx };
      const proc = pIdx != null
        ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx]
        : { nom: '', description: '', applications: [] };
      const form = document.getElementById('edit-form');
      form.innerHTML = '<h3>Processus</h3>' +
        '<label>Nom<input name="nom" value="' + proc.nom + '" required></label><br>' +
        '<label>Description<input name="description" value="' + proc.description + '"></label><br>' +
        '<menu><button value="cancel">Annuler</button><button value="ok">OK</button></menu>';
      const dlg = document.getElementById('editor');
      dlg.returnValue = 'cancel';
      dlg.showModal();
      form.onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const obj = { nom: f.get('nom'), description: f.get('description'), applications: proc.applications || [] };
        if (pIdx == null) data.etablissements[eIdx].domaines[dIdx].processus.push(obj);
        else Object.assign(proc, obj);
        dlg.close('ok');
        render();
      };
      dlg.onclose = () => {};
    }

    function editApp(eIdx, dIdx, pIdx, aIdx) {
      editing = { type: 'app', eIdx, dIdx, pIdx, aIdx };
      const app = aIdx != null
        ? data.etablissements[eIdx].domaines[dIdx].processus[pIdx].applications[aIdx]
        : { nom: '', description: '', editeur: '', referent: '', hebergement: '', multiEtablissement: false, criticite: 'Standard', lienPRTG: null, interfaces: { Planification: false, Facturation: false, Administrative: false, Medicale: false, Autre: false } };
      const form = document.getElementById('edit-form');
      form.innerHTML = '<h3>Application</h3>' +
        '<label>Nom<input name="nom" value="' + app.nom + '" required></label><br>' +
        '<label>Description<input name="description" value="' + app.description + '"></label><br>' +
        '<label>Éditeur<input name="editeur" value="' + (app.editeur || '') + '"></label><br>' +
        '<label>Référent<input name="referent" value="' + (app.referent || '') + '"></label><br>' +
        '<label>Hébergement<input name="hebergement" value="' + (app.hebergement || '') + '"></label><br>' +
        '<label>Criticité<select name="criticite"><option ' + (app.criticite === 'Standard' ? 'selected' : '') + '>Standard</option><option ' + (app.criticite === 'Critique' ? 'selected' : '') + '>Critique</option></select></label><br>' +
        '<label>Multi-établissement<input type="checkbox" name="multi" ' + (app.multiEtablissement ? 'checked' : '') + '></label><br>' +
        '<menu><button value="cancel">Annuler</button><button value="ok">OK</button></menu>';
      const dlg = document.getElementById('editor');
      dlg.returnValue = 'cancel';
      dlg.showModal();
      form.onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const obj = {
          nom: f.get('nom'),
          description: f.get('description'),
          editeur: f.get('editeur') || null,
          referent: f.get('referent') || null,
          hebergement: f.get('hebergement'),
          multiEtablissement: f.get('multi') === 'on',
          criticite: f.get('criticite'),
          lienPRTG: app.lienPRTG || null,
          interfaces: app.interfaces || { Planification: false, Facturation: false, Administrative: false, Medicale: false, Autre: false }
        };
        if (aIdx == null) data.etablissements[eIdx].domaines[dIdx].processus[pIdx].applications.push(obj);
        else Object.assign(app, obj);
        dlg.close('ok');
        render();
      };
    }

    document.getElementById('save').onclick = async function () {
      if (!currentFile || !data) return;
      const res = await fetch('/api/file/' + currentFile, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
      });
      const msg = document.getElementById('msg');
      msg.style.color = res.ok ? 'green' : 'red';
      msg.textContent = res.ok ? 'Enregistré' : 'Erreur';
    };

    loadFiles();
  }, []);

  return (
    <>
      <Head>
        <title>Administration</title>
        <style>{`
    body{font-family:Arial,sans-serif;margin:0;background:#f5f5f5;}
    .wrapper{max-width:900px;margin:20px auto;}
    header{background:#1B75BC;color:#fff;padding:20px;text-align:center;border-bottom-left-radius:12px;border-bottom-right-radius:12px;}
    select,button{padding:6px 10px;margin-bottom:12px;border-radius:4px;}
    button.primary{background:#1B75BC;color:#fff;border:none;cursor:pointer;}
    .domain,.process,.app{background:#fff;border:1px solid #ccc;padding:8px;border-radius:6px;margin-bottom:8px;}
    .process{margin-left:20px;}
    .app{margin-left:40px;}
    .actions button{margin-right:6px;}
    h2,h3,h4{cursor:pointer;margin:0;}
    .domain.collapsed>.process{display:none;}
    .process.collapsed>.app{display:none;}
    dialog{border:none;border-radius:8px;padding:20px;}
    dialog::backdrop{background:rgba(0,0,0,0.3);}
        `}</style>
      </Head>
      <header><h1>Administration des données</h1></header>
      <div className="wrapper">
        <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'20px'}}>
          <select id="file-select"></select>
          <button id="save" className="primary">Enregistrer</button>
          <span id="msg" style={{fontWeight:'bold',marginLeft:'10px'}}></span>
        </div>
        <div id="content"></div>
      </div>
      <dialog id="editor">
        <form method="dialog" id="edit-form"></form>
      </dialog>
    </>
  );
}
