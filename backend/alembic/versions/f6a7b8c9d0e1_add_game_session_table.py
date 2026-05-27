"""add game_session table for persistent session state

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-27 14:00:00.000000

Stockage persistant des sessions de jeu (JSONB) pour eviter la perte
d'etat entre replicas en production.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'game_session',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['user_id'], ['users.id'],
            onupdate='CASCADE', ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('user_id'),
    )
    op.execute('ALTER TABLE public.game_session ENABLE ROW LEVEL SECURITY;')


def downgrade() -> None:
    op.drop_table('game_session')
