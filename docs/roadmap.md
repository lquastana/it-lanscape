# Roadmap

## Déjà présent dans le MVP

- Cartographie métier, applicative, réseau et flux.
- Simulation d'incident avec impacts directs et indirects.
- Administration des données et imports.
- Authentification NextAuth.
- RBAC `viewer` / `editor` / `admin`.
- Audit append-only JSONL des écritures et exports.
- Intégration NetBox optionnelle et script de seed.

## Court terme (0-3 mois)

- Durcir le RBAC existant : tests de non-régression par route, messages d'accès refusé, revue des droits par écran.
- Améliorer l'audit existant : consultation filtrée, export, corrélation par utilisateur et horodatage.
- Finaliser le packaging de démo : données d'exemple stables, `.env.example`, guide de démonstration.
- Standardiser les exports CSV/JSON pour échanges SI.
- Supprimer les dépendances CDN restantes et documenter le mode offline.

## Moyen terme (3-6 mois)

- Introduire PostgreSQL pour historisation, versioning des référentiels et migrations.
- Approfondir les connecteurs CMDB : NetBox, GLPI, ServiceNow.
- Améliorer la simulation d'incident : RTO/RPO, modes dégradés, criticité métier pondérée.
- Ajouter une vue d'audit UI pour les administrateurs.
- Mettre en place une stratégie de sauvegarde/restauration documentée.

## Long terme (6-12 mois)

- Multi-tenant complet GHT avec cloisonnement fort.
- API publique documentée avec versioning des modèles.
- Observabilité production : métriques, logs structurés, traces et alertes.
- Tests de charge et validation de performance sur gros inventaires.
- Gouvernance produit : modèle de contribution, changelog et releases signées.
