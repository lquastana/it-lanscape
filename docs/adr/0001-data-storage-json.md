# ADR-0001: Stockage des données en fichiers JSON

## Contexte
Le projet doit être déployable rapidement dans des environnements hétérogènes (hôpitaux, GHT) avec un minimum de dépendances.

## Décision
Stocker les données de cartographie (métier, infra, réseau, flux) dans des fichiers JSON versionnables, accessibles via l’API Next.js.

## Conséquences
**Avantages**
- Déploiement simple, sans base de données.
- Versioning Git facile des jeux de données.

**Inconvénients**
- Pas d’historisation ni d’audit natifs.
- Concurrence d’écriture limitée (risque de conflits).
- Scalabilité limitée pour gros volumes.

## Alternatives envisagées
- Base PostgreSQL avec migrations et schéma strict.
- Intégration CMDB externe en source de vérité.
