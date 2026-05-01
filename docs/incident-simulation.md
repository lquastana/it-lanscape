# Simulation d'incident

## Objectif
La page **Simulation d'incident** permet d’évaluer l’impact d’une panne ou d’une dégradation sur les applications, serveurs, flux et hébergeurs, en s’appuyant sur les données de cartographie existantes.

## Sources de données
La simulation s’appuie sur :
- **Cartographie métier** : `/api/landscape` (domaines, processus, applications).
- **Infrastructure** : `/api/infrastructure` (serveurs, liens avec applications).
- **Flux applicatifs** : `/api/flux` (source/cible, protocoles, criticité).

## Principe de fonctionnement
1. **Sélection d’un composant** (application, serveur, flux, hébergeur ou composant libre).
2. **Choix du statut** (HS, Dégradé, Latence, Intermittent).
3. **Propagation** des impacts aux dépendances amont/aval.
4. **Synthèse** des impacts par établissement, processus et application.

## Sorties
- **Liste d’impacts** ordonnée par criticité et statut.
- **Diagramme de propagation** (vue graphique multi-établissements).
- **Export Markdown** pour partage lisible en cellule de crise, revue PRA/PCA ou dépôt Git.
- **Scénarios enregistrés localement dans le navigateur** pour rejouer une simulation pendant un atelier.

## Limites
- La propagation dépend uniquement des liens applicatifs et des flux décrits dans les JSON.
- Aucun calcul de RTO/RPO ou de mode dégradé formel n’est inclus.
- Les scénarios enregistrés ne sont pas partagés entre utilisateurs et ne remplacent pas un registre d'incident officiel.
