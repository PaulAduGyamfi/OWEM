from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, File, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from owem import ai, db, storage
from owem.config import settings
from owem.errors import OwemError, conflict, forbidden, not_found
from owem.models import (
    AddItem,
    AddParticipant,
    Balance,
    Balances,
    CreateEvent,
    CreateSettlement,
    Event,
    EventDetail,
    Extraction,
    Participant,
    Payment,
    Receipt,
    ReceiptItem,
    RecordPayment,
    ReplaceAssignments,
    SetCharges,
    Settlement,
    UpdateItem,
)
from owem.settlement import compute_settlement, settlement_total
from owem.storage import MAX_BYTES

app = FastAPI(title="OWEM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

Db = Annotated[Session, Depends(db.session_scope)]


def user_id(session: Db) -> UUID:
    return db.current_user(session)


User = Annotated[UUID, Depends(user_id)]


@app.exception_handler(OwemError)
def handle_owem_error(request: Request, error: OwemError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
                "traceId": request.headers.get("x-request-id", ""),
            }
        },
    )


@app.exception_handler(RequestValidationError)
def handle_validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
    fields = [
        {
            "field": ".".join(str(part) for part in item["loc"] if part != "body") or "body",
            "problem": item["msg"],
        }
        for item in error.errors()
    ]
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "INVALID_REQUEST",
                "message": "The request body is not valid.",
                "details": {"errors": fields},
                "traceId": request.headers.get("x-request-id", ""),
            }
        },
    )


def owned_event(session: Session, event_id: UUID, owner_id: UUID) -> Event:
    event = db.get_event(session, event_id)
    if event is None:
        raise not_found("event", event_id)
    if db.event_owner(session, event_id) != owner_id:
        raise forbidden()
    return event


def owned_receipt(session: Session, receipt_id: UUID, owner_id: UUID) -> Receipt:
    receipt = db.get_receipt(session, receipt_id)
    if receipt is None:
        raise not_found("receipt", receipt_id)
    owned_event(session, receipt.event_id, owner_id)
    return receipt


def editable_receipt(session: Session, receipt_id: UUID, owner_id: UUID) -> Receipt:
    receipt = owned_receipt(session, receipt_id, owner_id)
    if receipt.state == "CONFIRMED":
        raise conflict(
            "RECEIPT_CONFIRMED",
            "This receipt is confirmed. Changing it would change what people were told.",
        )
    return receipt


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(body: CreateEvent, session: Db, owner: User) -> Event:
    event = db.add_event(session, owner, body.title.strip(), body.place)
    db.add_participant(session, event.id, "You", is_payer=True)
    return event


@app.get("/api/events")
def list_events(session: Db, owner: User) -> list[Event]:
    return db.list_events(session, owner)


@app.get("/api/events/{event_id}")
def get_event(event_id: UUID, session: Db, owner: User) -> EventDetail:
    event = owned_event(session, event_id, owner)
    receipt = db.receipt_for_event(session, event_id)
    settlement = db.latest_settlement(session, event_id)
    return EventDetail(
        **event.model_dump(),
        participants=db.participants(session, event_id),
        receipt=receipt,
        items=db.items(session, receipt.id) if receipt else [],
        assignments=db.assignments(session, receipt.id) if receipt else [],
        payments=db.payments(session, event_id),
        settlement_version=settlement.version if settlement else None,
    )


@app.post("/api/events/{event_id}/participants", status_code=status.HTTP_201_CREATED)
def add_participant(event_id: UUID, body: AddParticipant, session: Db, owner: User) -> Participant:
    owned_event(session, event_id, owner)
    name = body.display_name.strip()
    existing = db.participants(session, event_id)
    if any(person.display_name.casefold() == name.casefold() for person in existing):
        raise conflict("DUPLICATE_PARTICIPANT", f"{name} is already at this table.")
    return db.add_participant(session, event_id, name)


@app.delete("/api/events/{event_id}/participants/{participant_id}", status_code=204)
def remove_participant(event_id: UUID, participant_id: UUID, session: Db, owner: User) -> None:
    owned_event(session, event_id, owner)
    people = {person.id: person for person in db.participants(session, event_id)}
    person = people.get(participant_id)
    if person is None:
        raise not_found("participant", participant_id)
    if person.is_payer:
        raise conflict("PAYER_REQUIRED", "The payer cannot be removed.")
    if db.participant_is_assigned(session, participant_id):
        raise conflict(
            "PARTICIPANT_ASSIGNED",
            f"{person.display_name} is on at least one item. Take them off it first.",
        )
    db.remove_participant(session, participant_id)


@app.post("/api/events/{event_id}/receipts", status_code=status.HTTP_201_CREATED)
def create_receipt(event_id: UUID, session: Db, owner: User) -> Receipt:
    owned_event(session, event_id, owner)
    return db.receipt_for_event(session, event_id) or db.add_receipt(session, event_id)


@app.post("/api/events/{event_id}/receipts/extract", status_code=status.HTTP_201_CREATED)
def extract_receipt(
    event_id: UUID,
    session: Db,
    owner: User,
    photo: Annotated[UploadFile, File(description="JPEG or PNG, up to 10MB")],
) -> Extraction:
    owned_event(session, event_id, owner)
    image = photo.file.read(MAX_BYTES + 1)
    kind = storage.media_type(image)

    receipt = db.receipt_for_event(session, event_id) or db.add_receipt(session, event_id)
    if receipt.state == "CONFIRMED":
        raise conflict(
            "RECEIPT_CONFIRMED",
            "This receipt is confirmed. Re-reading it would change what people were told.",
        )

    db.update_receipt(session, receipt.id, image_s3_key=storage.save(image, kind))
    extracted, call = ai.read_receipt(image, kind)
    db.add_ai_call(session, event_id=event_id, **call)

    db.clear_items(session, receipt.id)
    written = [
        db.add_item(
            session,
            receipt.id,
            line.raw_name,
            line.normalized_name,
            line.unit_price,
            line.total_price,
            "AI_SUGGESTED",
            quantity=line.quantity,
            confidence=line.confidence,
        )
        for line in extracted.lines
    ]

    db.update_receipt(
        session,
        receipt.id,
        tax=extracted.tax,
        tip=extracted.tip,
        discount=extracted.discount,
        merchant=extracted.merchant,
        state="NEEDS_REVIEW",
        tax_provenance="AI_SUGGESTED",
    )
    updated = db.recompute_total(session, receipt.id)
    flagged = set(ai.low_confidence_lines(extracted))

    return Extraction(
        receipt=updated,
        items=written,
        needs_review=[item.line_number for i, item in enumerate(written) if i in flagged],
        problems=ai.extraction_problems(extracted),
        merchant=extracted.merchant,
    )


@app.post("/api/receipts/{receipt_id}/items", status_code=status.HTTP_201_CREATED)
def add_item(receipt_id: UUID, body: AddItem, session: Db, owner: User) -> ReceiptItem:
    editable_receipt(session, receipt_id, owner)
    name = body.name.strip()
    item = db.add_item(
        session,
        receipt_id,
        name.upper(),
        name,
        body.total_price,
        body.total_price,
        "USER_CONFIRMED",
    )
    db.recompute_total(session, receipt_id)
    return item


@app.patch("/api/receipts/{receipt_id}/items/{item_id}")
def update_item(
    receipt_id: UUID, item_id: UUID, body: UpdateItem, session: Db, owner: User
) -> ReceiptItem:
    editable_receipt(session, receipt_id, owner)
    if db.get_item(session, item_id) is None:
        raise not_found("item", item_id)
    item = db.update_item(session, item_id, body.name, body.total_price)
    db.recompute_total(session, receipt_id)
    return item


@app.delete("/api/receipts/{receipt_id}/items/{item_id}", status_code=204)
def delete_item(receipt_id: UUID, item_id: UUID, session: Db, owner: User) -> None:
    editable_receipt(session, receipt_id, owner)
    if db.get_item(session, item_id) is None:
        raise not_found("item", item_id)
    db.delete_item(session, item_id)
    db.recompute_total(session, receipt_id)


@app.patch("/api/receipts/{receipt_id}")
def set_charges(receipt_id: UUID, body: SetCharges, session: Db, owner: User) -> Receipt:
    editable_receipt(session, receipt_id, owner)
    db.update_receipt(
        session,
        receipt_id,
        tax=body.tax,
        tip=body.tip,
        discount=body.discount,
        tip_policy=body.tip_policy,
        tax_provenance="USER_CONFIRMED" if body.tax is not None else None,
    )
    return db.recompute_total(session, receipt_id)


@app.post("/api/receipts/{receipt_id}/confirm")
def confirm_receipt(receipt_id: UUID, session: Db, owner: User) -> Receipt:
    owned_receipt(session, receipt_id, owner)
    if not db.items(session, receipt_id):
        raise conflict("NO_ITEMS", "A receipt with no lines cannot be confirmed.")
    return db.confirm_receipt(session, receipt_id)


@app.put("/api/items/{item_id}/assignments")
def replace_assignments(
    item_id: UUID, body: ReplaceAssignments, session: Db, owner: User
) -> list[dict[str, str]]:
    item = db.get_item(session, item_id)
    if item is None:
        raise not_found("item", item_id)
    receipt = owned_receipt(session, item.receipt_id, owner)
    known = {person.id for person in db.participants(session, receipt.event_id)}
    for entry in body.assignments:
        if entry.participant_id not in known:
            raise not_found("participant", entry.participant_id)

    saved = db.replace_assignments(
        session, item_id, [(entry.participant_id, entry.weight) for entry in body.assignments]
    )
    return [{"participantId": str(a.participant_id), "weight": str(a.weight)} for a in saved]


@app.post("/api/events/{event_id}/settlement", status_code=status.HTTP_201_CREATED)
def create_settlement(
    event_id: UUID, body: CreateSettlement, session: Db, owner: User
) -> Settlement:
    owned_event(session, event_id, owner)
    receipt = db.receipt_for_event(session, event_id)
    if receipt is None:
        raise not_found("receipt for event", event_id)
    if receipt.state != "CONFIRMED":
        raise conflict(
            "RECEIPT_NOT_CONFIRMED", "Confirm the receipt before working out the balances."
        )

    people = db.participants(session, event_id)
    if not people:
        raise conflict("NO_PARTICIPANTS", "Nobody is at this table.")

    lines = compute_settlement(
        receipt,
        db.items(session, receipt.id),
        db.assignments(session, receipt.id),
        [person.id for person in people],
    )
    previous = db.latest_settlement(session, event_id)
    settlement = db.add_settlement(
        session,
        event_id,
        previous.version + 1 if previous else 1,
        settlement_total(lines),
        body.reason,
        lines,
    )
    db.set_event_status(session, event_id, "COLLECTING")
    return settlement


@app.get("/api/events/{event_id}/settlement")
def get_settlement(event_id: UUID, session: Db, owner: User) -> Settlement:
    owned_event(session, event_id, owner)
    settlement = db.latest_settlement(session, event_id)
    if settlement is None:
        raise not_found("settlement for event", event_id)
    return settlement


@app.get("/api/events/{event_id}/settlements")
def list_settlements(event_id: UUID, session: Db, owner: User) -> list[Settlement]:
    owned_event(session, event_id, owner)
    return db.settlement_history(session, event_id)


@app.get("/api/events/{event_id}/balances")
def get_balances(event_id: UUID, session: Db, owner: User) -> Balances:
    owned_event(session, event_id, owner)
    settlement = db.latest_settlement(session, event_id)
    if settlement is None:
        raise not_found("settlement for event", event_id)
    return balances_for(session, event_id, settlement)


def balances_for(session: Session, event_id: UUID, settlement: Settlement) -> Balances:
    people = {person.id: person for person in db.participants(session, event_id)}
    payer = next((person.id for person in people.values() if person.is_payer), None)

    paid: dict[UUID, Decimal] = {}
    for payment in db.payments(session, event_id):
        paid[payment.participant_id] = (
            paid.get(payment.participant_id, Decimal("0")) + payment.amount
        )

    rows = []
    for line in settlement.lines:
        person = people.get(line.participant_id)
        if person is None or person.id == payer:
            continue
        settled = paid.get(line.participant_id, Decimal("0"))
        rows.append(
            Balance(
                participant_id=person.id,
                display_name=person.display_name,
                owed=line.amount_owed,
                paid=settled,
                outstanding=max(Decimal("0"), line.amount_owed - settled),
            )
        )

    return Balances(
        settlement_version=settlement.version,
        owed_to_payer=sum((row.owed for row in rows), Decimal("0.00")),
        collected=sum((row.paid for row in rows), Decimal("0.00")),
        outstanding=sum((row.outstanding for row in rows), Decimal("0.00")),
        balances=rows,
    )


@app.post("/api/events/{event_id}/payments", status_code=status.HTTP_201_CREATED)
def record_payment(event_id: UUID, body: RecordPayment, session: Db, owner: User) -> Payment:
    owned_event(session, event_id, owner)
    if body.amount <= 0:
        raise conflict("INVALID_AMOUNT", "A payment must be greater than zero.")

    people = {person.id: person for person in db.participants(session, event_id)}
    person = people.get(body.participant_id)
    if person is None:
        raise not_found("participant", body.participant_id)
    if person.is_payer:
        raise conflict("PAYER_CANNOT_PAY", "The payer does not pay themselves.")

    payment = db.add_payment(
        session, event_id, body.participant_id, body.amount, body.method, owner
    )
    settlement = db.latest_settlement(session, event_id)
    if settlement and balances_for(session, event_id, settlement).outstanding == 0:
        db.set_event_status(session, event_id, "SETTLED")
    return payment
