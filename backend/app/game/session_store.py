"""
Stockage en memoire des sessions de jeu actives.

Chaque utilisateur ne peut avoir qu'une seule session active a la fois.
Le dictionnaire est indexe par user_id (UUID).

Limites connues :
- Les sessions sont perdues si le serveur redemarre.
- Pas de partage entre instances (single-process uniquement).
Ces limites sont acceptables pour un jeu solo non persistant.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID

from ..core.config import MAP_HEIGHT, MAP_WIDTH, STARTING_GOLD


@dataclass
class PlacedTower:
    tower_type_id: UUID
    tower_name: str
    x: int
    y: int
    damage: int
    scope: float
    attack_speed: float
    level: int = 1


@dataclass
class ActiveEnemy:
    enemy_type_id: UUID
    enemy_name: str
    current_hp: float
    max_hp: float
    speed: float
    armor: int
    reward_or: int
    is_boss: bool
    alive: bool = True


@dataclass
class GameSession:
    """Etat complet d'une partie en cours pour un joueur."""

    user_id: UUID
    wave: int = 0
    gold: int = STARTING_GOLD
    score: int = 0
    lives: int = 1
    is_over: bool = False
    towers: list[PlacedTower] = field(default_factory=list)
    enemies: list[ActiveEnemy] = field(default_factory=list)

    # Donnees de reference chargees depuis la BDD au demarrage de la partie.
    # Indexees par UUID pour un acces rapide.
    _tower_types: dict = field(default_factory=dict, repr=False)
    _enemy_types: list = field(default_factory=list, repr=False)

    # Grille d'occupation : set de (x, y) occupes par des tours.
    _occupied: set = field(default_factory=set, repr=False)

    # --- Placement de tour ------------------------------------------------

    def place_tower(self, tower_type_id: UUID, x: int, y: int) -> PlacedTower:
        """Place une tour sur la grille.

        Leve ValueError si :
        - La partie est terminee
        - Les coordonnees sont hors grille
        - La case est deja occupee
        - Le type de tour n'existe pas
        - L'or est insuffisant
        """
        if self.is_over:
            raise ValueError("La partie est terminee")

        if x < 0 or x >= MAP_WIDTH or y < 0 or y >= MAP_HEIGHT:
            raise ValueError(
                f"Coordonnees hors grille (max {MAP_WIDTH-1}, {MAP_HEIGHT-1})"
            )

        if (x, y) in self._occupied:
            raise ValueError("Case deja occupee")

        tt = self._tower_types.get(tower_type_id)
        if tt is None:
            raise ValueError("Type de tour inconnu")

        cost = int(tt["base_cost"])
        if self.gold < cost:
            raise ValueError(
                f"Or insuffisant (besoin: {cost}, disponible: {self.gold})"
            )

        self.gold -= cost
        tower = PlacedTower(
            tower_type_id=tower_type_id,
            tower_name=tt["name"],
            x=x,
            y=y,
            damage=int(tt["base_damage"]),
            scope=float(tt["basic_scope"]),
            attack_speed=float(tt["basic_attack_speed"]),
        )
        self.towers.append(tower)
        self._occupied.add((x, y))
        return tower

    def remove_tower(self, x: int, y: int) -> PlacedTower:
        """Retire une tour et rembourse son coût."""
        if self.is_over:
            raise ValueError("La partie est terminee")
        for i, tower in enumerate(self.towers):
            if tower.x == x and tower.y == y:
                tt = self._tower_types.get(tower.tower_type_id)
                if tt:
                    self.gold += int(tt["base_cost"])
                self.towers.pop(i)
                self._occupied.discard((x, y))
                return tower
        raise ValueError("Aucune tour a cet emplacement")

    # --- Logique de vague --------------------------------------------------

    def next_wave(self) -> dict:
        """Lance la vague suivante et simule le combat.

        Renvoie un dictionnaire avec les resultats de la vague.
        """
        if self.is_over:
            raise ValueError("La partie est terminee")

        self.wave += 1
        wave = self.wave

        # --- Spawn des ennemis de la vague ---
        # Les vagues de boss ne spawent qu'un seul ennemi.
        is_boss_wave = (wave % 5 == 0)
        nb_enemies = 1 if is_boss_wave else 5 + wave * 2
        spawned: list[ActiveEnemy] = []
        # Cles en minuscules pour etre insensible a la casse des noms en DB.
        _MIN_WAVE: dict[str, int] = {
            "gobelin":        1,
            "loup":           1,
            "squelette":      3,
            "bandit":         4,
            "elfe sombre":    5,
            "orc":            6,
            "troll":          8,
            "chevalier noir": 9,
            "ogre":           11,
            "dragon":         5,   # boss toutes les 5 vagues
        }

        def _min_wave(et: dict) -> int:
            return _MIN_WAVE.get(et["name"].lower().strip(), 99)

        if is_boss_wave:
            available = [
                et for et in self._enemy_types
                if et["is_boss"] and _min_wave(et) <= wave
            ]
        else:
            available = [
                et for et in self._enemy_types
                if not et["is_boss"] and _min_wave(et) <= wave
            ]
        # Fallback : si aucun ennemi eligible, prendre les basiques (vague 1)
        if not available:
            available = [
                et for et in self._enemy_types
                if not et["is_boss"] and _min_wave(et) <= 1
            ] or [et for et in self._enemy_types if not et["is_boss"]]

        for _ in range(nb_enemies):
            et = random.choice(available)
            base_hp = int(et["life_points"])
            base_speed = float(et["speed"])

            # Difficulte croissante : HP +20% par vague, vitesse +8% par vague
            scaled_hp = base_hp * (1 + wave * 0.03)
            # Variation individuelle de vitesse : ±15% pour eviter les groupes synchronises
            speed_jitter = random.uniform(0.85, 1.15)
            scaled_speed = base_speed * (1 + wave * 0.01) * speed_jitter

            enemy = ActiveEnemy(
                enemy_type_id=et["id"],
                enemy_name=et["name"],
                current_hp=scaled_hp,
                max_hp=scaled_hp,
                speed=scaled_speed,
                armor=int(et["armor"]),
                reward_or=int(et["reward_or"]),
                is_boss=bool(et["is_boss"]),
            )
            spawned.append(enemy)

        # --- Simulation du combat ---
        # Modele physique : chaque tour attaque chaque ennemi en fonction
        # du temps que cet ennemi passe dans sa portee.
        #
        # Nombre d'attaques d'une tour sur un ennemi :
        #   attacks = attack_speed * (2 * scope / enemy.speed)
        #
        # Explication : l'ennemi traverse la portee de la tour en
        # (2 * scope / speed) unites de temps, pendant lequel la tour
        # tire attack_speed fois par unite de temps.
        #
        # Cela rend le scope ET la vitesse de l'ennemi significatifs :
        # - ennemi rapide → moins de hits
        # - grande portee → plus de hits
        # - cadence elevee → plus de hits
        for enemy in spawned:
            total_damage = 0.0
            for tower in self.towers:
                time_in_scope = (2.0 * tower.scope) / max(enemy.speed, 0.1)
                attacks = tower.attack_speed * time_in_scope
                dmg_per_hit = max(tower.damage - enemy.armor, 1)
                total_damage += attacks * dmg_per_hit

            enemy.current_hp = max(0.0, enemy.current_hp - total_damage)
            if enemy.current_hp <= 0:
                enemy.current_hp = 0
                enemy.alive = False

        # --- Bilan de la vague ---
        kills: list[dict] = []
        gold_earned = 0
        score_earned = 0
        enemies_passed = 0
        score_per_kill = 10 * wave

        for enemy in spawned:
            if not enemy.alive:
                gold_earned += enemy.reward_or
                score_earned += score_per_kill
                kills.append({
                    "enemy_name": enemy.enemy_name,
                    "reward_or": enemy.reward_or,
                    "score_gained": score_per_kill,
                })
            else:
                # Ennemi survivant : perd une vie
                enemies_passed += 1
                self.lives -= 1

        self.gold += gold_earned
        self.score += score_earned

        # Stocker les ennemis restants pour l'etat
        self.enemies = spawned

        is_game_over = self.lives <= 0
        if is_game_over:
            self.lives = 0
            self.is_over = True

        return {
            "wave_number": wave,
            "enemies_spawned": nb_enemies,
            "enemies_killed": len(kills),
            "enemies_passed": enemies_passed,
            "kills": kills,
            "gold_earned": gold_earned,
            "score_earned": score_earned,
            "lives_remaining": self.lives,
            "is_game_over": is_game_over,
        }


# ---------------------------------------------------------------------------
# Store global en memoire
# ---------------------------------------------------------------------------

_sessions: dict[UUID, GameSession] = {}


def get_session(user_id: UUID) -> GameSession | None:
    return _sessions.get(user_id)


def create_session(user_id: UUID, tower_types: list, enemy_types: list) -> GameSession:
    """Cree une nouvelle session de jeu pour un utilisateur.

    Si une session existait deja, elle est ecrasee (on recommence).
    tower_types et enemy_types sont des listes de dicts issues de la BDD.
    """
    tt_dict = {t["id"]: t for t in tower_types}

    gs = GameSession(
        user_id=user_id,
        _tower_types=tt_dict,
        _enemy_types=enemy_types,
    )
    _sessions[user_id] = gs
    return gs


def remove_session(user_id: UUID) -> GameSession | None:
    return _sessions.pop(user_id, None)
