import { SEVERITY_WEIGHT } from './constants.js';
import { issueSort } from './scoring.js';

export function buildRecommendations(issues) {
  const buckets = [
    {
      match: issue => issue.category === 'unknown-trigramme',
      title: 'Stabiliser le référentiel des trigrammes',
      action: 'Créer ou corriger les trigrammes inconnus avant d’exploiter les vues d’impact.',
    },
    {
      match: issue => issue.category === 'orphan-server' || issue.category === 'netbox-orphan-server',
      title: 'Rattacher les serveurs aux applications',
      action: 'Associer chaque serveur à un trigramme applicatif valide ou clarifier son statut technique.',
    },
    {
      match: issue => issue.category === 'network-infra-mismatch' || issue.category === 'netbox-network-infra-mismatch',
      title: 'Réconcilier infrastructure et réseau',
      action: 'Aligner les inventaires serveur/IP entre les fichiers infrastructure et réseau.',
    },
    {
      match: issue => issue.category?.startsWith('netbox-'),
      title: 'Corriger la donnée source NetBox',
      action: 'Renseigner sites, primary IP, tags applicatifs, champs custom et préfixes/VLANs dans NetBox.',
    },
    {
      match: issue => issue.category === 'impact-readiness',
      title: 'Prioriser les applications critiques',
      action: 'Compléter serveurs, sauvegardes, contacts, supervision et flux pour les applications critiques.',
    },
    {
      match: issue => issue.category === 'incomplete-application',
      title: 'Compléter les fiches applicatives',
      action: 'Renseigner description, éditeur, hébergement, référent et interfaces sur les applications incomplètes.',
    },
    {
      match: issue => issue.category === 'incomplete-flux',
      title: 'Nettoyer le catalogue de flux',
      action: 'Compléter source, cible, protocole, port, type de message, EAI et description des flux.',
    },
  ];

  return buckets
    .map(bucket => {
      const relatedIssues = issues.filter(bucket.match);
      if (relatedIssues.length === 0) return null;
      const highestSeverity = relatedIssues
        .map(issue => issue.severity)
        .sort((a, b) => SEVERITY_WEIGHT[b] - SEVERITY_WEIGHT[a])[0];
      return {
        title: bucket.title,
        action: bucket.action,
        severity: highestSeverity,
        count: relatedIssues.length,
      };
    })
    .filter(Boolean)
    .sort(issueSort)
    .slice(0, 6);
}
