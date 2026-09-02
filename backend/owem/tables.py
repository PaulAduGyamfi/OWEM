from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)

MONEY = Numeric(12, 2, asdecimal=True)


class Base(DeclarativeBase):
    pass


def pk() -> Mapped[UUID]:
    return mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)


def fk(target: str, ondelete: str = "CASCADE") -> Mapped[UUID]:
    return mapped_column(
        PgUUID(as_uuid=True), ForeignKey(target, ondelete=ondelete), nullable=False
    )


def now_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = pk()
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = now_column()


class EventRow(Base):
    __tablename__ = "group_events"
    id: Mapped[UUID] = pk()
    owner_user_id: Mapped[UUID] = fk("users.id")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    place: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="DRAFT")
    occurred_at: Mapped[datetime] = now_column()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    __table_args__ = (Index("ix_group_events_owner", "owner_user_id"),)


class ParticipantRow(Base):
    __tablename__ = "participants"
    id: Mapped[UUID] = pk()
    event_id: Mapped[UUID] = fk("group_events.id")
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    is_payer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contact_handle: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        UniqueConstraint("event_id", "display_name", name="uq_participant_name_per_event"),
        Index("uq_one_payer_per_event", "event_id", unique=True, postgresql_where=text("is_payer")),
    )


class ReceiptRow(Base):
    __tablename__ = "receipts"
    id: Mapped[UUID] = pk()
    event_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("group_events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    merchant: Mapped[str | None] = mapped_column(Text)
    image_s3_key: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str] = mapped_column(Text, nullable=False, default="DRAFT")
    tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0.00"))
    tip: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0.00"))
    discount: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0.00"))
    tip_policy: Mapped[str] = mapped_column(Text, nullable=False, default="PROPORTIONAL")
    tax_provenance: Mapped[str] = mapped_column(Text, nullable=False, default="SYSTEM_COMPUTED")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    items: Mapped[list["ReceiptItemRow"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )


class ReceiptItemRow(Base):
    __tablename__ = "receipt_items"
    id: Mapped[UUID] = pk()
    receipt_id: Mapped[UUID] = fk("receipts.id")
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_name: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    provenance: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3, asdecimal=True))
    __table_args__ = (
        UniqueConstraint("receipt_id", "line_number", name="uq_line_number_per_receipt"),
        CheckConstraint("quantity >= 1", name="ck_quantity_positive"),
    )


class AssignmentRow(Base):
    __tablename__ = "item_assignments"
    id: Mapped[UUID] = pk()
    item_id: Mapped[UUID] = fk("receipt_items.id")
    participant_id: Mapped[UUID] = fk("participants.id")
    weight: Mapped[Decimal] = mapped_column(
        Numeric(8, 3, asdecimal=True), nullable=False, default=Decimal("1.000")
    )
    provenance: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("item_id", "participant_id", name="uq_one_assignment_per_person_per_item"),
        CheckConstraint("weight > 0", name="ck_weight_positive"),
    )


class SettlementRow(Base):
    __tablename__ = "settlements"
    id: Mapped[UUID] = pk()
    event_id: Mapped[UUID] = fk("group_events.id")
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    engine_version: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = now_column()
    lines: Mapped[list["SettlementLineRow"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
    __table_args__ = (UniqueConstraint("event_id", "version", name="uq_settlement_version"),)


class SettlementLineRow(Base):
    __tablename__ = "settlement_lines"
    id: Mapped[UUID] = pk()
    settlement_id: Mapped[UUID] = fk("settlements.id")
    participant_id: Mapped[UUID] = fk("participants.id")
    items_subtotal: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    tax_share: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    tip_share: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    discount_share: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    amount_owed: Mapped[Decimal] = mapped_column(MONEY, nullable=False)


class PaymentRow(Base):
    __tablename__ = "payments"
    id: Mapped[UUID] = pk()
    event_id: Mapped[UUID] = fk("group_events.id")
    participant_id: Mapped[UUID] = fk("participants.id")
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    external_ref: Mapped[str | None] = mapped_column(Text)
    recorded_at: Mapped[datetime] = now_column()
    recorded_by: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    __table_args__ = (CheckConstraint("amount > 0", name="ck_payment_positive"),)


class AiCallRow(Base):
    __tablename__ = "ai_calls"
    id: Mapped[UUID] = pk()
    event_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("group_events.id", ondelete="SET NULL")
    )
    capability: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_version: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    raw_response: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6, asdecimal=True))
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = now_column()
