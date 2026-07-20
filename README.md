# DistribFlow

DistribFlow est une solution moderne de gestion et de facturation concue pour un reseau de franchises. Elle integre un tableau de bord de supervision globale pour les administrateurs, un espace pour les proprietaires de franchises et un terminal de caisse enregistreuse interactif pour les vendeurs de terrain.

L'ensemble des prix et transactions est configure en Franc Congolais (CDF) pour correspondre au marche de la grande distribution locale.

---

## Fonctionnalites Principales

### 1. Supervision Globale (Console Super-Admin)
* Indicateurs de performance globaux (Chiffre d'Affaires cumule en CDF, Ventes totales, Vendeurs actifs).
* Liste interactive de toutes les franchises avec details de leur CA et volume de vente.
* Inspecteur de franchise detaille :
  * Visualisation des proprietaires et vendeurs associes.
  * Classement des produits les plus vendus.
  * Historique recent des factures consolidees.

### 2. Administration CRUD
* Gestion complete des utilisateurs et des roles (administrateurs, proprietaires, vendeurs).
* Creation des franchises et assignation des proprietaires.
* Association dynamique des vendeurs de terrain aux franchises correspondantes.

### 3. Espace Proprietaire de Franchise
* Rapports financiers de la franchise en temps reel.
* Graphiques de performance simplistes des ventes de produits et des vendeurs.
* Historique detaille des factures recentes emises par les vendeurs associes.

### 4. Terminal de Caisse Enregistreuse (Vendeurs)
* Point de vente (POS) tactile et adaptatif.
* Panier d'achat interactif permettant l'ajout, la modification des quantites et le retrait d'articles.
* Generation de factures consolidees (le terminal regroupe automatiquement tous les articles d'un meme achat sous un identifiant de facture unique).
* Visualisation des factures emises dans la journee.

---

## Technologies Utilisees

### Backend (Go / Golang 1.26)
* Routeur standard HTTP avec controleurs modularises.
* Gestion des donnees via pgx (Postgres) et requetes generees par sqlc.
* Moteur de migration de base de donnees integre via Goose.
* Authentification securisee par cookie de session.

### Frontend (React / TypeScript / Vite)
* Interface utilisateur minimaliste et monochrome (sans emojis, style epure et moderne).
* Gestion d'etat locale avec React hooks.
* Bundle leger compile sous Nginx.

### Base de Donnees
* PostgreSQL.

---

## Deploiement et Lancement

### Option 1 : Deploiement Automatique avec Docker (Recommande)

La configuration complete (Base de donnees, backend et reverse proxy frontend) est orchestrable en une seule commande. Les migrations sont appliquees automatiquement sur la base de donnees et les donnees de demonstration (seeding) sont inserees a l'initialisation.

1. Lancer l'environnement complete :
   ```bash
   docker compose up --build
   ```

2. Acceder a l'application :
   * Interface Web (Frontend) : http://localhost
   * API Server (Backend) : http://localhost:8888

### Option 2 : Execution en Mode Developpement Local

#### Pre-requis
* Installer Go 1.26+
* Installer Node.js 20+
* Disposer d'une base de donnees PostgreSQL accessible.

#### Configuration
1. Copier et configurer le fichier d'environnement `.env` a la racine du projet :
   ```env
   SERVER_ADDRESS=0.0.0.0
   SERVER_PORT=8888
   DATABASE_URI=postgres://nom_utilisateur:mot_de_passe@localhost:5432/nom_base?sslmode=disable
   SECRET=votre_cle_secrete_jwt
   GOOSE_DRIVER=postgres
   GOOSE_DBSTRING=postgres://nom_utilisateur:mot_de_passe@localhost:5432/nom_base?sslmode=disable
   GOOSE_MIGRATION_DIR=./pkg/database/migrations
   ```

#### Commandes de lancement
* Executer les migrations de base de donnees :
  ```bash
  make migrate-up
  ```
* Compiler et demarrer le backend :
  ```bash
  make distrib_flow && make run-server
  ```
* Demarrer le frontend en mode developpement :
  ```bash
  make run-frontend
  ```

---

## Identifiants de Test

Des comptes de demonstration pre-generes sont inseres a l'initialisation :

* **Administrateur (Supervision Globale et CRUD) :**
  * Email : `admin@distribflow.com`
  * Mot de passe : `admin123`

* **Proprietaire de Franchise :**
  * Email : `jean.paul@distribflow.com`
  * Mot de passe : `12345`

* **Vendeur Terrain :**
  * Email : `josianne@distribflow.com`
  * Mot de passe : `12345`
