# ADR-0001: Stockage des données en fichiers JSON

## Contexte
Le projet doit être déployable rapidement dans des environnements hétérogènes (hôpitaux, GHT) avec un minimum de dépendances.

## Décision
Stocker les données de cartographie (métier, infra, réseau, flux) dans des fichiers JSON versionnables, accessibles via l’API Next.js.

Cette décision est complétée par [ADR-0002](0002-json-renforce-historisation.md), qui ajoute verrouillage, écriture atomique, snapshots et journal d'historique sans abandonner le stockage JSON.

## Conséquences
**Avantages**
- Déploiement simple, sans base de données.
- Versioning Git facile des jeux de données.

**Inconvénients**
- Pas d’historisation ni d’audit natifs sans couche applicative complémentaire.
- Concurrence d’écriture limitée (risque de conflits).
- Scalabilité limitée pour gros volumes.

## Évolutions possibles
- Industrialiser la couche JSON existante avec purge/archivage de l'historique, restauration guidée et supervision des erreurs d'écriture.

## Alternatives envisagées
- Base PostgreSQL avec migrations et schéma strict.
- Intégration CMDB externe en source de vérité.
