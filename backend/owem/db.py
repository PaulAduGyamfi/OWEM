from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session, sessionmaker

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
from owem.tables import (
    AiCallRow,
    AssignmentRow,
    EventRow,
    ParticipantRow,
    PaymentRow,
    ReceiptItemRow,
    ReceiptRow,
    SettlementLineRow,
    SettlementRow,
    UserRow,
)

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


def add_event(
    session: Session,
    owner_id: UUID,
    title: str,
    place: str | None,
    occurred_at: datetime | None = None,
) -> Event:
    row = EventRow(owner_user_id=owner_id, title=title, place=place)
    if occurred_at is not None:
        row.occurred_at = occurred_at
    session.add(row)
    session.flush()
    return Event.model_validate(row)


def receipt_image_key(session: Session, event_id: UUID) -> str | None:
    return session.scalar(
        select(ReceiptRow.image_s3_key).where(ReceiptRow.event_id == event_id)
    )


def delete_event(session: Session, event_id: UUID) -> None:
    row = session.get(EventRow, event_id)
    if row:
        session.delete(row)
        session.flush()


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
