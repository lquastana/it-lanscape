export default function Cartography({ data, colors }) {
  if (!data) return <main id="content">Chargement...</main>;
  return (
    <main id="content">
      {data.etablissements.map(etab => (
        <div key={etab.nom}>
          <h2>{etab.nom}</h2>
          {etab.domaines.map(dom => (
            <div key={dom.nom} className="domain">
              <h3>{dom.nom}</h3>
              <p>{dom.description}</p>
              {dom.processus.map(proc => (
                <div key={proc.nom} className="process">
                  <h4>{proc.nom}</h4>
                  <p>{proc.description}</p>
                  <div className="apps">
                    {proc.applications.map(app => (
                      <div key={app.nom} className="application">
                        <h5>
                          {app.nom}
                          {app.multiEtablissement && <span className="multi-icon">🏛️</span>}
                        </h5>
                        <span
                          className="crit-dot"
                          style={{ backgroundColor: app.criticite === 'Critique' ? '#d32f2f' : '#616161' }}
                        >
                          {app.criticite}
                        </span>
                        <div>
                          {Object.entries(app.interfaces).map(([t, act]) =>
                            act ? (
                              <span
                                key={t}
                                className="iface-dot"
                                style={{ backgroundColor: colors[t] }}
                                title={t}
                              />
                            ) : null
                          )}
                        </div>
                        <p>{app.description}</p>
                        <p style={{ fontStyle: 'italic', color: '#666' }}>Hébergement : {app.hebergement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
