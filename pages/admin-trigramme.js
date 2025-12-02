import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const normalizeName = (str = '') => str
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const normalizeTri = (value = '') => value.toString().trim().toUpperCase();

const isMissingTrigram = (value) => {
  const tri = normalizeTri(value);
  return !tri || tri === 'XXX';
};

const guessAppName = (vm, role, editeur, candidates = []) => {
  const hay = `${vm || ''} ${role || ''} ${editeur || ''}`.toUpperCase();
  for (const label of candidates) {
    const token = label.toUpperCase();
    if (token.length >= 3 && hay.includes(token)) return label;
  }
  if (/DXCARE|DXC\b|DPI/i.test(hay)) return 'DxCare';
  if (/PHILIPS|INTELLIVUE|ISP\b/i.test(hay)) return 'Philips IntelliVue';
  if (/PRTG/i.test(hay)) return 'PRTG';
  if (/CLOVERLEAF/i.test(hay)) return 'Cloverleaf';
  if (/ENOVACOM/i.test(hay)) return 'Enovacom';
  if (/SENTINEL/i.test(hay)) return 'SentinelOne';
  if (/FORTI|FORTINET/i.test(hay)) return 'Fortinet';
  if (/GLPI/i.test(hay)) return 'GLPI';
  return '';
};

export default function TrigrammeAdmin() {
  const [status, setStatus] = useState('');
  const [trigrammes, setTrigrammes] = useState({});
  const [metierData, setMetierData] = useState([]); // { file, data }
  const [infraData, setInfraData] = useState([]); // { file, data }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('tri');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [newTri, setNewTri] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [detailTri, setDetailTri] = useState('');

  const PAGE_SIZE = 20;

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  const referentialLabels = useMemo(() => Object.values(trigrammes).map(normalizeName), [trigrammes]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const filesRes = await fetch('/api/files');
        const { files = [] } = filesRes.ok ? await filesRes.json() : { files: [] };
        const trigramRes = await fetch('/api/file/trigrammes');
        const trigramJson = trigramRes.ok ? await trigramRes.json() : {};
        setTrigrammes(trigramJson);

        const infraFiles = files.filter(f => f.endsWith('.infra.json'));
        const metierFiles = files.filter(f => f.endsWith('.json') && f !== 'trigrammes.json' && !f.includes('infra.json') && !f.includes('network.json'));

        const fetchJson = async (file) => {
          const base = file.replace(/\.json$/, '');
          const res = await fetch('/api/file/' + encodeURIComponent(base));
          if (!res.ok) throw new Error('Erreur de lecture de ' + file);
          const data = await res.json();
          return { file, data };
        };

        const infra = await Promise.all(infraFiles.map(fetchJson));
        const metier = await Promise.all(metierFiles.map(fetchJson));

        setInfraData(infra);
        setMetierData(metier);
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const persistTrigrammes = async (next) => {
    setStatus('Enregistrement du référentiel…');
    setTrigrammes(next);
    try {
      const res = await fetch('/api/file/trigrammes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next, null, 2),
      });
      setStatus(res.ok ? '✅ Référentiel mis à jour' : '❌ Erreur lors de la sauvegarde');
    } catch (err) {
      console.error(err);
      setStatus('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleAddTrigram = async (e) => {
    e.preventDefault();
    const tri = normalizeTri(newTri);
    const label = newLabel.trim();
    if (!tri || !label) {
      setStatus('Merci de renseigner un trigramme et un libellé.');
      return;
    }
    const next = { ...trigrammes, [tri]: label };
    setNewTri('');
    setNewLabel('');
    setPage(1);
    await persistTrigrammes(next);
  };

  const handleDeleteTrigram = async (tri) => {
    if (!confirm(`Supprimer le trigramme ${tri} ?`)) return;
    const next = { ...trigrammes };
    delete next[tri];
    await persistTrigrammes(next);
  };

  const trigramStats = useMemo(() => {
    const counts = {};
    Object.entries(trigrammes).forEach(([tri, label]) => {
      counts[tri] = { label, metier: 0, infra: 0, etablissements: new Set() };
    });

    metierData.forEach(({ data }) => {
      data.etablissements?.forEach(etab => {
        etab.domaines?.forEach(dom => {
          dom.processus?.forEach(proc => {
            proc.applications?.forEach(app => {
              const tri = normalizeTri(app.trigramme);
              if (!tri) return;
              if (!counts[tri]) counts[tri] = { label: '(référentiel manquant)', metier: 0, infra: 0, etablissements: new Set() };
              counts[tri].metier += 1;
              counts[tri].etablissements.add(etab.nom || '');
            });
          });
        });
      });
    });

    infraData.forEach(({ data }) => {
      const etabName = data.etablissement || '';
      (data.serveurs || []).forEach(srv => {
        const tri = normalizeTri(srv.trigramme);
        if (!tri) return;
        if (!counts[tri]) counts[tri] = { label: '(référentiel manquant)', metier: 0, infra: 0, etablissements: new Set() };
        counts[tri].infra += 1;
        counts[tri].etablissements.add(etabName);
      });
    });

    return Object.entries(counts)
      .map(([tri, val]) => ({
        tri,
        label: val.label,
        metier: val.metier,
        infra: val.infra,
        etablissements: Array.from(val.etablissements).filter(Boolean).length,
      }))
      .sort((a, b) => a.tri.localeCompare(b.tri));
  }, [trigrammes, metierData, infraData]);

  const trigramDetails = useMemo(() => {
    const map = {};
    const ensure = (tri) => {
      if (!map[tri]) map[tri] = { tri, label: trigrammes[tri] || '', applications: [], serveurs: [], etablissements: new Set() };
      return map[tri];
    };

    metierData.forEach(({ data }) => {
      data.etablissements?.forEach(etab => {
        etab.domaines?.forEach(dom => {
          dom.processus?.forEach(proc => {
            proc.applications?.forEach(app => {
              const tri = normalizeTri(app.trigramme);
              if (!tri) return;
              const entry = ensure(tri);
              entry.applications.push({
                application: app.nom,
                description: app.description || '',
                domaine: dom.nom,
                processus: proc.nom,
                etab: etab.nom,
              });
              entry.etablissements.add(etab.nom || '');
            });
          });
        });
      });
    });

    infraData.forEach(({ data }) => {
      const etabName = data.etablissement || '';
      (data.serveurs || []).forEach(srv => {
        const tri = normalizeTri(srv.trigramme);
        if (!tri) return;
        const entry = ensure(tri);
        entry.serveurs.push({
          vm: srv.VM || srv.Nom || srv.Hostname || '',
          ip: srv.PrimaryIPAddress || srv.IP || srv.Ip || '',
          role: srv.RoleServeur || srv.Role || srv.Description || '',
          os: srv.OS || srv.Os || '',
          etab: etabName,
        });
        entry.etablissements.add(etabName);
      });
    });

    return Object.fromEntries(
      Object.entries(map).map(([tri, val]) => [tri, { ...val, etablissements: Array.from(val.etablissements).filter(Boolean) }])
    );
  }, [infraData, metierData, trigrammes]);

  const filteredStats = useMemo(() => {
    const term = normalizeName(search || '');
    const filtered = trigramStats.filter(stat => {
      if (!term) return true;
      const label = normalizeName(stat.label || '');
      return stat.tri.includes(term) || label.includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'tri') return dir * a.tri.localeCompare(b.tri);
      if (sortKey === 'label') return dir * (a.label || '').localeCompare(b.label || '');
      if (sortKey === 'metier') return dir * (a.metier - b.metier);
      if (sortKey === 'infra') return dir * (a.infra - b.infra);
      if (sortKey === 'etablissements') return dir * (a.etablissements - b.etablissements);
      return 0;
    });

    return sorted;
  }, [search, trigramStats, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredStats.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedStats = filteredStats.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const metierUsage = useMemo(() => {
    const usages = [];
    metierData.forEach(({ file, data }) => {
      data.etablissements?.forEach(etab => {
        etab.domaines?.forEach(dom => {
          dom.processus?.forEach(proc => {
            proc.applications?.forEach(app => {
              usages.push({
                file,
                etab: etab.nom,
                domaine: dom.nom,
                processus: proc.nom,
                application: app.nom,
                trigramme: normalizeTri(app.trigramme),
                description: app.description || '',
              });
            });
          });
        });
      });
    });
    return usages;
  }, [metierData]);

  const trigramCheck = useMemo(() => {
    const trigramToName = {};
    const nameToTrigrams = {};
    Object.entries(trigrammes).forEach(([tri, label]) => {
      const upperTri = tri.toUpperCase();
      const norm = normalizeName(label);
      trigramToName[upperTri] = label;
      if (!nameToTrigrams[norm]) nameToTrigrams[norm] = [];
      nameToTrigrams[norm].push(upperTri);
    });

    const duplicates = Object.entries(nameToTrigrams)
      .filter(([, tris]) => tris.length > 1)
      .map(([name, tris]) => ({ name, tris }));

    const issues = [];
    metierUsage.forEach(use => {
      const { trigramme: tri, application, etab, domaine, processus } = use;
      const normName = normalizeName(application);
      const triKnown = tri && trigramToName[tri];
      const nameKnown = nameToTrigrams[normName];

      if (!tri) {
        issues.push({ ...use, type: 'ABSENCE_TRIGRAMME', detail: 'Application sans trigramme' });
      } else if (!triKnown) {
        issues.push({ ...use, type: 'TRIGRAMME_INCONNU', detail: 'Trigramme absent du référentiel' });
      } else if (normalizeName(trigramToName[tri]) !== normName) {
        issues.push({ ...use, type: 'INCOHERENCE_TRI->NOM', detail: `Référentiel: ${trigramToName[tri]}` });
      }

      if (nameKnown && !nameKnown.includes(tri)) {
        issues.push({ ...use, type: 'INCOHERENCE_NOM->TRI', detail: `Référentiel: ${nameKnown.join(', ')}` });
      }
      if (!nameKnown) {
        issues.push({ ...use, type: 'NOM_ABSENT_REFERENTIEL', detail: "Nom d'application absent du référentiel" });
      }
    });

    return { duplicates, issues, total: metierUsage.length };
  }, [trigrammes, metierUsage]);

  const infraMissing = useMemo(() => {
    const rows = [];
    infraData.forEach(({ file, data }) => {
      const etab = data.etablissement || '';
      (data.serveurs || []).forEach(srv => {
        if (isMissingTrigram(srv.trigramme)) {
          const vm = srv.VM || srv.Nom || srv.Hostname || '';
          const ip = srv.PrimaryIPAddress || srv.IP || srv.Ip || '';
          const role = srv.RoleServeur || srv.Role || srv.Description || '';
          const os = srv.OS || srv.Os || '';
          const editeur = srv.Editeur || srv.Vendor || '';
          rows.push({
            file,
            etab,
            vm,
            ip,
            role,
            os,
            editeur,
            suspect: guessAppName(vm, role, editeur, referentialLabels),
          });
        }
      });
    });
    return rows;
  }, [infraData, referentialLabels]);

  return (
    <>
      <Head>
        <title>Administration des trigrammes</title>
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Référentiel des trigrammes</h1>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/admin-metier">Gestion vue métier</Link>
            <Link href="/admin-infra">Gestion vue infrastructure</Link>
            <Link className="active" href="/admin-trigramme">Référentiel trigrammes</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <main className="page-shell layout">
        {status && <p className="status warn">{status}</p>}
        {loading && <p className="status">Chargement…</p>}

        {!loading && (
          <>
            <section className="card">
              <h2>Référentiel</h2>
              <p className="hint">{Object.keys(trigrammes).length} trigrammes déclarés dans trigrammes.json.</p>

              <form className="add-trigram" onSubmit={handleAddTrigram}>
                <div>
                  <label>Trigramme</label>
                  <input value={newTri} onChange={e => setNewTri(e.target.value)} maxLength={10} placeholder="EXE" className="input" />
                </div>
                <div>
                  <label>Libellé</label>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Libellé applicatif" className="input" />
                </div>
                <button className="btn primary" type="submit">Ajouter</button>
              </form>

              <div className="table-controls">
                <div className="field">
                  <label>Recherche</label>
                  <input
                    className="input"
                    type="search"
                    placeholder="Trigramme ou libellé"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="pagination">
                  <span className="muted">Page {currentPage}/{totalPages}</span>
                  <button className="btn ghost" type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>◀</button>
                  <button className="btn ghost" type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>▶</button>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => setSort('tri')} className="sortable">Trigramme {sortKey === 'tri' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => setSort('label')} className="sortable">Libellé {sortKey === 'label' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => setSort('metier')} className="sortable">Applications (métier) {sortKey === 'metier' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => setSort('infra')} className="sortable">Serveurs (infra) {sortKey === 'infra' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => setSort('etablissements')} className="sortable">Établissements concernés {sortKey === 'etablissements' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStats.map(stat => (
                      <tr key={stat.tri} className="clickable" onClick={() => setDetailTri(stat.tri)}>
                        <td><code>{stat.tri}</code></td>
                        <td>{stat.label || '—'}</td>
                        <td>{stat.metier}</td>
                        <td>{stat.infra}</td>
                        <td>{stat.etablissements}</td>
                        <td>
                          <button className="btn ghost danger" onClick={(e) => { e.stopPropagation(); handleDeleteTrigram(stat.tri); }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2>Contrôles automatiques</h2>
              <div className="checks">
                <div>
                  {trigramCheck.duplicates.length === 0 ? (
                    <p className="ok">Aucun doublon de libellé détecté.</p>
                  ) : (
                    <ul className="warn-list">
                      {trigramCheck.duplicates.map((dup, idx) => (
                        <li key={idx}>
                          Libellé <strong>{dup.name}</strong> utilisé par {dup.tris.join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                  {trigramCheck.issues.length === 0 ? (
                    <p className="ok">✅ Aucune absence ou incohérence détectée.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Application</th>
                            <th>Trigramme</th>
                            <th>Établissement</th>
                            <th>Domaine</th>
                            <th>Processus</th>
                            <th>Détail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trigramCheck.issues.map((i, idx) => (
                            <tr key={idx} className="warn-row">
                              <td><code>{i.type}</code></td>
                              <td>{i.application}</td>
                              <td>{i.trigramme || '—'}</td>
                              <td>{i.etab}</td>
                              <td>{i.domaine}</td>
                              <td>{i.processus}</td>
                              <td>{i.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  {infraMissing.length === 0 ? (
                    <p className="ok">✅ Aucun serveur sans trigramme détecté.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Fichier</th>
                            <th>Établissement</th>
                            <th>VM / Hôte</th>
                            <th>IP</th>
                            <th>Rôle</th>
                            <th>Éditeur</th>
                            <th>OS</th>
                            <th>Appli suspectée</th>
                          </tr>
                        </thead>
                        <tbody>
                          {infraMissing.map((row, idx) => (
                            <tr key={idx} className="warn-row">
                              <td>{row.file}</td>
                              <td>{row.etab}</td>
                              <td>{row.vm || '—'}</td>
                              <td>{row.ip || '—'}</td>
                              <td>{row.role || '—'}</td>
                              <td>{row.editeur || '—'}</td>
                              <td>{row.os || '—'}</td>
                              <td className="muted">{row.suspect || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {!!detailTri && (
        <div className="backdrop" onClick={() => setDetailTri('')}>
          <dialog open className="modal" onClose={() => setDetailTri('')} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Détail trigramme</p>
                <h3><code>{detailTri}</code> — {trigramDetails[detailTri]?.label || trigrammes[detailTri] || '—'}</h3>
              </div>
              <button className="btn ghost" onClick={() => setDetailTri('')}>✖</button>
            </div>
            <div className="modal-body">
              <p className="muted">Établissements concernés : {trigramDetails[detailTri]?.etablissements?.join(', ') || '—'}</p>
              <div className="grid">
                <div>
                  <h4>Applications (métier)</h4>
                  {trigramDetails[detailTri]?.applications?.length ? (
                    <ul className="list">
                      {trigramDetails[detailTri].applications.map((app, idx) => (
                        <li key={idx}>
                          <strong>{app.application}</strong> — {app.description || '—'}
                          <div className="muted">{app.etab} • {app.domaine} • {app.processus}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">Aucune application rattachée.</p>}
                </div>
                <div>
                  <h4>Serveurs (infra)</h4>
                  {trigramDetails[detailTri]?.serveurs?.length ? (
                    <ul className="list">
                      {trigramDetails[detailTri].serveurs.map((srv, idx) => (
                        <li key={idx}>
                          <strong>{srv.vm || 'VM inconnue'}</strong> — {srv.role || 'Rôle inconnu'}
                          <div className="muted">{srv.ip || 'IP ?'} • {srv.os || 'OS ?'} • {srv.etab}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">Aucun serveur rattaché.</p>}
                </div>
              </div>
            </div>
          </dialog>
        </div>
      )}

      <style jsx>{`
        :global(body) {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }

        h2, h3, h4 {
          font-family: 'Montserrat', 'Inter', system-ui, sans-serif;
          color: #003366;
        }

        .layout { padding: 26px 0 60px; display: flex; flex-direction: column; gap: 18px; }
        .card { background: #ffffff; border: 1px solid #d6e2f0; border-radius: 14px; padding: 20px; box-shadow: 0 10px 30px rgba(0, 51, 102, 0.06); }
        .table-wrapper { overflow: auto; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
        th { background: #f1f5f9; color: #003366; letter-spacing: 0.01em; }
        code { background: #e0ecff; padding: 3px 7px; border-radius: 8px; font-weight: 600; color: #003366; }
        .hint { color: #475569; margin: 6px 0 12px; }
        .muted { color: #64748b; }
        .warn { color: #b91c1c; font-weight: 600; }
        .status { font-weight: 600; }
        .ok { color: #15803d; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .checks { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .warn-row td { background: #fff1f2; }
        .warn-list { color: #b91c1c; margin: 8px 0; padding-left: 18px; }
        .view-switch a.active { font-weight: 700; text-decoration: underline; }
        .sortable { cursor: pointer; user-select: none; }
        .table-controls { display: flex; gap: 12px; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; flex-wrap: wrap; }
        .table-controls input { min-width: 220px; }
        .pagination { display: flex; align-items: center; gap: 6px; }
        .add-trigram { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: end; margin: 10px 0 18px; }
        .add-trigram input { width: 100%; }
        .clickable { cursor: pointer; }

        .field label, .add-trigram label { display: block; margin-bottom: 6px; font-weight: 600; color: #0f172a; }
        .input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #d6e2f0; background: #ffffff; transition: border-color 0.2s ease, box-shadow 0.2s ease; font-size: 14px; }
        .input:focus { outline: none; border-color: #28a6bf; box-shadow: 0 0 0 3px rgba(40, 166, 191, 0.25); }

        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 12px; border: 1px solid transparent; font-weight: 600; cursor: pointer; transition: transform 0.1s ease, box-shadow 0.2s ease, background 0.2s ease; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.primary { background: #003366; color: #ffffff; box-shadow: 0 8px 18px rgba(0, 51, 102, 0.18); }
        .btn.primary:hover { transform: translateY(-1px); background: #0a4275; }
        .btn.ghost { background: #ffffff; color: #003366; border: 1px solid #d6e2f0; }
        .btn.ghost:hover { background: #f1f5f9; }
        .btn.ghost.danger { color: #b91c1c; border-color: #fca5a5; }
        .btn.ghost.danger:hover { background: #fee2e2; }

        dialog.modal { border: 1px solid #d6e2f0; border-radius: 16px; padding: 0; max-width: 860px; width: 92%; box-shadow: 0 24px 50px rgba(0, 17, 51, 0.25); }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 16px 16px 0 0; }
        .modal-body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 12px; }
        .list { list-style: disc; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
        .backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); display: grid; place-items: center; z-index: 999; }

        @media (min-width: 900px) { .checks { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </>
  );
}
