"""SQLAlchemy 2.0 database entities with full Mapped type annotations."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db import Base


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class NodeEntity(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    domain: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    summary_short: Mapped[str] = mapped_column(String(250), nullable=False)
    wiki_title: Mapped[str | None] = mapped_column(String(250), nullable=True)
    wiki_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    wiki_extract: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_wildcard: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)


class NodeExplanationEntity(Base):
    __tablename__ = "node_explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    node_id: Mapped[str] = mapped_column(String(64), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    depth_level: Mapped[str] = mapped_column(String(32), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    next_question: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)

    __table_args__ = (
        UniqueConstraint("node_id", "depth_level", name="uq_node_depth"),
    )


class EdgeEntity(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(64), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type: Mapped[str] = mapped_column(String(32), nullable=False)
    why: Mapped[str] = mapped_column(String(300), nullable=False)
    surprise_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)

    __table_args__ = (
        Index("idx_edges_source_target", "source_id", "target_id"),
    )


class UserNodeEntity(Base):
    __tablename__ = "user_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(64), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    explored_at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)
    depth_level: Mapped[str] = mapped_column(String(32), default="simple", nullable=False)
    starred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("device_id", "node_id", name="uq_user_node"),
    )


class UserTrailEntity(Base):
    __tablename__ = "user_trails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    step: Mapped[int] = mapped_column(Integer, nullable=False)
    node_id: Mapped[str] = mapped_column(String(64), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    from_node_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    via: Mapped[str] = mapped_column(String(32), default="explore", nullable=False)
    at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)

    __table_args__ = (
        Index("idx_trail_device_step", "device_id", "step"),
    )


class LLMCacheEntity(Base):
    __tablename__ = "llm_cache"

    key: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)  # sha256 hex
    response_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), default=utc_now_iso, nullable=False)
