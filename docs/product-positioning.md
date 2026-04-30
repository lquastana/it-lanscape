# Positionnement produit

## Nom

Nom court retenu : **it-landscape**.

Noms de publication possibles :
- **hospital-it-landscape** : explicite pour un public international ;
- **sih-landscape** : plus aligné vocabulaire SI hospitalier francophone ;
- un nom de marque dédié si le projet devient un produit autonome.

## Proposition de valeur

it-landscape donne une lecture opérationnelle du système d'information hospitalier en reliant métier, applications, infrastructure, réseau et flux.

Le MVP répond à une question simple : **qu'est-ce qui est impacté si un composant du SI devient indisponible ?**

## Public cible

- DSI hospitalière.
- Responsable applicatif.
- Responsable infrastructure/réseau.
- RSSI ou référent continuité d'activité.
- Équipe projet GHT ou établissement.

## Cas d'usage prioritaires

- Retrouver une application, son trigramme, ses serveurs et ses flux.
- Comprendre les dépendances entre processus métier, applications et infrastructure.
- Simuler l'indisponibilité d'un serveur ou d'une application.
- Préparer un atelier PCA/PRA ou une revue de criticité.
- Importer progressivement un référentiel existant depuis JSON, Excel ou NetBox.

## Différenciation MVP

- Vision transverse plutôt qu'un inventaire purement technique.
- Démonstration rapide avec données locales.
- Fonctionne sans base de données applicative pour faciliter l'essai.
- NetBox peut devenir la source de vérité infrastructure/réseau.
- RBAC et audit déjà présents pour cadrer un usage sérieux, même si le durcissement production reste à faire.

## Ce que le produit n'est pas encore

- Une CMDB complète.
- Un SIEM ou outil d'observabilité.
- Une solution multi-tenant durcie.
- Un référentiel réglementaire certifié.

## Message court

**it-landscape est un cockpit de cartographie SI hospitalière pour visualiser les dépendances et simuler les impacts d'incident en quelques minutes.**
