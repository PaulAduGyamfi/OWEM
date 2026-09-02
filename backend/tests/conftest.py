from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from owem.api import app
from owem.db import engine
from owem.models import Assignment, Receipt, ReceiptItem
from owem.tables import Base

API = "/api"

TABLES = [
    "settlement_lines",
    "settlements",
    "item_assignments",
    "receipt_items",
    "receipts",
    "payments",
    "participants",
    "group_events",
    "ai_calls",
    "users",
]


def database_is_up() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def database():
    if not database_is_up():
        pytest.skip("no PostgreSQL - run: docker compose up -d db")
    Base.metadata.create_all(engine)


@pytest.fixture
def client(database):
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
    with TestClient(app) as test_client:
        yield test_client


def ok(response, *expected):
    allowed = expected or (200, 201, 204)
    assert response.status_code in allowed, f"{response.status_code}: {response.text}"
    return response.json() if response.content else None


def make_event(client, title="Dinner at Rosati's"):
    return ok(client.post(f"{API}/events", json={"title": title, "place": "Logan Square"}), 201)


def add_people(client, event_id, *names):
    detail = ok(client.get(f"{API}/events/{event_id}"))
    people = {p["displayName"]: p["id"] for p in detail["participants"]}
    for name in names:
        created = ok(
            client.post(f"{API}/events/{event_id}/participants", json={"displayName": name}), 201
        )
        people[name] = created["id"]
    return people


def receipt(**over) -> Receipt:
    fields = dict(
        id=uuid4(),
        event_id=uuid4(),
        merchant="X",
        state="CONFIRMED",
        tax=Decimal("0.00"),
        tip=Decimal("0.00"),
        discount=Decimal("0.00"),
        total=Decimal("0.00"),
        tip_policy="PROPORTIONAL",
        tax_provenance="USER_CONFIRMED",
    )
    fields.update(over)
    return Receipt(**fields)


def item(price, name="Thing", line=1, quantity=1, provenance="USER_CONFIRMED") -> ReceiptItem:
    return ReceiptItem(
        id=uuid4(),
        receipt_id=uuid4(),
        line_number=line,
        raw_name=name.upper(),
        normalized_name=name,
        quantity=quantity,
        unit_price=Decimal(price),
        total_price=Decimal(price),
        provenance=provenance,
    )


def on(target: ReceiptItem, people: list[UUID], weights=None) -> list[Assignment]:
    return [
        Assignment(
            id=uuid4(),
            item_id=target.id,
            participant_id=person,
            weight=weights[i] if weights else Decimal(1),
        )
        for i, person in enumerate(people)
    ]


def owed(lines, participant_id) -> Decimal:
    return next(line.amount_owed for line in lines if line.participant_id == participant_id)
