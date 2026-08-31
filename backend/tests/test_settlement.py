from decimal import Decimal
from uuid import uuid4

import pytest

from owem.errors import OwemError
from owem.settlement import compute_settlement, settlement_total
from tests.conftest import item, on, owed, receipt


def test_an_ai_suggested_line_cannot_reach_the_engine():
    paul = uuid4()
    line = item("10.00", provenance="AI_SUGGESTED")
    with pytest.raises(OwemError) as caught:
        compute_settlement(receipt(total=Decimal("10.00")), [line], on(line, [paul]), [paul])
    assert caught.value.code == "UNCONFIRMED_INPUT"


def test_an_ai_suggested_tax_cannot_reach_the_engine_either():
    paul = uuid4()
    line = item("10.00")
    charges = receipt(tax=Decimal("1.00"), total=Decimal("11.00"), tax_provenance="AI_SUGGESTED")
    with pytest.raises(OwemError) as caught:
        compute_settlement(charges, [line], on(line, [paul]), [paul])
    assert caught.value.details["fields"] == ["tax"]


def test_system_computed_values_are_welcome():
    paul = uuid4()
    line = item("10.00", provenance="SYSTEM_COMPUTED")
    lines = compute_settlement(receipt(total=Decimal("10.00")), [line], on(line, [paul]), [paul])
    assert owed(lines, paul) == Decimal("10.00")


def test_an_item_with_nobody_on_it_stops_the_maths():
    paul = uuid4()
    a, b = item("6.00", line=1), item("4.00", line=2)
    with pytest.raises(OwemError) as caught:
        compute_settlement(receipt(total=Decimal("10.00")), [a, b], on(a, [paul]), [paul])
    assert caught.value.code == "UNASSIGNED_ITEMS"
    assert caught.value.details["itemIds"] == [str(b.id)]


def test_an_assignment_naming_a_stranger_is_refused():
    paul, stranger = uuid4(), uuid4()
    line = item("10.00")
    with pytest.raises(OwemError) as caught:
        compute_settlement(receipt(total=Decimal("10.00")), [line], on(line, [stranger]), [paul])
    assert caught.value.code == "UNKNOWN_PARTICIPANT"


def test_tax_and_tip_follow_what_each_person_ordered():
    paul, nia = uuid4(), uuid4()
    a, b = item("7.50", line=1), item("2.50", line=2)
    charges = receipt(tax=Decimal("1.00"), tip=Decimal("2.00"), total=Decimal("13.00"))
    lines = compute_settlement(charges, [a, b], on(a, [paul]) + on(b, [nia]), [paul, nia])
    by_id = {line.participant_id: line for line in lines}
    assert by_id[paul].tax_share == Decimal("0.75")
    assert by_id[nia].tax_share == Decimal("0.25")
    assert settlement_total(lines) == Decimal("13.00")


def test_an_equal_split_ignores_what_each_person_ordered():
    paul, nia = uuid4(), uuid4()
    a, b = item("9.00", line=1), item("1.00", line=2)
    charges = receipt(tip=Decimal("3.00"), total=Decimal("13.00"), tip_policy="EQUAL")
    lines = compute_settlement(charges, [a, b], on(a, [paul]) + on(b, [nia]), [paul, nia])
    assert {line.tip_share for line in lines} == {Decimal("1.50")}


def test_weights_split_one_line_unevenly():
    paul, nia = uuid4(), uuid4()
    beers = item("21.00", name="Peroni")
    lines = compute_settlement(
        receipt(total=Decimal("21.00")),
        [beers],
        on(beers, [paul, nia], [Decimal(2), Decimal(1)]),
        [paul, nia],
    )
    by_id = {line.participant_id: line for line in lines}
    assert by_id[paul].items_subtotal == Decimal("14.00")
    assert by_id[nia].items_subtotal == Decimal("7.00")


def test_a_discount_comes_off_in_proportion():
    paul, nia = uuid4(), uuid4()
    a, b = item("5.00", line=1), item("5.00", line=2)
    charges = receipt(discount=Decimal("2.00"), total=Decimal("8.00"))
    lines = compute_settlement(charges, [a, b], on(a, [paul]) + on(b, [nia]), [paul, nia])
    assert owed(lines, paul) == Decimal("4.00")
    assert settlement_total(lines) == Decimal("8.00")


def test_somebody_who_ordered_nothing_still_gets_a_line():
    paul, ghost = uuid4(), uuid4()
    line = item("10.00")
    lines = compute_settlement(
        receipt(total=Decimal("10.00")), [line], on(line, [paul]), [paul, ghost]
    )
    assert owed(lines, ghost) == Decimal("0.00")
    assert len(lines) == 2


@pytest.mark.parametrize("tip", ["0.00", "0.01", "0.07", "3.33", "37.28", "999.99"])
@pytest.mark.parametrize("people", [1, 2, 3, 5, 7])
def test_the_parts_sum_to_the_total_whatever_the_tip(tip, people):
    ids = [uuid4() for _ in range(people)]
    line = item("30.00")
    total = Decimal("30.00") + Decimal("1.01") + Decimal(tip)
    charges = receipt(tax=Decimal("1.01"), tip=Decimal(tip), total=total)
    lines = compute_settlement(charges, [line], on(line, ids), ids)
    assert settlement_total(lines) == total


def test_every_line_is_the_sum_of_its_own_parts():
    ids = [uuid4() for _ in range(4)]
    a, b = item("12.34", line=1), item("5.67", line=2)
    charges = receipt(
        tax=Decimal("0.97"), tip=Decimal("3.11"), discount=Decimal("0.53"), total=Decimal("21.56")
    )
    lines = compute_settlement(charges, [a, b], on(a, ids) + on(b, ids[:2]), ids)
    for line in lines:
        assert line.amount_owed == (
            line.items_subtotal + line.tax_share + line.tip_share - line.discount_share
        )


def test_the_dinner_at_rosatis():
    paul, albert, manny, nia, devon = (uuid4() for _ in range(5))
    everyone = [paul, albert, manny, nia, devon]

    menu = [
        ("Margherita Pizza", "18.00", [manny]),
        ("Chicken Wings", "16.50", [paul, albert, devon]),
        ("Caesar Salad", "12.00", [nia]),
        ("Rigatoni Vodka", "22.00", [albert]),
        ("Chicken Parm", "24.00", [paul]),
        ("Calamari", "15.00", everyone),
        ("Garlic Knots", "8.50", everyone),
        ("Margarita", "26.00", [albert, devon]),
        ("Peroni", "21.00", [paul, manny, devon]),
        ("Tiramisu", "11.00", [nia, devon]),
        ("Espresso", "7.00", [nia, devon]),
        ("Sparkling water", "5.40", everyone),
    ]
    items, assignments = [], []
    for number, (name, price, people) in enumerate(menu, start=1):
        line = item(price, name=name, line=number)
        items.append(line)
        assignments += on(line, people)

    charges = receipt(tax=Decimal("19.11"), tip=Decimal("37.28"), total=Decimal("242.79"))
    lines = compute_settlement(charges, items, assignments, everyone)

    assert owed(lines, paul) == Decimal("55.07")
    assert owed(lines, albert) == Decimal("60.28")
    assert owed(lines, manny) == Decimal("40.09")
    assert owed(lines, nia) == Decimal("34.88")
    assert owed(lines, devon) == Decimal("52.47")
    assert settlement_total(lines) == Decimal("242.79")

    albert_line = next(line for line in lines if line.participant_id == albert)
    assert albert_line.items_subtotal == Decimal("46.28")
    assert albert_line.tax_share == Decimal("4.74")
    assert albert_line.tip_share == Decimal("9.26")


def test_taking_devon_off_the_wings_moves_money_but_not_the_total():
    paul, albert, devon = uuid4(), uuid4(), uuid4()
    everyone = [paul, albert, devon]
    wings = item("16.50", name="Chicken Wings")
    charges = receipt(total=Decimal("16.50"))

    before = compute_settlement(charges, [wings], on(wings, everyone), everyone)
    after = compute_settlement(charges, [wings], on(wings, [paul, albert]), everyone)

    assert settlement_total(before) == settlement_total(after) == Decimal("16.50")
    assert sum(owed(after, p) - owed(before, p) for p in everyone) == Decimal("0.00")
    assert owed(after, devon) == Decimal("0.00")
