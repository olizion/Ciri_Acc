"""add periodisering_scanned_at to bilag

Revision ID: a1b2c3d4e5f6
Revises: 451faab39d10
Create Date: 2026-03-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '451faab39d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bilag', sa.Column('periodisering_scanned_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('bilag', 'periodisering_scanned_at')
