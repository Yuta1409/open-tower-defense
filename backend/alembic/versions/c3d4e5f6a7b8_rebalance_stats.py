"""rebalance enemy and tower stats

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-03 18:00:00.000000

Logique de balance :
- HP ennemis / 3 environ : Dragon 1500 → 250 (sinon intuable avec scaling +20%/vague)
- Armure réduite pour que les tours moyennes restent utiles
- Dégâts tours +5 à +10 pour compenser la baisse de HP
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Ennemis ---
    op.execute("""
        UPDATE enemy_type SET life_points = 40,  armor = 0  WHERE name = 'Gobelin';
        UPDATE enemy_type SET life_points = 50,  armor = 0  WHERE name = 'Loup';
        UPDATE enemy_type SET life_points = 70,  armor = 1  WHERE name = 'Squelette';
        UPDATE enemy_type SET life_points = 100, armor = 2  WHERE name = 'Bandit';
        UPDATE enemy_type SET life_points = 80,  armor = 0  WHERE name = 'Elfe Sombre';
        UPDATE enemy_type SET life_points = 140, armor = 4  WHERE name = 'Orc';
        UPDATE enemy_type SET life_points = 200, armor = 6  WHERE name = 'Troll';
        UPDATE enemy_type SET life_points = 160, armor = 10 WHERE name = 'Chevalier Noir';
        UPDATE enemy_type SET life_points = 300, armor = 7  WHERE name = 'Ogre';
        UPDATE enemy_type SET life_points = 250, armor = 15 WHERE name = 'Dragon';
    """)

    # --- Tours : légère hausse des dégâts ---
    op.execute("""
        UPDATE tower_type SET base_damage = 25  WHERE name = 'Archer';
        UPDATE tower_type SET base_damage = 40  WHERE name = 'Arbalétrier';
        UPDATE tower_type SET base_damage = 50  WHERE name = 'Mage';
        UPDATE tower_type SET base_damage = 90  WHERE name = 'Canon';
        UPDATE tower_type SET base_damage = 35  WHERE name = 'Tesla';
        UPDATE tower_type SET base_damage = 100 WHERE name = 'Sniper';
        UPDATE tower_type SET base_damage = 30  WHERE name = 'Lance-flammes';
        UPDATE tower_type SET base_damage = 80  WHERE name = 'Catapulte';
        UPDATE tower_type SET base_damage = 70  WHERE name = 'Baliste';
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE enemy_type SET life_points = 60,   armor = 0  WHERE name = 'Gobelin';
        UPDATE enemy_type SET life_points = 80,   armor = 0  WHERE name = 'Loup';
        UPDATE enemy_type SET life_points = 100,  armor = 2  WHERE name = 'Squelette';
        UPDATE enemy_type SET life_points = 150,  armor = 3  WHERE name = 'Bandit';
        UPDATE enemy_type SET life_points = 120,  armor = 1  WHERE name = 'Elfe Sombre';
        UPDATE enemy_type SET life_points = 200,  armor = 5  WHERE name = 'Orc';
        UPDATE enemy_type SET life_points = 350,  armor = 8  WHERE name = 'Troll';
        UPDATE enemy_type SET life_points = 280,  armor = 12 WHERE name = 'Chevalier Noir';
        UPDATE enemy_type SET life_points = 500,  armor = 10 WHERE name = 'Ogre';
        UPDATE enemy_type SET life_points = 1500, armor = 20 WHERE name = 'Dragon';
    """)

    op.execute("""
        UPDATE tower_type SET base_damage = 20 WHERE name = 'Archer';
        UPDATE tower_type SET base_damage = 35 WHERE name = 'Arbalétrier';
        UPDATE tower_type SET base_damage = 45 WHERE name = 'Mage';
        UPDATE tower_type SET base_damage = 80 WHERE name = 'Canon';
        UPDATE tower_type SET base_damage = 30 WHERE name = 'Tesla';
        UPDATE tower_type SET base_damage = 90 WHERE name = 'Sniper';
        UPDATE tower_type SET base_damage = 25 WHERE name = 'Lance-flammes';
        UPDATE tower_type SET base_damage = 70 WHERE name = 'Catapulte';
        UPDATE tower_type SET base_damage = 60 WHERE name = 'Baliste';
    """)
