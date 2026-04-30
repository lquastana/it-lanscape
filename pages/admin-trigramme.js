import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import AdminNav from '../components/AdminNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

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
        <title>Référentiel trigrammes — {APP_TITLE}</title>
      </Head>
      <header className="hero business-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME} — Administration</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                Référentiel des trigrammes
              </motion.h1>
              <p className="hero-subtitle">Gestion, contrôle et cohérence des identifiants applicatifs.</p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      <main className="page-shell admin-page">
        {status && <p className={`admin-status ${status.startsWith('✅') ? 'ok' : 'warn'}`}>{status}</p>}
        {loading && <p className="admin-status info">Chargement…</p>}

        {!loading && (
          <>
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <span className="business-section-kicker">Référentiel</span>
                  <h2>{Object.keys(trigrammes).length} trigrammes déclarés</h2>
                </div>
              </div>

              <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto', gap: 12, alignItems: 'end', marginBottom: 20 }} onSubmit={handleAddTrigram}>
                <label className="admin-label">
                  Trigramme
                  <input className="admin-input" value={newTri} onChange={e => setNewTri(e.target.value)} maxLength={10} placeholder="EXE" />
                </label>
                <label className="admin-label">
                  Libellé
                  <input className="admin-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Libellé applicatif" />
                </label>
                <button className="admin-btn primary" type="submit">Ajouter</button>
              </form>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
                <label className="admin-label" style={{ flex: 1, minWidth: 200 }}>
                  Recherche
                  <input className="admin-input" type="search" placeholder="Trigramme ou libellé" value={search} onChange={e => setSearch(e.target.value)} />
                </label>
                <div className="admin-pagination">
                  <span style={{ opacity: 0.6 }}>Page {currentPage}/{totalPages}</span>
                  <button className="admin-btn ghost sm" type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>◀</button>
                  <button className="admin-btn ghost sm" type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>▶</button>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => setSort('tri')}>Trigramme {sortKey === 'tri' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th className="sortable" onClick={() => setSort('label')}>Libellé {sortKey === 'label' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th className="sortable" onClick={() => setSort('metier')}>Apps métier {sortKey === 'metier' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th className="sortable" onClick={() => setSort('infra')}>Serveurs {sortKey === 'infra' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th className="sortable" onClick={() => setSort('etablissements')}>Établissements {sortKey === 'etablissements' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStats.map(stat => (
                      <tr key={stat.tri} className="clickable" onClick={() => setDetailTri(stat.tri)}>
                        <td><span className="admin-code">{stat.tri}</span></td>
                        <td>{stat.label || '—'}</td>
                        <td><span className="admin-badge accent">{stat.metier}</span></td>
                        <td>{stat.infra}</td>
                        <td>{stat.etablissements}</td>
                        <td>
                          <button className="admin-btn danger sm" onClick={e => { e.stopPropagation(); handleDeleteTrigram(stat.tri); }}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-card">
              <span className="business-section-kicker">Contrôles</span>
              <h2 style={{ marginBottom: 16 }}>Contrôles automatiques</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 10, marginTop: 0 }}>Doublons &amp; incohérences métier</h3>
                  {trigramCheck.duplicates.length === 0 ? (
                    <p className="admin-status ok">Aucun doublon de libellé détecté.</p>
                  ) : (
                    <ul style={{ color: '#dc2626', margin: '8px 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {trigramCheck.duplicates.map((dup, idx) => (
                        <li key={idx}>
                          Libellé <strong>{dup.name}</strong> utilisé par {dup.tris.join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                  {trigramCheck.issues.length === 0 ? (
                    <p className="admin-status ok">✅ Aucune absence ou incohérence détectée.</p>
                  ) : (
                    <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                      <table className="admin-table">
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
                              <td><span className="admin-code">{i.type}</span></td>
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
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 10, marginTop: 0 }}>Serveurs sans trigramme</h3>
                  {infraMissing.length === 0 ? (
                    <p className="admin-status ok">✅ Aucun serveur sans trigramme détecté.</p>
                  ) : (
                    <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                      <table className="admin-table">
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
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,46,74,0.45)', backdropFilter: 'blur(3px)', zIndex: 9000, display: 'grid', placeItems: 'center', padding: 20 }}
          onClick={() => setDetailTri('')}
        >
          <dialog
            open
            className="admin-dialog"
            style={{ width: 'min(860px, 94vw)', maxHeight: '85vh', overflowY: 'auto' }}
            onClose={() => setDetailTri('')}
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-dialog-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="business-section-kicker">Détail trigramme</span>
                <h2><span className="admin-code">{detailTri}</span> — {trigramDetails[detailTri]?.label || trigrammes[detailTri] || '—'}</h2>
              </div>
              <button className="admin-btn ghost" onClick={() => setDetailTri('')}>✖</button>
            </div>
            <div className="admin-dialog-body">
              <p className="muted" style={{ marginBottom: 16 }}>Établissements concernés : {trigramDetails[detailTri]?.etablissements?.join(', ') || '—'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8, marginTop: 0 }}>Applications (métier)</h4>
                  {trigramDetails[detailTri]?.applications?.length ? (
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
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
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8, marginTop: 0 }}>Serveurs (infra)</h4>
                  {trigramDetails[detailTri]?.serveurs?.length ? (
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
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
    </>
  );
}
