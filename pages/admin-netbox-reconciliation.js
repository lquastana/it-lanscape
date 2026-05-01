import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  Lightbulb,
  Network,
  Server,
  Tags,
} from 'lucide-react';
import AdminNav from '../components/AdminNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

const SEVERITY_CLASS = {
  critical: 'danger',
  high: 'warning',
  medium: 'notice',
  low: 'quiet',
};

const SEVERITY_LABEL = {
  critical: 'Critique',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

const TYPE_LABEL = {
  'vm-missing-trigramme': 'VM sans trigramme',
  'vlan-without-app-usage': 'VLAN sans usage',
  'unattached-object': 'Objets non rattachés',
  'inconsistent-tags': 'Tags incohérents',
  'missing-custom-field': 'Custom fields manquants',
};

function formatDate(value) {
  if (!value) return 'Non calculé';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function sourceStatus(netbox) {
  if (netbox?.enabled) return 'NetBox connecté';
  if (!netbox?.hasUrl && !netbox?.hasToken) return 'NetBox non configuré';
  if (!netbox?.hasUrl) return 'NETBOX_URL manquant';
  if (!netbox?.hasToken) return 'NETBOX_TOKEN manquant';
  return 'Configuration incomplète';
}

export default function AdminNetboxReconciliationPage() {
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/netbox-reconciliation')
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Erreur réconciliation NetBox');
        return payload;
      })
      .then(payload => {
        if (!cancelled) setAnalysis(payload);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  const groupedIssues = useMemo(() => {
    const groups = new Map();
    for (const issue of analysis?.issues || []) {
      const key = issue.type || 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(issue);
    }
    return Array.from(groups.entries()).map(([type, issues]) => ({ type, issues }));
  }, [analysis]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  return (
    <>
      <Head>
        <title>{`NetBox Reconciliation Center - ${APP_TITLE}`}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero reconciliation-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                NetBox Reconciliation Center
              </motion.h1>
              <p className="hero-subtitle">
                Comparez NetBox avec la cartographie applicative et priorisez les corrections de mapping.
              </p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      {error && (
        <section className="page-shell quality-error">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>{error}</span>
        </section>
      )}

      {!analysis && !error && (
        <section className="page-shell quality-loading">
          <GitCompareArrows size={22} aria-hidden="true" />
          <span>Comparaison NetBox / cartographie...</span>
        </section>
      )}

      {analysis && (
        <>
          <section className="business-command-center reconciliation-command-center page-shell">
            <div className="business-command-intro">
              <span className="business-section-kicker">Réconciliation</span>
              <h2>{sourceStatus(analysis.netbox)}</h2>
              <p>
                Dernier calcul : {formatDate(analysis.generatedAt)}. Préfixe tag applicatif : {analysis.tagPrefix || 'app:'}
              </p>
            </div>
            <div className="business-kpi-grid reconciliation-kpi-grid" aria-label="Synthèse réconciliation">
              <article className="business-kpi-card highlight">
                <span>Écarts</span>
                <strong>{analysis.metrics.issues}</strong>
                <em>{analysis.metrics.severityCounts.high || 0} forte(s)</em>
              </article>
              <article className="business-kpi-card">
                <span>Suggestions</span>
                <strong>{analysis.metrics.suggestions}</strong>
                <em>Mappings proposés</em>
              </article>
              <article className="business-kpi-card">
                <span>VM / Devices</span>
                <strong>{analysis.metrics.virtualMachines + analysis.metrics.devices}</strong>
                <em>{analysis.metrics.virtualMachines} VM</em>
              </article>
              <article className="business-kpi-card">
                <span>VLANs</span>
                <strong>{analysis.metrics.vlans}</strong>
                <em>{analysis.metrics.prefixes} préfixe(s)</em>
              </article>
            </div>
          </section>

          {!analysis.netbox?.enabled && (
            <section className="page-shell reconciliation-empty">
              <AlertTriangle size={22} aria-hidden="true" />
              <div>
                <strong>NetBox n’est pas configuré.</strong>
                <p>Définissez `NETBOX_URL` et `NETBOX_TOKEN` pour lancer la comparaison avec l’inventaire NetBox.</p>
              </div>
            </section>
          )}

          {analysis.netbox?.enabled && (
            <main className="page-shell reconciliation-grid">
              <section className="quality-panel reconciliation-panel">
                <div className="business-panel-header">
                  <div>
                    <span className="business-section-kicker">Écarts détectés</span>
                    <h2>Contrôles NetBox</h2>
                  </div>
                  <Network size={22} aria-hidden="true" />
                </div>
                {groupedIssues.length === 0 ? (
                  <p className="quality-empty"><CheckCircle2 size={18} aria-hidden="true" /> Aucun écart détecté.</p>
                ) : groupedIssues.map(group => (
                  <article className="reconciliation-group" key={group.type}>
                    <div className="reconciliation-group-header">
                      <strong>{TYPE_LABEL[group.type] || group.type}</strong>
                      <span>{group.issues.length}</span>
                    </div>
                    <div className="reconciliation-issue-list">
                      {group.issues.map(issue => (
                        <div className="reconciliation-issue" key={issue.id}>
                          <span className={`quality-severity ${SEVERITY_CLASS[issue.severity]}`}>
                            {SEVERITY_LABEL[issue.severity] || issue.severity}
                          </span>
                          <div>
                            <strong>{issue.entity}</strong>
                            <em>{issue.entityType} · {issue.site}</em>
                            <p>{issue.detail}</p>
                            <small>{issue.recommendation}</small>
                            {issue.suggestion && (
                              <span className="reconciliation-suggestion-inline">
                                Suggestion : {issue.suggestion.trigramme} · {issue.suggestion.label}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </section>

              <aside className="quality-panel reconciliation-panel">
                <div className="business-panel-header">
                  <div>
                    <span className="business-section-kicker">Mapping</span>
                    <h2>Suggestions</h2>
                  </div>
                  <Lightbulb size={22} aria-hidden="true" />
                </div>
                {analysis.suggestions.length === 0 ? (
                  <p className="quality-empty"><CheckCircle2 size={18} aria-hidden="true" /> Aucune suggestion automatique.</p>
                ) : (
                  <div className="reconciliation-suggestions">
                    {analysis.suggestions.map(suggestion => (
                      <article key={`${suggestion.entity}-${suggestion.trigramme}`} className="reconciliation-suggestion">
                        <span><Tags size={16} aria-hidden="true" /> {suggestion.trigramme}</span>
                        <strong>{suggestion.entity}</strong>
                        <p>{suggestion.label}</p>
                        <small>{suggestion.reason}</small>
                      </article>
                    ))}
                  </div>
                )}

                <div className="reconciliation-scope">
                  <h3>Périmètre NetBox</h3>
                  <ul>
                    <li><Server size={16} aria-hidden="true" /> {analysis.metrics.virtualMachines} VM actives</li>
                    <li><Server size={16} aria-hidden="true" /> {analysis.metrics.devices} devices actifs</li>
                    <li><Network size={16} aria-hidden="true" /> {analysis.metrics.vlans} VLANs</li>
                    <li><Network size={16} aria-hidden="true" /> {analysis.metrics.prefixes} préfixes</li>
                  </ul>
                </div>
              </aside>
            </main>
          )}
        </>
      )}
    </>
  );
}
