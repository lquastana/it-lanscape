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

  const infraSummary = useMemo(() => infraData.map(({ file, data }) => {
    const triCounts = {};
    let missing = 0;
    (data.serveurs || []).forEach(srv => {
      const tri = normalizeTri(srv.trigramme);
      if (!tri) {
        missing += 1;
        return;
      }
      triCounts[tri] = (triCounts[tri] || 0) + 1;
    });
    return { file, etablissement: data.etablissement || file, triCounts, missing };
  }), [infraData]);

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
              <p className="hero-subtitle">Vision consolidée des trigrammes, usages métier et rattachements infrastructure.</p>
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
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Trigramme</th>
                      <th>Libellé</th>
                      <th>Applications (métier)</th>
                      <th>Serveurs (infra)</th>
                      <th>Établissements concernés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trigramStats.map(stat => (
                      <tr key={stat.tri}>
                        <td><code>{stat.tri}</code></td>
                        <td>{stat.label || '—'}</td>
                        <td>{stat.metier}</td>
                        <td>{stat.infra}</td>
                        <td>{stat.etablissements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2>Usage métier</h2>
              <p className="hint">Liste consolidée des applications et trigrammes sur l'ensemble des établissements.</p>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th>Domaine</th>
                      <th>Processus</th>
                      <th>Application</th>
                      <th>Trigramme</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metierUsage.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.etab}</td>
                        <td>{row.domaine}</td>
                        <td>{row.processus}</td>
                        <td>{row.application}</td>
                        <td className={!row.trigramme ? 'warn' : (!trigrammes[row.trigramme] ? 'warn' : '')}>{row.trigramme || '—'}</td>
                        <td className="muted">{row.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2>Infrastructure par établissement</h2>
              <p className="hint">Comptage des serveurs rattachés à chaque trigramme dans les fichiers *infra.json.</p>
              <div className="grid">
                {infraSummary.map(item => (
                  <div key={item.file} className="mini-card">
                    <h3>{item.etablissement}</h3>
                    {Object.keys(item.triCounts).length === 0 && item.missing === 0 && <p className="muted">Aucun serveur déclaré.</p>}
                    {Object.entries(item.triCounts).map(([tri, count]) => (
                      <div key={tri} className="pill-line">
                        <span className="pill">{tri}</span>
                        <span className="muted">{count} serveur(s)</span>
                      </div>
                    ))}
                    {item.missing > 0 && (
                      <p className="warn">{item.missing} serveur(s) sans trigramme</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>Contrôles automatiques</h2>
              <div className="checks">
                <div>
                  <h3>check-trigrammes.js</h3>
                  <p className="muted">{trigramCheck.total} applications analysées.</p>
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
                  <h3>check-infra-missing-trigramme.js</h3>
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

      <style jsx>{`
        .layout { padding: 26px 0 60px; display: flex; flex-direction: column; gap: 18px; }
        .card { background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px 20px; box-shadow: var(--shadow-card); }
        .table-wrapper { overflow: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        th { background: #f3f4f6; }
        code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; }
        .hint { color: #6b7280; margin: 6px 0 12px; }
        .muted { color: #6b7280; }
        .warn { color: #b91c1c; font-weight: 600; }
        .status { font-weight: 600; }
        .ok { color: #15803d; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .mini-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; background: #f9fafb; }
        .pill-line { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .pill { background: #eef2ff; color: #4338ca; padding: 4px 10px; border-radius: 999px; font-weight: 700; }
        .checks { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .warn-row td { background: #fff1f2; }
        .warn-list { color: #b91c1c; margin: 8px 0; padding-left: 18px; }
        .view-switch a.active { font-weight: 700; text-decoration: underline; }
        @media (min-width: 900px) { .checks { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </>
  );
}
