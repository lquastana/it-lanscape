# ADR-0002: JSON renforce et historisation

## Statut
Acceptee.

## Contexte
ADR-0001 retient les fichiers JSON pour garder un deploiement simple et portable.
Le besoin production evolue toutefois vers plus de robustesse sans imposer
PostgreSQL par defaut : eviter les conflits d'ecriture, conserver une trace des
changements et pouvoir revenir a un etat precedent.

## Decision
Conserver JSON comme stockage applicatif par defaut, avec une couche d'ecriture
renforcee :

- verrou fichier `*.lock` cree en mode exclusif avant chaque ecriture ;
- ecriture atomique via fichier temporaire puis `rename` ;
- snapshot du contenu precedent avant remplacement ;
- journal append-only `data/.history/history.jsonl` avec cible, acteur, hash,
  taille et reference du snapshot ;
- journal d'audit fonctionnel conserve pour les actions utilisateur ;
- rollback manuel possible depuis `data/.history/snapshots/<date>/`.

L'absence de `data/auth/access-rules.json` est bloquante en production. Les
comptes de developpement implicites restent reserves aux environnements non
production.

## Consequences
**Avantages**
- Pas de dependance base de donnees obligatoire.
- Meilleure protection contre les ecritures concurrentes.
- Historique exploitable pour investigation, comparaison et restauration.
- Strategie coherente avec les installations simples ou deconnectees.

**Limites**
- Pas de transactions multi-fichiers.
- Le rollback reste une operation d'exploitation, pas une fonctionnalite UI.
- Le volume d'historique doit etre purge ou archive selon la politique locale.

## Alternatives envisagees
- PostgreSQL par defaut : robuste, mais augmente la complexite d'installation.
- Git comme moteur d'historisation runtime : interessant, mais plus fragile dans
  les conteneurs et volumes partages.
- Ecriture JSON simple sans lock : rejetee pour les deploiements production.
