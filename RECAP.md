# Récapitulatif du projet — OpenTowerDefense

Tower Defense full-stack avec authentification, persistance des scores et interface pixel-art.

---

## Stack technique

| Couche | Technologie | Détails |
|--------|-------------|---------|
| **Frontend** | React 18 + TypeScript | Vite 6, composants fonctionnels |
| **Styles** | Tailwind CSS 3 | PostCSS, thème pixel-art custom |
| **State** | React Context API + useReducer | Un store global, actions typées |
| **Icons** | lucide-react | |
| **Backend** | FastAPI (Python) | Poetry, architecture modulaire par feature |
| **ORM** | SQLModel | SQLAlchemy + Pydantic fusionnés |
| **Base de données** | PostgreSQL | Hébergé sur Supabase |
| **Migrations** | Alembic | Versioning du schéma + seed data |
| **Authentification** | JWT (HS256) + bcrypt | Tokens courts (15 min) + refresh (7 j), cookies HTTP-only |
| **Assets** | Kenney Tiny Dungeon | Sprite sheet pour tours et ennemis |

---

## Ce qui a été réalisé

### 1. Initialisation du projet
- Structure monorepo : `frontend/` (React/Vite) + `backend/` (FastAPI/Poetry)
- Configuration TypeScript, Tailwind CSS, PostCSS
- Client HTTP centralisé avec retry automatique et refresh de token

### 2. Authentification
- Inscription et connexion avec hashage bcrypt
- JWT access token (15 min) + refresh token (7 jours) stockés en cookies HTTP-only
- Endpoint `/me` pour auto-login au chargement de l'app
- Déconnexion avec invalidation du refresh token en base

### 3. Base de données
- Modèles SQLModel : `User`, `GameScore`, `TowerType`, `EnemyType`, `Token`
- Migrations Alembic versionées (schéma initial, seed data, rééquilibrage des stats)
- Connexion PostgreSQL via Supabase

### 4. Mécanique de jeu
- Grille 20×15 avec placement et suppression de tours (remboursement)
- 10 types d'ennemis (Goblin, Wolf, Skeleton, Bandit, Dark Elf, Orc, Troll, Knight, Ogre + Dragon boss)
- Vagues progressives : 5 + (vague × 2) ennemis, boss toutes les 5 vagues
- Scaling de difficulté : +20 % HP / +8 % vitesse par vague
- Simulation de combat : ciblage séquentiel, réduction d'armure, comptage des kills
- Économie : or de départ (150), gains sur les kills, coût de placement des tours
- Système de vies : -1 vie par ennemi qui passe, game over à 0
- Score : 10 × vague courante par kill

### 5. Leaderboard
- Top 10 global et historique personnel (10 dernières parties)
- Badges rang (or/argent/bronze pour le podium)
- Affichage : pseudo, score, vague atteinte, date

### 6. Encyclopédie (Wiki)
- Tableau de référence des tours : coût, dégâts, portée, vitesse, niveau max
- Tableau de référence des ennemis : HP, vitesse, armure, récompense, type
- Tri par coût / HP, indicateur boss

### 7. Interface pixel-art
- Thème rétro avec effet scanlines
- 5 vues : Auth → Menu → Game → Leaderboard → Wiki
- HUD en jeu : vague, or, score, vies, compte à rebours
- Modale de résultat de vague (kills détaillés, or gagné, score)
- Popup info ennemi avec aperçu de la vague suivante
- Composants UI réutilisables : tabs, card, dialog, button, badge

---

## Architecture du projet

```
file-rouge/
├── frontend/
│   └── src/
│       ├── api/            # Appels HTTP (auth, game, leaderboard, reference)
│       ├── components/
│       │   ├── auth/       # Formulaire connexion/inscription
│       │   ├── game/       # Grille, HUD, panel tours, modales
│       │   ├── leaderboard/
│       │   ├── menu/
│       │   ├── wiki/
│       │   └── ui/         # Composants génériques
│       ├── store/          # AppContext + reducer
│       ├── types/          # Types TypeScript globaux
│       └── kenney/         # Sprite sheet (Kenney Tiny Dungeon)
│
└── backend/
    ├── app/
    │   ├── auth/           # Routes + service d'authentification
    │   ├── game/           # Routes + logique de session + simulation
    │   ├── leaderboard/    # Routes + requêtes de scores
    │   ├── reference/      # Routes données de référence (tours/ennemis)
    │   ├── models/         # Modèles SQLModel (user, score, tower, enemy, token)
    │   └── core/           # Config, DB, sécurité, dépendances
    ├── alembic/            # Migrations de base de données
    └── main.py             # Point d'entrée FastAPI
```
