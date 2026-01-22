import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const INTERFACE_TYPES = ['Administrative', 'Medicale', 'Facturation', 'Planification', 'Autre'];

const emptyFlow = {
  id: '',
  sourceTrigramme: '',
  targetTrigramme: '',
  protocol: '',
  port: '',
  messageType: '',
  interfaceType: 'Administrative',
  viaEai: false,
  eaiName: '',
  description: '',
  criticite: 'Standard',
};

const normalizeId = () => (crypto.randomUUID ? crypto.randomUUID() : `FLX-${Date.now()}`);

export default function AdminFlux() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyFlow);
  const [editIndex, setEditIndex] = useState(null);

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
    if (!selectedFile) {
      setData(null);
      return;
    }
    const base = selectedFile.replace(/\.json$/, '');
    setStatus('Chargement...');
    fetch('/api/file/' + encodeURIComponent(base))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(payload => {
        setData(payload);
        setStatus('');
      })
      .catch(() => setStatus('Lecture du fichier flux impossible'));
  }, [selectedFile]);

  const flows = useMemo(() => data?.flux || [], [data]);

  const handleSave = async () => {
    if (!selectedFile || !data) return;
    setStatus('Enregistrement...');
    const base = selectedFile.replace(/\.json$/, '');
    const res = await fetch('/api/file/' + encodeURIComponent(base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    setStatus(res.ok ? '✅ Enregistré' : '❌ Erreur d’enregistrement');
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyFlow);
    setEditIndex(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data) return;
    if (!form.sourceTrigramme || !form.targetTrigramme) {
      setStatus('Merci de renseigner source et cible.');
      return;
    }
    const portValue = form.port === '' ? null : Number(form.port);
    const payload = {
      ...form,
      id: form.id || normalizeId(),
      port: Number.isNaN(portValue) ? null : portValue,
      sourceTrigramme: form.sourceTrigramme.trim().toUpperCase(),
      targetTrigramme: form.targetTrigramme.trim().toUpperCase(),
      eaiName: form.viaEai ? form.eaiName || '' : null,
    };

    const next = [...flows];
    if (editIndex != null) {
      next[editIndex] = payload;
    } else {
      next.unshift(payload);
    }
    setData(prev => ({ ...prev, flux: next }));
    resetForm();
    setStatus('Modification prête à être enregistrée.');
  };

  const handleEdit = (idx) => {
    const flow = flows[idx];
    setForm({
      ...emptyFlow,
      ...flow,
      port: flow.port ?? '',
      eaiName: flow.eaiName ?? '',
    });
    setEditIndex(idx);
  };

  const handleDelete = (idx) => {
    if (!confirm('Supprimer ce flux ?')) return;
    const next = flows.filter((_, i) => i !== idx);
    setData(prev => ({ ...prev, flux: next }));
    setStatus('Flux supprimé (pensez à enregistrer).');
    if (editIndex === idx) resetForm();
  };

  return (
    <>
      <Head>
        <title>Administration flux</title>
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Administration des flux applicatifs</h1>
              <p className="hero-subtitle">Déclarez les échanges, protocoles et EAI.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/admin-metier">Gestion vue métier</Link>
            <Link href="/admin-infra">Gestion vue infrastructure</Link>
            <Link className="active" href="/admin-flux">Gestion flux</Link>
            <Link href="/admin-trigramme">Référentiel trigrammes</Link>
            <button onClick={handleLogout} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline' }}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <section className="toolbar page-shell">
        <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
          <option value="">— Sélectionner un fichier —</option>
          {files.map(file => (
            <option key={file} value={file}>{file.replace('.flux.json', '')}</option>
          ))}
        </select>
        <button className="primary" disabled={!data} onClick={handleSave}>💾 Enregistrer</button>
        <span className="status">{status}</span>
      </section>

      <main className="page-shell grid">
        <section className="card">
          <h2>{editIndex != null ? 'Modifier un flux' : 'Ajouter un flux'}</h2>
          {!data ? (
            <p className="hint">Sélectionnez un établissement pour commencer.</p>
          ) : (
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Source (trigramme)
                <input value={form.sourceTrigramme} onChange={e => updateForm('sourceTrigramme', e.target.value)} required />
              </label>
              <label>
                Cible (trigramme)
                <input value={form.targetTrigramme} onChange={e => updateForm('targetTrigramme', e.target.value)} required />
              </label>
              <label>
                Protocole
                <input value={form.protocol} onChange={e => updateForm('protocol', e.target.value)} placeholder="HL7v2, FHIR, DICOM..." />
              </label>
              <label>
                Port
                <input type="number" value={form.port} onChange={e => updateForm('port', e.target.value)} placeholder="443" />
              </label>
              <label>
                Type de message
                <input value={form.messageType} onChange={e => updateForm('messageType', e.target.value)} placeholder="ADT, ORM, HPRIMXML..." />
              </label>
              <label>
                Type d'interface
                <select value={form.interfaceType} onChange={e => updateForm('interfaceType', e.target.value)}>
                  {INTERFACE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={form.viaEai} onChange={e => updateForm('viaEai', e.target.checked)} />
                Passage via EAI
              </label>
              <label>
                Nom EAI
                <input value={form.eaiName} onChange={e => updateForm('eaiName', e.target.value)} placeholder="EAI régional / local" disabled={!form.viaEai} />
              </label>
              <label>
                Criticité
                <select value={form.criticite} onChange={e => updateForm('criticite', e.target.value)}>
                  <option value="Standard">Standard</option>
                  <option value="Critique">Critique</option>
                </select>
              </label>
              <label className="full">
                Description
                <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} />
              </label>
              <div className="actions">
                <button type="button" onClick={resetForm}>Réinitialiser</button>
                <button type="submit" className="primary">{editIndex != null ? 'Mettre à jour' : 'Ajouter'}</button>
              </div>
            </form>
          )}
        </section>

        <section className="card">
          <h2>Flux déclarés</h2>
          {!data ? (
            <p className="hint">Aucun flux chargé.</p>
          ) : flows.length === 0 ? (
            <p className="hint">Aucun flux pour cet établissement.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Cible</th>
                    <th>Type</th>
                    <th>Protocole</th>
                    <th>Port</th>
                    <th>Message</th>
                    <th>EAI</th>
                    <th>Criticité</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow, idx) => (
                    <tr key={flow.id}>
                      <td>{flow.sourceTrigramme}</td>
                      <td>{flow.targetTrigramme}</td>
                      <td>{flow.interfaceType}</td>
                      <td>{flow.protocol || '-'}</td>
                      <td>{flow.port ?? '-'}</td>
                      <td>{flow.messageType || '-'}</td>
                      <td>{flow.viaEai ? flow.eaiName || 'EAI' : 'Direct'}</td>
                      <td>{flow.criticite || '-'}</td>
                      <td className="actions">
                        <button type="button" onClick={() => handleEdit(idx)}>✏️</button>
                        <button type="button" onClick={() => handleDelete(idx)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: minmax(280px, 380px) 1fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        .card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 25px rgba(15, 38, 73, 0.08);
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 16px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.9rem;
        }
        input, select, textarea {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d6dbe6;
        }
        textarea {
          resize: vertical;
        }
        .checkbox {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .full {
          grid-column: 1 / -1;
        }
        .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          align-items: center;
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
        }
        th {
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          background: #f3f6fb;
          text-align: left;
        }
        .hint {
          color: #6b7280;
        }
        @media (max-width: 980px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
