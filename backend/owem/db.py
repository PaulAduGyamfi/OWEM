from collections.abc import Iterator
from datetime import UTC, datetime
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
    create_engine,
    delete,
    func,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from owem.config import settings
from owem.models import (
    Assignment,
    Event,
    Participant,
    Payment,
    Receipt,
    ReceiptItem,
    Settlement,
    SettlementLine,
)

MONEY = Numeric(12, 2, asdecimal=True)

engine = create_engine(settings.database_url, echo=settings.sql_echo, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def session_scope() -> Iterator[Session]:
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


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


def current_user(session: Session) -> UUID:
    user = session.scalar(select(UserRow).where(UserRow.email == settings.dev_user_email))
    if user is None:
        user = UserRow(email=settings.dev_user_email, display_name="Payer")
        session.add(user)
        session.flush()
    return user.id


def list_events(session: Session, owner_id: UUID) -> list[Event]:
    rows = session.scalars(
        select(EventRow)
        .where(EventRow.owner_user_id == owner_id)
        .order_by(EventRow.occurred_at.desc())
    ).all()
    return [Event.model_validate(row) for row in rows]


def get_event(session: Session, event_id: UUID) -> Event | None:
    row = session.get(EventRow, event_id)
    return Event.model_validate(row) if row else None


def event_owner(session: Session, event_id: UUID) -> UUID | None:
    row = session.get(EventRow, event_id)
    return row.owner_user_id if row else None


def add_event(session: Session, owner_id: UUID, title: str, place: str | None) -> Event:
    row = EventRow(owner_user_id=owner_id, title=title, place=place)
    session.add(row)
    session.flush()
    return Event.model_validate(row)


def set_event_status(session: Session, event_id: UUID, status: str) -> None:
    row = session.get(EventRow, event_id)
    if row:
        row.status = status
        session.flush()


def participants(session: Session, event_id: UUID) -> list[Participant]:
    rows = session.scalars(
        select(ParticipantRow)
        .where(ParticipantRow.event_id == event_id)
        .order_by(ParticipantRow.is_payer.desc(), ParticipantRow.display_name)
    ).all()
    return [Participant.model_validate(row) for row in rows]


def add_participant(
    session: Session, event_id: UUID, name: str, is_payer: bool = False
) -> Participant:
    row = ParticipantRow(event_id=event_id, display_name=name, is_payer=is_payer)
    session.add(row)
    session.flush()
    return Participant.model_validate(row)


def remove_participant(session: Session, participant_id: UUID) -> None:
    session.execute(delete(ParticipantRow).where(ParticipantRow.id == participant_id))
    session.flush()


def participant_is_assigned(session: Session, participant_id: UUID) -> bool:
    count = session.scalar(
        select(func.count())
        .select_from(AssignmentRow)
        .where(AssignmentRow.participant_id == participant_id)
    )
    return bool(count)


def get_receipt(session: Session, receipt_id: UUID) -> Receipt | None:
    row = session.get(ReceiptRow, receipt_id)
    return Receipt.model_validate(row) if row else None


def receipt_for_event(session: Session, event_id: UUID) -> Receipt | None:
    row = session.scalar(select(ReceiptRow).where(ReceiptRow.event_id == event_id))
    return Receipt.model_validate(row) if row else None


def add_receipt(session: Session, event_id: UUID) -> Receipt:
    row = ReceiptRow(event_id=event_id)
    session.add(row)
    session.flush()
    return Receipt.model_validate(row)


def update_receipt(session: Session, receipt_id: UUID, **fields: object) -> Receipt:
    row = session.get(ReceiptRow, receipt_id)
    if row is None:
        raise LookupError(receipt_id)
    for name, value in fields.items():
        if value is not None:
            setattr(row, name, value)
    session.flush()
    return Receipt.model_validate(row)


def confirm_receipt(session: Session, receipt_id: UUID) -> Receipt:
    row = session.get(ReceiptRow, receipt_id)
    if row is None:
        raise LookupError(receipt_id)
    row.state = "CONFIRMED"
    row.confirmed_at = datetime.now(UTC)
    row.tax_provenance = "USER_CONFIRMED"
    for item in row.items:
        item.provenance = "USER_CONFIRMED"
    session.flush()
    return Receipt.model_validate(row)


def recompute_total(session: Session, receipt_id: UUID) -> Receipt:
    row = session.get(ReceiptRow, receipt_id)
    if row is None:
        raise LookupError(receipt_id)
    subtotal = session.scalar(
        select(func.coalesce(func.sum(ReceiptItemRow.total_price), 0)).where(
            ReceiptItemRow.receipt_id == receipt_id
        )
    )
    row.total = Decimal(subtotal or 0) + row.tax + row.tip - row.discount
    session.flush()
    return Receipt.model_validate(row)


def items(session: Session, receipt_id: UUID) -> list[ReceiptItem]:
    rows = session.scalars(
        select(ReceiptItemRow)
        .where(ReceiptItemRow.receipt_id == receipt_id)
        .order_by(ReceiptItemRow.line_number)
    ).all()
    return [ReceiptItem.model_validate(row) for row in rows]


def get_item(session: Session, item_id: UUID) -> ReceiptItem | None:
    row = session.get(ReceiptItemRow, item_id)
    return ReceiptItem.model_validate(row) if row else None


def add_item(
    session: Session,
    receipt_id: UUID,
    raw_name: str,
    normalized_name: str,
    unit_price: Decimal,
    total_price: Decimal,
    provenance: str,
    quantity: int = 1,
    confidence: Decimal | None = None,
) -> ReceiptItem:
    line_number = session.scalar(
        select(func.coalesce(func.max(ReceiptItemRow.line_number), 0) + 1).where(
            ReceiptItemRow.receipt_id == receipt_id
        )
    )
    row = ReceiptItemRow(
        receipt_id=receipt_id,
        line_number=int(line_number or 1),
        raw_name=raw_name,
        normalized_name=normalized_name,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        provenance=provenance,
        confidence=confidence,
    )
    session.add(row)
    session.flush()
    return ReceiptItem.model_validate(row)


def update_item(
    session: Session, item_id: UUID, name: str | None, total_price: Decimal | None
) -> ReceiptItem:
    row = session.get(ReceiptItemRow, item_id)
    if row is None:
        raise LookupError(item_id)
    if name is not None:
        row.normalized_name = name
    if total_price is not None:
        row.unit_price = total_price
        row.total_price = total_price
    row.provenance = "USER_CONFIRMED"
    session.flush()
    return ReceiptItem.model_validate(row)


def delete_item(session: Session, item_id: UUID) -> None:
    session.execute(delete(ReceiptItemRow).where(ReceiptItemRow.id == item_id))
    session.flush()


def clear_items(session: Session, receipt_id: UUID) -> None:
    session.execute(delete(ReceiptItemRow).where(ReceiptItemRow.receipt_id == receipt_id))
    session.flush()


def assignments(session: Session, receipt_id: UUID) -> list[Assignment]:
    rows = session.scalars(
        select(AssignmentRow)
        .join(ReceiptItemRow, ReceiptItemRow.id == AssignmentRow.item_id)
        .where(ReceiptItemRow.receipt_id == receipt_id)
        .order_by(ReceiptItemRow.line_number, AssignmentRow.id)
    ).all()
    return [Assignment.model_validate(row) for row in rows]


def replace_assignments(
    session: Session, item_id: UUID, on: list[tuple[UUID, Decimal]]
) -> list[Assignment]:
    session.execute(delete(AssignmentRow).where(AssignmentRow.item_id == item_id))
    rows = [
        AssignmentRow(
            item_id=item_id,
            participant_id=participant_id,
            weight=weight,
            provenance="USER_CONFIRMED",
        )
        for participant_id, weight in on
    ]
    session.add_all(rows)
    session.flush()
    return [Assignment.model_validate(row) for row in rows]


def latest_settlement(session: Session, event_id: UUID) -> Settlement | None:
    row = session.scalar(
        select(SettlementRow)
        .where(SettlementRow.event_id == event_id)
        .order_by(SettlementRow.version.desc())
        .limit(1)
    )
    return Settlement.model_validate(row) if row else None


def settlement_history(session: Session, event_id: UUID) -> list[Settlement]:
    rows = session.scalars(
        select(SettlementRow)
        .where(SettlementRow.event_id == event_id)
        .order_by(SettlementRow.version.desc())
    ).all()
    return [Settlement.model_validate(row) for row in rows]


def add_settlement(
    session: Session,
    event_id: UUID,
    version: int,
    total: Decimal,
    reason: str | None,
    lines: list[SettlementLine],
) -> Settlement:
    from owem.settlement import ENGINE_VERSION

    row = SettlementRow(
        event_id=event_id,
        version=version,
        total_amount=total,
        engine_version=ENGINE_VERSION,
        reason=reason,
    )
    row.lines = [SettlementLineRow(**line.model_dump()) for line in lines]
    session.add(row)
    session.flush()
    return Settlement.model_validate(row)


def payments(session: Session, event_id: UUID) -> list[Payment]:
    rows = session.scalars(
        select(PaymentRow).where(PaymentRow.event_id == event_id).order_by(PaymentRow.recorded_at)
    ).all()
    return [Payment.model_validate(row) for row in rows]


def add_payment(
    session: Session, event_id: UUID, participant_id: UUID, amount: Decimal, method: str, by: UUID
) -> Payment:
    row = PaymentRow(
        event_id=event_id,
        participant_id=participant_id,
        amount=amount,
        method=method,
        recorded_by=by,
    )
    session.add(row)
    session.flush()
    return Payment.model_validate(row)


def add_ai_call(session: Session, **fields: object) -> None:
    session.add(AiCallRow(**fields))
    session.flush()
