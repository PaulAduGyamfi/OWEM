from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, PlainSerializer
from pydantic.alias_generators import to_camel

Provenance = Literal["AI_SUGGESTED", "USER_CONFIRMED", "SYSTEM_COMPUTED"]
EventStatus = Literal["DRAFT", "COLLECTING", "SETTLED", "CLOSED"]
ReceiptState = Literal["DRAFT", "NEEDS_REVIEW", "CONFIRMED"]
TipPolicy = Literal["PROPORTIONAL", "EQUAL"]
PaymentMethod = Literal["venmo", "cashapp", "zelle", "applecash", "cash", "other"]


def reject_float(value: Any) -> Any:
    if isinstance(value, float):
        raise ValueError('send money as a string, like "16.50"')
    return value


Money = Annotated[
    Decimal,
    BeforeValidator(reject_float),
    Field(ge=0, max_digits=12, decimal_places=2, examples=["16.50"]),
    PlainSerializer(lambda value: f"{value:.2f}", return_type=str),
]

Weight = Annotated[
    Decimal,
    BeforeValidator(reject_float),
    Field(gt=0, max_digits=8, decimal_places=3, examples=["1.000"]),
]


class Model(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Participant(Model):
    id: UUID
    event_id: UUID
    display_name: str
    is_payer: bool


class ReceiptItem(Model):
    id: UUID
    receipt_id: UUID
    line_number: int
    raw_name: str
    normalized_name: str
    quantity: int
    unit_price: Money
    total_price: Money
    provenance: Provenance
    confidence: Decimal | None = None


class Assignment(Model):
    id: UUID
    item_id: UUID
    participant_id: UUID
    weight: Weight


class Receipt(Model):
    id: UUID
    event_id: UUID
    merchant: str | None
    state: ReceiptState
    tax: Money
    tip: Money
    discount: Money
    total: Money
    tip_policy: TipPolicy
    tax_provenance: Provenance


class SettlementLine(Model):
    participant_id: UUID
    items_subtotal: Money
    tax_share: Money
    tip_share: Money
    discount_share: Money
    amount_owed: Money


class Settlement(Model):
    id: UUID
    event_id: UUID
    version: int
    total_amount: Money
    engine_version: str
    reason: str | None
    created_at: datetime
    lines: list[SettlementLine]


class Payment(Model):
    id: UUID
    event_id: UUID
    participant_id: UUID
    amount: Money
    method: PaymentMethod
    recorded_at: datetime


class Event(Model):
    id: UUID
    title: str
    place: str | None
    currency: str
    status: EventStatus
    occurred_at: datetime


class EventDetail(Event):
    participants: list[Participant]
    receipt: Receipt | None
    items: list[ReceiptItem]
    assignments: list[Assignment]
    payments: list[Payment]
    settlement_version: int | None


class Balance(Model):
    participant_id: UUID
    display_name: str
    owed: Money
    paid: Money
    outstanding: Money


class Balances(Model):
    settlement_version: int
    owed_to_payer: Money
    collected: Money
    outstanding: Money
    balances: list[Balance]


class Extraction(Model):
    receipt: Receipt
    items: list[ReceiptItem]
    needs_review: list[int]
    problems: list[str]
    merchant: str | None


class ExtractedLine(Model):
    raw_name: str
    normalized_name: str
    quantity: int
    unit_price: Money
    total_price: Money
    confidence: Decimal


class ExtractedReceipt(Model):
    merchant: str | None
    lines: list[ExtractedLine]
    subtotal: Money
    tax: Money
    tip: Money
    discount: Money
    total: Money
    extraction_confidence: Decimal


class CreateEvent(Model):
    title: str = Field(min_length=1, max_length=200)
    place: str | None = Field(default=None, max_length=200)
    occurred_at: datetime | None = None


class AddParticipant(Model):
    display_name: str = Field(min_length=1, max_length=80)


class AddItem(Model):
    name: str = Field(min_length=1, max_length=200)
    total_price: Money


class UpdateItem(Model):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    total_price: Money | None = None


class SetCharges(Model):
    tax: Money | None = None
    tip: Money | None = None
    discount: Money | None = None
    tip_policy: TipPolicy | None = None


class AssignTo(Model):
    participant_id: UUID
    weight: Weight = Decimal("1.000")


class ReplaceAssignments(Model):
    assignments: list[AssignTo] = Field(min_length=1)


class CreateSettlement(Model):
    reason: str | None = Field(default=None, max_length=280)


class RecordPayment(Model):
    participant_id: UUID
    amount: Money
    method: PaymentMethod
