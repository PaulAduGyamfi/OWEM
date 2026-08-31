from decimal import Decimal

CENTS = Decimal("0.01")


def to_cents(amount: Decimal) -> int:
    scaled = amount.scaleb(2)
    if scaled != scaled.to_integral_value():
        raise ValueError(f"{amount} is not a whole number of cents")
    return int(scaled)


def to_money(cents: int) -> Decimal:
    return Decimal(cents).scaleb(-2)


def allocate(total: int, weights: list[Decimal]) -> list[int]:
    if total < 0:
        raise ValueError(f"cannot allocate a negative amount: {total}")
    if not weights:
        return []

    scaled = [_scale(weight) for weight in weights]
    weight_total = sum(scaled)
    if weight_total == 0:
        raise ValueError("weights sum to zero")

    shares = [(total * weight) // weight_total for weight in scaled]
    remainders = [(total * weight) % weight_total for weight in scaled]
    leftover = total - sum(shares)

    order = sorted(
        range(len(scaled)),
        key=lambda i: (-remainders[i], -scaled[i], i),
    )
    for i in order[:leftover]:
        shares[i] += 1

    assert_sums_to(shares, total, "allocation")
    return shares


def assert_sums_to(parts: list[int], total: int, what: str) -> None:
    actual = sum(parts)
    if actual != total:
        raise ValueError(f"{what}: parts sum to {actual}, expected {total}")


def _scale(weight: Decimal) -> int:
    if weight < 0:
        raise ValueError(f"weight cannot be negative: {weight}")
    scaled = weight.scaleb(3)
    if scaled != scaled.to_integral_value():
        raise ValueError(f"weight {weight} has more than 3 decimal places")
    return int(scaled)
