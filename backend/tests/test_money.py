from decimal import Decimal

import pytest

from owem.money import allocate, assert_sums_to, to_cents, to_money


def test_decimal_round_trip_is_exact():
    for text in ["0.00", "0.01", "16.50", "60.28", "242.79", "99999.99"]:
        assert to_money(to_cents(Decimal(text))) == Decimal(text)


def test_a_fractional_cent_is_refused_not_rounded():
    with pytest.raises(ValueError):
        to_cents(Decimal("10.005"))


def test_an_even_split_with_no_remainder():
    assert allocate(1650, [Decimal(1)] * 3) == [550, 550, 550]


def test_the_leftover_cent_is_given_to_someone():
    assert allocate(1000, [Decimal(1)] * 3) == [334, 333, 333]


def test_one_cent_across_three_people_still_sums():
    assert sum(allocate(1, [Decimal(1)] * 3)) == 1


def test_zero_allocates_to_zero():
    assert allocate(0, [Decimal(1)] * 3) == [0, 0, 0]


def test_weights_carry_a_bigger_share():
    assert allocate(2100, [Decimal(2), Decimal(1)]) == [1400, 700]


def test_fractional_weights_stay_exact():
    parts = allocate(1000, [Decimal("0.5"), Decimal("0.25"), Decimal("0.25")])
    assert parts == [500, 250, 250]
    assert all(isinstance(part, int) for part in parts)


def test_a_fourth_decimal_place_is_refused():
    with pytest.raises(ValueError):
        allocate(1000, [Decimal("1.3333"), Decimal(1)])


def test_ties_break_to_the_larger_weight_then_the_earlier_index():
    weights = [Decimal(w) for w in (4228, 4628, 3078, 2678, 4028)]
    assert allocate(3728, weights) == [846, 926, 615, 535, 806]


def test_the_same_input_always_gives_the_same_output():
    weights = [Decimal(w) for w in (3, 7, 11, 2)]
    first = allocate(9999, weights)
    assert all(allocate(9999, weights) == first for _ in range(20))


def test_zero_weights_are_refused():
    with pytest.raises(ValueError):
        allocate(100, [Decimal(0), Decimal(0)])


def test_a_negative_weight_is_refused():
    with pytest.raises(ValueError):
        allocate(100, [Decimal(-1), Decimal(2)])


def test_a_negative_amount_is_refused():
    with pytest.raises(ValueError):
        allocate(-100, [Decimal(1)])


def test_no_weights_allocates_nothing():
    assert allocate(0, []) == []


@pytest.mark.parametrize("amount", [1, 7, 99, 100, 101, 3333, 100_000, 999_999])
@pytest.mark.parametrize("people", [1, 2, 3, 5, 7, 11])
def test_every_split_sums_exactly(amount, people):
    parts = allocate(amount, [Decimal(i + 1) for i in range(people)])
    assert sum(parts) == amount
    assert len(parts) == people
    assert all(part >= 0 for part in parts)


def test_a_thousand_lopsided_splits_all_sum():
    for i in range(1, 1001):
        amount = (i * 7919) % 100_000
        weights = [Decimal(1 + (i % 5)), Decimal(1 + (i % 3)), Decimal(1 + (i % 7))]
        assert sum(allocate(amount, weights)) == amount


def test_nobody_gets_more_than_the_whole():
    assert max(allocate(100, [Decimal(1), Decimal(1000)])) <= 100


def test_assert_sums_to_reports_the_drift():
    with pytest.raises(ValueError, match="parts sum to 2, expected 3"):
        assert_sums_to([1, 1], 3, "x")
