"""
Stockage persistant des sessions de jeu (table game_session, JSONB).

Chaque utilisateur ne peut avoir qu'une seule session active a la fois.
L'etat est persiste en DB afin de survivre aux redemarrages et de fonctionner
correctement en multi-replicas.
"""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from ..core.config import MAP_HEIGHT, MAP_WIDTH, STARTING_GOLD
from ..models.game_session import GameSessionRow
from ..models.tower import TowerType
from ..models.enemy import EnemyType

# Duree maximale d'inactivite d'une session (en secondes) : 2 heures
_SESSION_TTL_SECONDS: int = 2 * 60 * 60
# Cooldown minimum entre deux appels a income (en secondes)
_INCOME_COOLDOWN_SECONDS: float = 10.0


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

    created_at: float = field(default_factory=time.time)
    last_income_at: float = 0.0

    _tower_types: dict = field(default_factory=dict, repr=False)
    _enemy_types: list = field(default_factory=list, repr=False)
    _occupied: set = field(default_factory=set, repr=False)

    # --- Placement de tour ------------------------------------------------

    def place_tower(self, tower_type_id: UUID, x: int, y: int) -> PlacedTower:
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
        if self.is_over:
            raise ValueError("La partie est terminee")

        self.wave += 1
        wave = self.wave

        is_boss_wave = (wave % 5 == 0)
        nb_enemies = 1 if is_boss_wave else 5 + wave * 2
        spawned: list[ActiveEnemy] = []
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
            "dragon":         5,
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
        if not available:
            available = [
                et for et in self._enemy_types
                if not et["is_boss"] and _min_wave(et) <= 1
            ] or [et for et in self._enemy_types if not et["is_boss"]]

        for _ in range(nb_enemies):
            et = random.choice(available)
            base_hp = int(et["life_points"])
            base_speed = float(et["speed"])
            scaled_hp = base_hp * (1 + wave * 0.20)
            speed_jitter = random.uniform(0.85, 1.15)
            scaled_speed = base_speed * (1 + wave * 0.08) * speed_jitter

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

        # Combat : chaque tour a un budget total de tirs pour la vague,
        # mutualise sur tous les ennemis qui passent dans sa portee.
        # La tour reste focalisee sur le premier ennemi vivant jusqu'a le tuer,
        # puis enchaine sur le suivant tant qu'il lui reste des tirs.
        for tower in self.towers:
            total_time_in_range = sum(
                (tower.scope * 2) / max(e.speed, 0.1)
                for e in spawned
            )
            shots_remaining = max(1, int(tower.attack_speed * total_time_in_range))

            for enemy in spawned:
                if shots_remaining <= 0:
                    break
                if not enemy.alive:
                    continue
                dmg = max(tower.damage - enemy.armor, 1)
                while shots_remaining > 0 and enemy.alive:
                    enemy.current_hp -= dmg
                    shots_remaining -= 1
                    if enemy.current_hp <= 0:
                        enemy.alive = False
                        break

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
                enemies_passed += 1
                self.lives -= 1

        self.gold += gold_earned
        self.score += score_earned
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
# Reference data (tower_types / enemy_types) — chargees a chaque requete
# ---------------------------------------------------------------------------

def _load_tower_types(db: Session) -> list[dict]:
    rows = db.exec(select(TowerType)).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "base_damage": t.base_damage,
            "basic_scope": float(t.basic_scope),
            "basic_attack_speed": float(t.basic_attack_speed),
            "base_cost": t.base_cost,
            "max_level": t.max_level,
        }
        for t in rows
    ]


def _load_enemy_types(db: Session) -> list[dict]:
    rows = db.exec(select(EnemyType)).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "life_points": e.life_points,
            "speed": float(e.speed),
            "armor": e.armor,
            "reward_or": e.reward_or,
            "is_boss": e.is_boss,
        }
        for e in rows
    ]


# ---------------------------------------------------------------------------
# Serialisation <-> JSONB
# ---------------------------------------------------------------------------

def _to_dict(gs: GameSession) -> dict:
    return {
        "wave": gs.wave,
        "gold": gs.gold,
        "score": gs.score,
        "lives": gs.lives,
        "is_over": gs.is_over,
        "towers": [
            {
                "tower_type_id": str(t.tower_type_id),
                "tower_name": t.tower_name,
                "x": t.x,
                "y": t.y,
                "damage": t.damage,
                "scope": t.scope,
                "attack_speed": t.attack_speed,
                "level": t.level,
            }
            for t in gs.towers
        ],
        "enemies": [
            {
                "enemy_type_id": str(e.enemy_type_id),
                "enemy_name": e.enemy_name,
                "current_hp": e.current_hp,
                "max_hp": e.max_hp,
                "speed": e.speed,
                "armor": e.armor,
                "reward_or": e.reward_or,
                "is_boss": e.is_boss,
                "alive": e.alive,
            }
            for e in gs.enemies
        ],
        "created_at": gs.created_at,
        "last_income_at": gs.last_income_at,
    }


def _from_dict(
    user_id: UUID,
    data: dict,
    tower_types: list,
    enemy_types: list,
) -> GameSession:
    towers = [
        PlacedTower(
            tower_type_id=UUID(t["tower_type_id"]),
            tower_name=t["tower_name"],
            x=t["x"],
            y=t["y"],
            damage=t["damage"],
            scope=t["scope"],
            attack_speed=t["attack_speed"],
            level=t.get("level", 1),
        )
        for t in data.get("towers", [])
    ]
    enemies = [
        ActiveEnemy(
            enemy_type_id=UUID(e["enemy_type_id"]),
            enemy_name=e["enemy_name"],
            current_hp=e["current_hp"],
            max_hp=e["max_hp"],
            speed=e["speed"],
            armor=e["armor"],
            reward_or=e["reward_or"],
            is_boss=e["is_boss"],
            alive=e.get("alive", True),
        )
        for e in data.get("enemies", [])
    ]
    return GameSession(
        user_id=user_id,
        wave=data.get("wave", 0),
        gold=data.get("gold", STARTING_GOLD),
        score=data.get("score", 0),
        lives=data.get("lives", 1),
        is_over=data.get("is_over", False),
        towers=towers,
        enemies=enemies,
        created_at=data.get("created_at", time.time()),
        last_income_at=data.get("last_income_at", 0.0),
        _tower_types={t["id"]: t for t in tower_types},
        _enemy_types=enemy_types,
        _occupied={(t.x, t.y) for t in towers},
    )


# ---------------------------------------------------------------------------
# Store API — appele depuis service.py
# ---------------------------------------------------------------------------

def get_session(user_id: UUID, db: Session) -> GameSession | None:
    """Charge la session depuis la DB. Retourne None si pas de partie."""
    row = db.exec(
        select(GameSessionRow).where(GameSessionRow.user_id == user_id)
    ).first()
    if row is None:
        return None
    # TTL: supprimer si trop ancienne
    created_at = row.data.get("created_at", 0.0)
    if (time.time() - created_at) > _SESSION_TTL_SECONDS:
        db.delete(row)
        db.commit()
        return None
    tower_types = _load_tower_types(db)
    enemy_types = _load_enemy_types(db)
    return _from_dict(user_id, row.data, tower_types, enemy_types)


def create_session(user_id: UUID, tower_types: list, enemy_types: list, db: Session) -> GameSession:
    """Cree (ou ecrase) la session du joueur."""
    gs = GameSession(
        user_id=user_id,
        _tower_types={t["id"]: t for t in tower_types},
        _enemy_types=enemy_types,
    )
    save_session(gs, db)
    return gs


def save_session(gs: GameSession, db: Session) -> None:
    """Persiste l'etat de la session."""
    row = db.exec(
        select(GameSessionRow).where(GameSessionRow.user_id == gs.user_id)
    ).first()
    payload = _to_dict(gs)
    if row is None:
        row = GameSessionRow(user_id=gs.user_id, data=payload)
        db.add(row)
    else:
        row.data = payload
        row.updated_at = datetime.now(timezone.utc)
    db.commit()


def remove_session(user_id: UUID, db: Session) -> GameSession | None:
    """Supprime la session active si elle existe. Retourne l'ancienne session ou None."""
    gs = get_session(user_id, db)
    if gs is None:
        return None
    row = db.exec(
        select(GameSessionRow).where(GameSessionRow.user_id == user_id)
    ).first()
    if row is not None:
        db.delete(row)
        db.commit()
    return gs
