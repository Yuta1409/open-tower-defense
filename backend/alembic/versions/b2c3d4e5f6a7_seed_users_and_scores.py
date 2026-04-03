"""seed users and scores

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-03 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mot de passe : password123
PW_HASH = '$2b$12$hr/xl3eJfXvWLITVaJzJzONtodGeXewB3R1VEHsVeKhOVk0Z7/Rz.'


def upgrade() -> None:
    # --- Utilisateurs ---
    op.execute(f"""
        INSERT INTO users (id, pseudo, password_hash, created_at, updated_at)
        VALUES
            ('11111111-0000-0000-0000-000000000001', 'DragonSlayer',  '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000002', 'TowerMaster',   '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000003', 'GoblinHunter',  '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000004', 'IronArcher',    '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000005', 'FrostMage',     '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000006', 'ShadowBlade',   '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000007', 'StormCaller',   '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000008', 'LegendaryMage', '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000009', 'OrcSlayer99',   '{PW_HASH}', now(), now()),
            ('11111111-0000-0000-0000-000000000010', 'BattleKnight',  '{PW_HASH}', now(), now())
        ON CONFLICT (pseudo) DO NOTHING;
    """)

    # --- Scores ---
    op.execute("""
        INSERT INTO game_score (id, id_user, score, wave_reached, play_at)
        VALUES
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', 48500, 22, now() - interval '1 day'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', 35200, 16, now() - interval '3 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', 61200, 27, now() - interval '2 hours'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', 42000, 19, now() - interval '5 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', 29800, 13, now() - interval '6 hours'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', 18500, 8,  now() - interval '2 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', 54700, 24, now() - interval '12 hours'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', 37100, 17, now() - interval '4 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', 71500, 31, now() - interval '30 minutes'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', 58900, 26, now() - interval '1 day'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000006', 22300, 10, now() - interval '8 hours'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000007', 88200, 38, now() - interval '45 minutes'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000007', 65400, 29, now() - interval '3 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000008', 95600, 42, now() - interval '1 hour'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000009', 31400, 14, now() - interval '7 hours'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000010', 44800, 20, now() - interval '2 days'),
            (gen_random_uuid(), '11111111-0000-0000-0000-000000000010', 28600, 12, now() - interval '6 days')
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM game_score
        WHERE id_user IN (
            SELECT id FROM users
            WHERE pseudo IN (
                'DragonSlayer','TowerMaster','GoblinHunter','IronArcher','FrostMage',
                'ShadowBlade','StormCaller','LegendaryMage','OrcSlayer99','BattleKnight'
            )
        );
    """)
    op.execute("""
        DELETE FROM users
        WHERE pseudo IN (
            'DragonSlayer','TowerMaster','GoblinHunter','IronArcher','FrostMage',
            'ShadowBlade','StormCaller','LegendaryMage','OrcSlayer99','BattleKnight'
        );
    """)
