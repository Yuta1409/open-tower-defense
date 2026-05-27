"""enable RLS on public tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-25 17:30:00.000000

Active Row Level Security sur toutes les tables exposees via PostgREST.
Le backend se connecte en superuser donc RLS le bypass ; les acces via l'API
publique Supabase seront bloques par defaut (aucune policy = deny all).
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ['tower_type', 'enemy_type', 'game_score', 'refresh_token', 'users']


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;')


def downgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;')
