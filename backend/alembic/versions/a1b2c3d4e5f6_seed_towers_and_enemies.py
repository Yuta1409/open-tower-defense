"""seed towers and enemies

Revision ID: a1b2c3d4e5f6
Revises: 770aaf4937d3
Create Date: 2026-04-03 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '770aaf4937d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO tower_type (id, name, description, base_damage, basic_scope, basic_attack_speed, base_cost, max_level, created_at, updated_at)
        VALUES
            (gen_random_uuid(), 'Archer',        'Tour de base, tire des flèches rapides',               20,  2.50, 1.20,  50, 5, now(), now()),
            (gen_random_uuid(), 'Arbalétrier',   'Flèches lourdes, portée accrue',                       35,  3.50, 0.80,  80, 5, now(), now()),
            (gen_random_uuid(), 'Mage',          'Projectiles magiques, ignore une partie de l''armure', 45,  2.00, 0.70, 120, 5, now(), now()),
            (gen_random_uuid(), 'Canon',         'Dégâts élevés, cadence lente',                         80,  2.00, 0.40, 150, 5, now(), now()),
            (gen_random_uuid(), 'Tesla',         'Éclair en chaîne sur plusieurs ennemis',               30,  2.50, 1.00, 130, 5, now(), now()),
            (gen_random_uuid(), 'Sniper',        'Longue portée, dégâts très élevés',                    90,  5.00, 0.30, 180, 5, now(), now()),
            (gen_random_uuid(), 'Lance-flammes', 'Brûle les ennemis à courte portée',                    25,  1.50, 2.00, 100, 5, now(), now()),
            (gen_random_uuid(), 'Catapulte',     'Zone d''impact, frappe plusieurs ennemis',             70,  3.00, 0.35, 200, 5, now(), now()),
            (gen_random_uuid(), 'Tour de Glace', 'Ralentit les ennemis avec le froid',                   15,  2.50, 0.90, 110, 5, now(), now()),
            (gen_random_uuid(), 'Baliste',       'Perfore les ennemis en ligne droite',                  60,  4.00, 0.50, 160, 5, now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)

    op.execute("""
        INSERT INTO enemy_type (id, name, description, life_points, speed, armor, reward_or, is_boss, created_at, updated_at)
        VALUES
            (gen_random_uuid(), 'Gobelin',        'Ennemi rapide mais fragile',                          60,   2.50,  0,   5, false, now(), now()),
            (gen_random_uuid(), 'Squelette',      'Soldat mort-vivant standard',                        100,   1.50,  2,   8, false, now(), now()),
            (gen_random_uuid(), 'Orc',            'Guerrier robuste et lent',                           200,   1.00,  5,  12, false, now(), now()),
            (gen_random_uuid(), 'Loup',           'Très rapide, attaque en meute',                       80,   3.00,  0,   7, false, now(), now()),
            (gen_random_uuid(), 'Bandit',         'Combattant équilibré',                               150,   1.80,  3,  10, false, now(), now()),
            (gen_random_uuid(), 'Elfe Sombre',    'Agile et difficile à toucher',                       120,   2.20,  1,  11, false, now(), now()),
            (gen_random_uuid(), 'Troll',          'Très résistant, se régénère légèrement',             350,   0.80,  8,  20, false, now(), now()),
            (gen_random_uuid(), 'Chevalier Noir', 'Armure lourde, quasi-invulnérable aux flèches',      280,   1.20, 12,  18, false, now(), now()),
            (gen_random_uuid(), 'Ogre',           'Colosse lent aux dégâts massifs',                    500,   0.60, 10,  25, false, now(), now()),
            (gen_random_uuid(), 'Dragon',         'Boss ultime, résistant à tout',                     1500,   1.00, 20, 100, true,  now(), now())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM tower_type WHERE name IN (
            'Archer', 'Arbalétrier', 'Mage', 'Canon', 'Tesla',
            'Sniper', 'Lance-flammes', 'Catapulte', 'Tour de Glace', 'Baliste'
        );
    """)
    op.execute("""
        DELETE FROM enemy_type WHERE name IN (
            'Gobelin', 'Squelette', 'Orc', 'Loup', 'Bandit',
            'Elfe Sombre', 'Troll', 'Chevalier Noir', 'Ogre', 'Dragon'
        );
    """)
