import io
import struct
import zlib
from decimal import Decimal

import pytest

from tests.conftest import API, add_people, make_event, ok

pytestmark = pytest.mark.db

MENU = [
    ("Margherita Pizza", "18.00", ["Manny"]),
    ("Chicken Wings", "16.50", ["You", "Albert", "Devon"]),
    ("Caesar Salad", "12.00", ["Nia"]),
    ("Rigatoni Vodka", "22.00", ["Albert"]),
    ("Chicken Parm", "24.00", ["You"]),
    ("Calamari", "15.00", ["You", "Albert", "Manny", "Nia", "Devon"]),
    ("Garlic Knots", "8.50", ["You", "Albert", "Manny", "Nia", "Devon"]),
    ("Margarita", "26.00", ["Albert", "Devon"]),
    ("Peroni", "21.00", ["You", "Manny", "Devon"]),
    ("Tiramisu", "11.00", ["Nia", "Devon"]),
    ("Espresso", "7.00", ["Nia", "Devon"]),
    ("Sparkling water", "5.40", ["You", "Albert", "Manny", "Nia", "Devon"]),
]


def png_bytes() -> bytes:
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00"))
        + chunk(b"IEND", b"")
    )


def upload(client, event_id, data=None, name="receipt.png"):
    payload = png_bytes() if data is None else data
    return client.post(
        f"{API}/events/{event_id}/receipts/extract",
        files={"photo": (name, io.BytesIO(payload), "image/png")},
    )


def build_dinner(client):
    event = make_event(client)
    people = add_people(client, event["id"], "Albert", "Manny", "Nia", "Devon")
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)

    for name, price, on in MENU:
        item = ok(
            client.post(
                f"{API}/receipts/{receipt['id']}/items", json={"name": name, "totalPrice": price}
            ),
            201,
        )
        ok(
            client.put(
                f"{API}/items/{item['id']}/assignments",
                json={"assignments": [{"participantId": people[who]} for who in on]},
            )
        )

    ok(
        client.patch(
            f"{API}/receipts/{receipt['id']}",
            json={"tax": "19.11", "tip": "37.28", "tipPolicy": "PROPORTIONAL"},
        )
    )
    ok(client.post(f"{API}/receipts/{receipt['id']}/confirm"))
    return event["id"], people


def test_creating_an_event_puts_the_payer_on_it(client):
    event = make_event(client)
    detail = ok(client.get(f"{API}/events/{event['id']}"))
    assert detail["status"] == "DRAFT"
    assert [p["isPayer"] for p in detail["participants"]] == [True]


def test_an_unknown_event_is_a_404_in_the_house_error_shape(client):
    response = client.get(f"{API}/events/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    body = response.json()["error"]
    assert body["code"] == "NOT_FOUND"
    assert "message" in body and "details" in body


def test_a_duplicate_name_is_refused(client):
    event = make_event(client)
    add_people(client, event["id"], "Albert")
    response = client.post(
        f"{API}/events/{event['id']}/participants", json={"displayName": "albert"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_PARTICIPANT"


def test_a_participant_with_nothing_on_them_can_be_removed(client):
    event = make_event(client)
    people = add_people(client, event["id"], "Albert")
    ok(client.delete(f"{API}/events/{event['id']}/participants/{people['Albert']}"), 204)
    detail = ok(client.get(f"{API}/events/{event['id']}"))
    assert "Albert" not in [p["displayName"] for p in detail["participants"]]


def test_the_payer_cannot_be_removed(client):
    event = make_event(client)
    people = add_people(client, event["id"])
    response = client.delete(f"{API}/events/{event['id']}/participants/{people['You']}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PAYER_REQUIRED"


def test_a_nameless_participant_is_rejected(client):
    event = make_event(client)
    response = client.post(f"{API}/events/{event['id']}/participants", json={"displayName": ""})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_money_is_sent_as_a_string_and_comes_back_as_one(client):
    event = make_event(client)
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    item = ok(
        client.post(
            f"{API}/receipts/{receipt['id']}/items", json={"name": "Water", "totalPrice": "5"}
        ),
        201,
    )
    assert item["totalPrice"] == "5.00"


def test_a_float_is_refused_rather_than_mangled(client):
    event = make_event(client)
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    response = client.post(
        f"{API}/receipts/{receipt['id']}/items",
        content=b'{"name": "Wings", "totalPrice": 16.50}',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 400
    assert "string" in response.text


def test_a_third_decimal_place_is_refused(client):
    event = make_event(client)
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    response = client.post(
        f"{API}/receipts/{receipt['id']}/items", json={"name": "Odd", "totalPrice": "10.005"}
    )
    assert response.status_code == 400


def test_the_dinner_settles_to_the_amounts_the_app_shows(client):
    event_id, people = build_dinner(client)
    settlement = ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    owed = {
        name: Decimal(
            next(line["amountOwed"] for line in settlement["lines"] if line["participantId"] == pid)
        )
        for name, pid in people.items()
    }
    assert owed["You"] == Decimal("55.07")
    assert owed["Albert"] == Decimal("60.28")
    assert owed["Manny"] == Decimal("40.09")
    assert owed["Nia"] == Decimal("34.88")
    assert owed["Devon"] == Decimal("52.47")
    assert Decimal(settlement["totalAmount"]) == Decimal("242.79")
    assert sum(owed.values()) == Decimal("242.79")


def test_tax_and_tip_follow_what_each_person_ordered(client):
    event_id, people = build_dinner(client)
    settlement = ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    albert = next(line for line in settlement["lines"] if line["participantId"] == people["Albert"])
    assert Decimal(albert["itemsSubtotal"]) == Decimal("46.28")
    assert Decimal(albert["taxShare"]) == Decimal("4.74")
    assert Decimal(albert["tipShare"]) == Decimal("9.26")


def test_an_unconfirmed_receipt_will_not_settle(client):
    event = make_event(client)
    people = add_people(client, event["id"], "Albert")
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    item = ok(
        client.post(
            f"{API}/receipts/{receipt['id']}/items", json={"name": "Wings", "totalPrice": "10.00"}
        ),
        201,
    )
    ok(
        client.put(
            f"{API}/items/{item['id']}/assignments",
            json={"assignments": [{"participantId": people["Albert"]}]},
        )
    )
    response = client.post(f"{API}/events/{event['id']}/settlement", json={})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "RECEIPT_NOT_CONFIRMED"


def test_an_unassigned_line_stops_the_settlement_with_the_ids(client):
    event = make_event(client)
    add_people(client, event["id"], "Albert")
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    ok(
        client.post(
            f"{API}/receipts/{receipt['id']}/items", json={"name": "Orphan", "totalPrice": "9.99"}
        ),
        201,
    )
    ok(client.post(f"{API}/receipts/{receipt['id']}/confirm"))
    response = client.post(f"{API}/events/{event['id']}/settlement", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNASSIGNED_ITEMS"
    assert len(response.json()["error"]["details"]["itemIds"]) == 1


def test_a_confirmed_receipt_cannot_be_edited(client):
    event_id, _ = build_dinner(client)
    detail = ok(client.get(f"{API}/events/{event_id}"))
    response = client.patch(
        f"{API}/receipts/{detail['receipt']['id']}/items/{detail['items'][0]['id']}",
        json={"totalPrice": "1.00"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "RECEIPT_CONFIRMED"


def test_an_item_needs_somebody_on_it(client):
    event = make_event(client)
    receipt = ok(client.post(f"{API}/events/{event['id']}/receipts"), 201)
    item = ok(
        client.post(
            f"{API}/receipts/{receipt['id']}/items", json={"name": "Thing", "totalPrice": "1.00"}
        ),
        201,
    )
    response = client.put(f"{API}/items/{item['id']}/assignments", json={"assignments": []})
    assert response.status_code == 400


def test_a_correction_writes_a_new_version_and_leaves_the_old_one_alone(client):
    event_id, people = build_dinner(client)
    first = ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)

    detail = ok(client.get(f"{API}/events/{event_id}"))
    wings = next(i for i in detail["items"] if i["normalizedName"] == "Chicken Wings")
    ok(
        client.put(
            f"{API}/items/{wings['id']}/assignments",
            json={
                "assignments": [
                    {"participantId": people["You"]},
                    {"participantId": people["Albert"]},
                ]
            },
        )
    )
    second = ok(
        client.post(
            f"{API}/events/{event_id}/settlement", json={"reason": "Devon came off the wings"}
        ),
        201,
    )

    assert second["version"] == 2
    assert second["id"] != first["id"]
    assert Decimal(second["totalAmount"]) == Decimal(first["totalAmount"])

    before = {line["participantId"]: Decimal(line["amountOwed"]) for line in first["lines"]}
    after = {line["participantId"]: Decimal(line["amountOwed"]) for line in second["lines"]}
    assert sum(after[pid] - before[pid] for pid in after) == Decimal("0.00")
    assert after[people["Devon"]] < before[people["Devon"]]
    assert ok(client.get(f"{API}/events/{event_id}/settlement"))["version"] == 2


def test_a_part_payment_leaves_exactly_the_remainder(client):
    event_id, people = build_dinner(client)
    ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    ok(
        client.post(
            f"{API}/events/{event_id}/payments",
            json={"participantId": people["Nia"], "amount": "20.00", "method": "venmo"},
        ),
        201,
    )
    balances = ok(client.get(f"{API}/events/{event_id}/balances"))
    nia = next(b for b in balances["balances"] if b["participantId"] == people["Nia"])
    assert Decimal(nia["outstanding"]) == Decimal("14.88")


def test_the_payer_is_not_asked_to_pay_themselves(client):
    event_id, people = build_dinner(client)
    ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    balances = ok(client.get(f"{API}/events/{event_id}/balances"))
    assert people["You"] not in [b["participantId"] for b in balances["balances"]]
    assert Decimal(balances["owedToPayer"]) == Decimal("187.72")


def test_one_persons_overpayment_cannot_cancel_anothers_debt(client):
    event_id, people = build_dinner(client)
    ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    ok(
        client.post(
            f"{API}/events/{event_id}/payments",
            json={"participantId": people["Albert"], "amount": "187.72", "method": "venmo"},
        ),
        201,
    )
    balances = ok(client.get(f"{API}/events/{event_id}/balances"))
    albert = next(b for b in balances["balances"] if b["participantId"] == people["Albert"])
    assert Decimal(albert["outstanding"]) == Decimal("0.00")
    assert Decimal(balances["outstanding"]) == Decimal("127.44")
    assert ok(client.get(f"{API}/events/{event_id}"))["status"] != "SETTLED"


def test_paying_everyone_settles_the_event(client):
    event_id, people = build_dinner(client)
    settlement = ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    for line in settlement["lines"]:
        if line["participantId"] == people["You"]:
            continue
        ok(
            client.post(
                f"{API}/events/{event_id}/payments",
                json={
                    "participantId": line["participantId"],
                    "amount": line["amountOwed"],
                    "method": "cash",
                },
            ),
            201,
        )
    assert Decimal(ok(client.get(f"{API}/events/{event_id}/balances"))["outstanding"]) == 0
    assert ok(client.get(f"{API}/events/{event_id}"))["status"] == "SETTLED"


def test_a_zero_payment_is_refused(client):
    event_id, people = build_dinner(client)
    ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)
    response = client.post(
        f"{API}/events/{event_id}/payments",
        json={"participantId": people["Nia"], "amount": "0.00", "method": "cash"},
    )
    assert response.status_code in (400, 409)


def test_an_event_can_be_created_on_a_chosen_date(client):
    event = ok(
        client.post(
            f"{API}/events",
            json={"title": "Last Friday", "place": None, "occurredAt": "2026-08-28T19:30:00Z"},
        ),
        201,
    )
    assert event["occurredAt"].startswith("2026-08-28T19:30:00")


def test_an_event_without_a_date_gets_today(client):
    event = make_event(client)
    assert event["occurredAt"] is not None


def test_deleting_an_event_takes_its_settlement_with_it(client):
    event_id, _ = build_dinner(client)
    ok(client.post(f"{API}/events/{event_id}/settlement", json={}), 201)

    ok(client.delete(f"{API}/events/{event_id}"), 204)

    assert client.get(f"{API}/events/{event_id}").status_code == 404
    assert client.get(f"{API}/events/{event_id}/settlement").status_code == 404
    assert all(e["id"] != event_id for e in ok(client.get(f"{API}/events")))


def test_deleting_an_event_leaves_the_others_alone(client):
    keep = make_event(client, title="Keep me")
    drop = make_event(client, title="Drop me")

    ok(client.delete(f"{API}/events/{drop['id']}"), 204)

    remaining = [e["id"] for e in ok(client.get(f"{API}/events"))]
    assert keep["id"] in remaining
    assert drop["id"] not in remaining


def test_deleting_an_event_twice_is_a_404(client):
    event = make_event(client)
    ok(client.delete(f"{API}/events/{event['id']}"), 204)
    assert client.delete(f"{API}/events/{event['id']}").status_code == 404
