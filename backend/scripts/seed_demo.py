import argparse
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from owem import db
from owem.db import SessionFactory, engine
from owem.settlement import compute_settlement, settlement_total

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
]

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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()

    if args.reset:
        with engine.begin() as connection:
            connection.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
        print("tables emptied")

    with SessionFactory() as session:
        owner = db.current_user(session)
        event = db.add_event(session, owner, "Dinner at Rosati's", "Logan Square")
        people = {"You": db.add_participant(session, event.id, "You", is_payer=True).id}
        for name in ["Albert", "Manny", "Nia", "Devon"]:
            people[name] = db.add_participant(session, event.id, name).id

        receipt = db.add_receipt(session, event.id)
        for name, price, on in MENU:
            item = db.add_item(
                session,
                receipt.id,
                name.upper(),
                name,
                Decimal(price),
                Decimal(price),
                "USER_CONFIRMED",
            )
            db.replace_assignments(session, item.id, [(people[who], Decimal(1)) for who in on])

        db.update_receipt(
            session,
            receipt.id,
            tax=Decimal("19.11"),
            tip=Decimal("37.28"),
            tax_provenance="USER_CONFIRMED",
        )
        db.recompute_total(session, receipt.id)
        confirmed = db.confirm_receipt(session, receipt.id)

        lines = compute_settlement(
            confirmed,
            db.items(session, receipt.id),
            db.assignments(session, receipt.id),
            list(people.values()),
        )
        settlement = db.add_settlement(session, event.id, 1, settlement_total(lines), None, lines)
        db.set_event_status(session, event.id, "COLLECTING")
        db.add_payment(session, event.id, people["Manny"], Decimal("40.09"), "cashapp", owner)
        db.add_payment(session, event.id, people["Nia"], Decimal("20.00"), "venmo", owner)
        session.commit()

    owed = sum(
        (line.amount_owed for line in settlement.lines if line.participant_id != people["You"]),
        Decimal("0"),
    )
    print(f"seeded '{event.title}' - settlement v{settlement.version}")
    print(f"  total       {settlement.total_amount}")
    print(f"  owed to you {owed}")
    print(f"  still out   {owed - Decimal('60.09')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
