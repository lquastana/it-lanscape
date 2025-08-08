import useInfrastructureData from '../hooks/useInfrastructureData';

export default function ApplicativeView({ data }) {
  const { data: infra } = useInfrastructureData();
  if (!data || !infra) return <main id="content">Chargement…</main>;

  return (
    <main id="content">
      {data.etablissements.map(etab => {
        const infraEtab = infra.etablissements.find(e => e.nom === etab.nom);
        const appMap = new Map();
        etab.domaines.forEach(d =>
          d.processus.forEach(p =>
            p.applications.forEach(a => {
              if (!appMap.has(a.trigramme)) appMap.set(a.trigramme, a);
            })
          )
        );
        const apps = Array.from(appMap.values());
        return (
          <div key={etab.nom}>
            <h2>{etab.nom}</h2>
            <div className="apps">
              {apps.map(app => {
                const servers = infraEtab
                  ? infraEtab.applications?.[app.trigramme] || []
                  : [];
                return (
                  <div key={app.trigramme} className="application">
                    <h5>{app.nom}</h5>
                    {servers.map(s => (
                      <details key={s.VM} className="server">
                        <summary>{s.VM}</summary>
                        <table className="server-details">
                          <tbody>
                            {Object.entries(s)
                              .filter(([k]) => !['VM', 'trigramme'].includes(k))
                              .map(([k, v]) => (
                                <tr key={k}>
                                  <th>{k}</th>
                                  <td>{Array.isArray(v) ? v.join(', ') : v}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </details>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}
