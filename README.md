# 🗺️ it-landscape

**Visualisation simple et modulaire d'une cartographie applicative hospitalière**  
Basé sur un fichier JSON, ce projet propose un tableau de bord léger pour représenter les domaines, processus et applications d’un établissement de santé.
Une interface React/Next.js compose le front-end pour afficher la cartographie.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen)

---

## 🚀 Démo

> 🧪 [Lien vers la démo](https://votresite.vercel.app) *(optionnel)*  
> 📊 Exemple de jeu de données : [`landscape_sample_clean.json`](./data/landscape_sample.json)

---

## 🏥 Contexte

Conçu à partir de cas d’usage hospitaliers fictifs (ex. `Institut Alta`), ce projet permet de :

- Visualiser rapidement les processus couverts par le système d'information
- Identifier les redondances et mutualisations d'applications
- Piloter la couverture fonctionnelle et technique de l’établissement

---

## 🧩 Fonctionnalités

- 📋 Lecture d’un fichier JSON structuré (`data/landscape.json`)
- 📈 Dashboard CSS (aucune lib graphique) avec 7 indicateurs clés :
  - Alignement processus / applications
  - Taux de mutualisation
  - Répartition par criticité / hébergement
  - Complétude des données
  - Couverture fonctionnelle par type d’interface
- 💬 Chat IA intégré, activé en un clic
- 🧪 Tests de conformité JSON (`npm test`)

---

## ⚙️ Installation

```bash
npm install
````

### ▶️ Lancer le serveur

```bash
npm start
### Demarrer le front-end Next.js

```bash
cd frontend
npm install
npm run dev
```

L'interface Next.js est disponible sur http://localhost:3001

Le serveur démarre sur : [http://localhost:3000](http://localhost:3000)

### 🐳 Déploiement Docker avec Nginx

Un fichier `docker-compose.yml` est fourni pour exécuter l'application derrière
un serveur **Nginx**. Les adresses autorisées sont définies via la variable
`ALLOWED_IPS` dans `.env` (voir le fichier exemple `.env.local.example`).
Nginx génère sa configuration au démarrage en utilisant cette valeur et expose
également un accès **HTTPS** : placez vos certificats dans `./certs/cert.pem` et
`./certs/key.pem` pour activer la connexion sécurisée sur le port `443`.

```bash
docker-compose build
docker-compose up
```

### 🛂 Authentification locale (Passport.js)
Le formulaire `/login.html` utilise la stratégie `passport-local`.
Les comptes sont définis dans `data/users.json` avec des mots de passe hachés via `bcrypt`.

Variables d'environnement utiles :

```
SESSION_SECRET="votre_secret"
# Pour désactiver l'authentification (mode développement uniquement)
# La valeur par défaut est "false" pour activer la connexion
DISABLE_AUTH="false"
# Liste des IP autorisées (exemple)
ALLOWED_IPS="allow 185.15.24.118; allow 172.18.0.1;"
```

Les données (y compris les comptes) sont persistées dans le volume `data` défini dans `docker-compose.yml`.
---

## 🧪 Tests

```bash
npm test
```

Ce test vérifie que le fichier JSON respecte la structure fonctionnelle attendue.

---

## 🧬 Structure du JSON

```json
{
  "etablissements": [
    {
      "nom": "Institut Alta",
      "domaines": [
        {
          "nom": "Support",
          "description": "...",
          "processus": [
            {
              "nom": "DMI",
              "description": "...",
              "applications": [
                {
                  "nom": "AquaFlow31",
                  "description": "...",
                  "editeur": null,
                  "referent": null,
                  "hebergement": "Hébergement Central",
                  "multiEtablissement": false,
                  "criticite": "Critique",
                  "lienPRTG": null,
                  "interfaces": {
                    "Planification": false,
                    "Facturation": true,
                    "Administrative": false,
                    "Medicale": true,
                    "Autre": true
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📈 Indicateurs affichés

1. **⚙️ Alignement des processus** : % de processus avec au moins une application
2. **🖥️ Alignement des applications** : homogénéité entre établissements
3. **🏗️ Mutualisation** : taux d'applications partagées
4. **🔥 Criticité** : Standard / Haute / Critique
5. **🏢 Hébergement** : lieux d'hébergement anonymisés
6. **📑 Complétude des champs** : éditeur, référent, supervision
7. **🧩 Couverture des interfaces** : par domaines DPI

---

## 📄 Exemples d’usage

> Sur un ensemble fictif de 192 applications :

* 94,9 % des processus sont couverts par au moins une application
* 44,2 % sont homogènes entre établissements
* 40,1 % des applications sont mutualisées
* 12 % sont critiques

---

## 🛠️ Roadmap

* 🧠 Assistant IA contextuel
* 🧪 Simulateur d’impact (ajout/retrait d’appli)
* 🔁 Suivi des projets de convergence
* 📡 Vue graphe des dépendances applicatives
* 📤 Export PDF/Excel du dashboard

---

## 🙌 Contribution

Les contributions sont bienvenues !

```bash
git clone https://github.com/votre_user/it-landscape.git
cd it-landscape
npm install
```

Consulte le fichier [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour plus de détails.

---

## 📄 Licence

Distribué sous licence MIT – libre d’usage et de modification.

---

