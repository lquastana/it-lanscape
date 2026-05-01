import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Gauge,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';
import MainNav from '../components/MainNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';
import {
  buildQualityMarkdownReport,
  downloadMarkdownFile,
  markdownFilename,
} from '../lib/markdownReports';

const DIMENSION_ORDER = ['completeness', 'coherence', 'validity', 'exploitability'];
const SEVERITY_CLASSES = {
  critical: 'danger',
  high: 'warning',
  medium: 'notice',
  low: 'quiet',
};

const SOURCE_LABEL = {
  json: 'JSON',
  netbox: 'NetBox',
};

function sourceLabel(source, netbox) {
  if (source === 'netbox') return 'NetBox';
  if (netbox?.enabled === false) {
    if (!netbox.hasUrl && !netbox.hasToken) return 'JSON · NetBox non configuré';
    if (!netbox.hasUrl) return 'JSON · NETBOX_URL manquant';
    if (!netbox.hasToken) return 'JSON · NETBOX_TOKEN manquant';
  }
  return SOURCE_LABEL[source] || source;
}

function sourceTitle(source, netbox) {
  if (source === 'netbox') return 'Configuration NetBox explicite';
  if (netbox?.enabled === false) return 'Analyse basée sur les JSON locaux';
  return '';
}

function scoreTone(score) {
  if (score >= 85) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 50) return 'weak';
  return 'bad';
}

function formatDate(value) {
  if (!value) return 'Non calculé';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function QualityPage() {
  const [quality, setQuality] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/quality')
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Erreur analyse qualité');
        return payload;
      })
      .then(payload => {
        if (!cancelled) setQuality(payload);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  const topIssues = useMemo(() => quality?.issues?.slice(0, 10) || [], [quality]);
  const dimensions = useMemo(
    () => DIMENSION_ORDER.map(key => ({ key, ...quality?.dimensions?.[key] })).filter(item => item.label),
    [quality],
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  const handleMarkdownExport = () => {
    if (!quality) return;
    downloadMarkdownFile(
      markdownFilename('data-quality-center'),
      buildQualityMarkdownReport(quality),
    );
  };

  return (
    <>
      <Head>
        <title>{`Data Quality Center - ${APP_TITLE}`}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero quality-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                Data Quality Center
              </motion.h1>
              <p className="hero-subtitle">
                Score, anomalies et priorités pour piloter la fiabilité du référentiel SI.
              </p>
            </div>
          </div>
          <MainNav onLogout={handleLogout} />
        </div>
      </header>

      {error && (
        <section className="page-shell quality-error">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>{error}</span>
        </section>
      )}

      {!quality && !error && (
        <section className="page-shell quality-loading">
          <Database size={22} aria-hidden="true" />
          <span>Calcul du score qualité...</span>
        </section>
      )}

      {quality && (
        <>
          <section className="business-command-center quality-command-center page-shell">
            <article className={`quality-score-panel ${scoreTone(quality.score)}`}>
              <div>
                <span className="business-section-kicker">Score global</span>
                <div className="quality-score-ring" style={{ '--score': quality.score }}>
                  <strong>{quality.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="quality-score-copy">
                <p>
                  {quality.score >= 85
                    ? 'Fiable pour la gouvernance'
                    : quality.score >= 70
                      ? 'Exploitable avec quelques corrections'
                      : 'Corrections prioritaires à piloter'}
                </p>
                <small>
                  {quality.metrics.issues} anomalie(s), dont {quality.metrics.severityCounts.critical} critique(s)
                  et {quality.metrics.severityCounts.high} forte(s).
                </small>
                <button type="button" className="business-report-button quality-export-button" onClick={handleMarkdownExport}>
                  <Download size={16} aria-hidden="true" />
                  Exporter en Markdown
                </button>
              </div>
            </article>

            <div className="business-kpi-grid quality-kpi-grid" aria-label="Synthèse qualité">
              <article className="business-kpi-card highlight">
                <span>Applications</span>
                <strong>{quality.metrics.applications}</strong>
                <em>{quality.metrics.establishments} établissement(s)</em>
              </article>
              <article className="business-kpi-card">
                <span>Serveurs</span>
                <strong>{quality.metrics.servers}</strong>
                <em>{quality.metrics.networkServers} côté réseau</em>
              </article>
              <article className="business-kpi-card">
                <span>Flux</span>
                <strong>{quality.metrics.flux}</strong>
                <em>Interfaces documentées</em>
              </article>
              <article className="business-kpi-card">
                <span>Anomalies</span>
                <strong>{quality.metrics.issues}</strong>
                <em>{quality.metrics.severityCounts.critical} critique(s)</em>
              </article>
            </div>
          </section>

          <section className="quality-grid page-shell">
            <div className="quality-panel">
              <div className="business-panel-header">
                <div>
                  <span className="business-section-kicker">Dimensions</span>
                  <h2>Mesure du référentiel</h2>
                </div>
                <Gauge size={22} aria-hidden="true" />
              </div>
              <div className="quality-dimensions">
                {dimensions.map(dimension => (
                  <article key={dimension.key} className="quality-dimension">
                    <div>
                      <strong>{dimension.label}</strong>
                      <span>{dimension.passed}/{dimension.total} contrôles conformes</span>
                    </div>
                    <div className="quality-meter" aria-label={`${dimension.label} ${dimension.score}%`}>
                      <span style={{ width: `${dimension.score}%` }} />
                    </div>
                    <em>{dimension.score}%</em>
                  </article>
                ))}
              </div>
              <div className="quality-sources" aria-label="Sources analysées">
                <span>Applications : {SOURCE_LABEL[quality.metrics.sources.applications] || quality.metrics.sources.applications}</span>
                <span title={sourceTitle(quality.metrics.sources.infrastructure, quality.metrics.netbox)}>
                  Infrastructure : {sourceLabel(quality.metrics.sources.infrastructure, quality.metrics.netbox)}
                </span>
                <span title={sourceTitle(quality.metrics.sources.network, quality.metrics.netbox)}>
                  Réseau : {sourceLabel(quality.metrics.sources.network, quality.metrics.netbox)}
                </span>
                <span>Flux : {SOURCE_LABEL[quality.metrics.sources.flux] || quality.metrics.sources.flux}</span>
                <small>Dernier calcul : {formatDate(quality.generatedAt)}</small>
              </div>
            </div>

            <div className="quality-panel">
              <div className="business-panel-header">
                <div>
                  <span className="business-section-kicker">Priorités</span>
                  <h2>Recommandations</h2>
                </div>
                <ListChecks size={22} aria-hidden="true" />
              </div>
              <div className="quality-recommendations">
                {quality.recommendations.length === 0 ? (
                  <p className="quality-empty"><CheckCircle2 size={18} aria-hidden="true" /> Aucun chantier prioritaire détecté.</p>
                ) : quality.recommendations.map(recommendation => (
                  <article key={recommendation.title} className="quality-recommendation">
                    <span className={`quality-severity ${SEVERITY_CLASSES[recommendation.severity]}`}>
                      {recommendation.count}
                    </span>
                    <div>
                      <strong>{recommendation.title}</strong>
                      <p>{recommendation.action}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="quality-panel quality-issues-panel page-shell">
            <div className="business-panel-header">
              <div>
                <span className="business-section-kicker">Anomalies principales</span>
                <h2>Corrections à traiter en premier</h2>
              </div>
              <ShieldAlert size={22} aria-hidden="true" />
            </div>
            <div className="quality-issue-list">
              {topIssues.length === 0 ? (
                <p className="quality-empty"><CheckCircle2 size={18} aria-hidden="true" /> Aucun défaut majeur détecté.</p>
              ) : topIssues.map((issue, index) => (
                <article key={`${issue.title}-${issue.entity}-${index}`} className="quality-issue">
                  <span className={`quality-severity ${SEVERITY_CLASSES[issue.severity]}`}>
                    {issue.severityLabel}
                  </span>
                  <div>
                    <div className="quality-issue-title">
                      <strong>{issue.title}</strong>
                      <em>{issue.dimensionLabel}</em>
                    </div>
                    <p>{issue.detail}</p>
                    <small>{issue.recommendation}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
