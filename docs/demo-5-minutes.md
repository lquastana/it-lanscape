# Démo en 5 minutes

Objectif : lancer le MVP, se connecter avec un compte de test, puis trouver l'impact d'un serveur indisponible.

## 1. Lancer l'application

```bash
cp .env.example .env
docker compose up -d --build
```

Ouvrir http://localhost:3000.

Variante avec NetBox :

```bash
cp .env.example .env
# Dans .env, renseigner NETBOX_URL=http://netbox:8080 et des valeurs identiques pour NETBOX_TOKEN et NETBOX_SUPERUSER_API_TOKEN.
docker compose --profile netbox up -d --build
node scripts/netbox-seed.js
```

Avec `make docker-netbox-run` ou `make docker-netbox-run-build`, l'application est automatiquement configurée pour lire NetBox via `http://netbox:8080` avec le token de démonstration.

NetBox est alors disponible sur http://localhost:8080.

## 2. Se connecter

Comptes application :

| Utilisateur | Mot de passe | À montrer |
|-------------|--------------|-----------|
| `viewer` | `password` | Consultation seule |
| `editor` | `password` | Consultation + écriture |
| `admin` | `password` | Administration et habilitations |

> Warning production : ces comptes sont uniquement des comptes de démonstration. Ne jamais les utiliser en production.

## 3. Présenter les données de démonstration

Les données locales couvrent trois établissements :
- Centre Hospitalier Val de Lys ;
- Clinique des Dunes ;
- Hôpital Saint Roch.

Le scénario de démo s'appuie sur :
- des applications avec trigrammes ;
- des serveurs reliés aux applications ;
- des VLANs et adresses IP ;
- des flux applicatifs inter-applications.

## 4. Cas d'usage : impact d'un serveur indisponible

1. Aller dans **Simulation d'incident**.
2. Choisir le type de composant **Serveur**.
3. Rechercher un serveur dans la liste proposée.
4. Définir le statut **Indisponible**.
5. Lancer la simulation.
6. Lire les impacts :
   - applications directement liées ;
   - flux entrants et sortants ;
   - dépendances indirectes ;
   - criticité métier.
7. Sauvegarder le scénario si besoin.
8. Exporter ou imprimer la synthèse pour support d'atelier.

## 5. Montrer l'administration

Avec `admin` :
- ouvrir l'icône réglages dans la barre de navigation ;
- consulter `/admin-metier`, `/admin-flux`, `/admin-trigramme` ;
- ouvrir `/admin-habilitations` pour montrer les rôles.

Avec `editor` :
- montrer que les écrans admin de données sont accessibles ;
- montrer que la gestion des habilitations reste réservée à `admin`.

Avec `viewer` :
- montrer l'accès lecture seule aux vues principales.

## 6. Points à dire pendant la démo

- Le stockage JSON rend le MVP facile à lancer et à auditer.
- NetBox peut prendre le relais comme source de vérité infrastructure/réseau.
- RBAC et audit existent déjà, mais les secrets et comptes doivent être remplacés avant production.
- La roadmap vise l'industrialisation : PostgreSQL, historisation, observabilité, SIEM/audit centralisé et multi-tenant durci.
