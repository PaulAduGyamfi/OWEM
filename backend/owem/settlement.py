from decimal import Decimal
from uuid import UUID

from owem.errors import unprocessable
from owem.models import Assignment, Receipt, ReceiptItem, SettlementLine
from owem.money import allocate, assert_sums_to, to_cents, to_money

ENGINE_VERSION = "settlement-1.0.0"

CONFIDENCE_FLOOR = Decimal("0.85")
RECEIPT_CONFIDENCE_FLOOR = Decimal("0.90")
TOLERANCE = Decimal("0.05")
MAX_TAX_RATE = Decimal("0.20")


def compute_settlement(
    receipt: Receipt,
    items: list[ReceiptItem],
    assignments: list[Assignment],
    participant_ids: list[UUID],
) -> list[SettlementLine]:
    reject_unconfirmed(receipt, items)
    reject_unassigned(items, assignments)

    people = list(dict.fromkeys(participant_ids))
    position = {person: i for i, person in enumerate(people)}
    subtotals = [0] * len(people)

    for item in items:
        on_item = [a for a in assignments if a.item_id == item.id]
        for a in on_item:
            if a.participant_id not in position:
                raise unprocessable(
                    "UNKNOWN_PARTICIPANT",
                    f"Assignment names somebody not on this event: {a.participant_id}",
                )
        shares = allocate(to_cents(item.total_price), [a.weight for a in on_item])
        for a, share in zip(on_item, shares, strict=True):
            subtotals[position[a.participant_id]] += share

    weights = charge_weights(receipt.tip_policy, subtotals)
    tax = allocate(to_cents(receipt.tax), weights)
    tip = allocate(to_cents(receipt.tip), weights)
    discount = allocate(to_cents(receipt.discount), weights)

    lines = [
        SettlementLine(
            participant_id=person,
            items_subtotal=to_money(subtotals[i]),
            tax_share=to_money(tax[i]),
            tip_share=to_money(tip[i]),
            discount_share=to_money(discount[i]),
            amount_owed=to_money(subtotals[i] + tax[i] + tip[i] - discount[i]),
        )
        for i, person in enumerate(people)
    ]

    expected = (
        sum(subtotals) + to_cents(receipt.tax) + to_cents(receipt.tip) - to_cents(receipt.discount)
    )
    assert_sums_to([to_cents(line.amount_owed) for line in lines], expected, "settlement")
    return lines


def reject_unconfirmed(receipt: Receipt, items: list[ReceiptItem]) -> None:
    unconfirmed = [str(item.id) for item in items if item.provenance == "AI_SUGGESTED"]
    fields = [] if receipt.tax_provenance != "AI_SUGGESTED" else ["tax"]
    if unconfirmed or fields:
        raise unprocessable(
            "UNCONFIRMED_INPUT",
            f"{len(unconfirmed) + len(fields)} value(s) are still AI_SUGGESTED. "
            "Confirm them first.",
            itemIds=unconfirmed,
            fields=fields,
        )


def reject_unassigned(items: list[ReceiptItem], assignments: list[Assignment]) -> None:
    assigned = {a.item_id for a in assignments}
    missing = [str(item.id) for item in items if item.id not in assigned]
    if missing:
        raise unprocessable(
            "UNASSIGNED_ITEMS",
            f"{len(missing)} item(s) are not assigned to anyone.",
            itemIds=missing,
        )


def charge_weights(policy: str, subtotals: list[int]) -> list[Decimal]:
    if policy == "EQUAL" or not any(subtotals):
        return [Decimal(1)] * len(subtotals)
    return [Decimal(value) for value in subtotals]


def settlement_total(lines: list[SettlementLine]) -> Decimal:
    return sum((line.amount_owed for line in lines), Decimal("0.00"))


def check_receipt(items: list[ReceiptItem], receipt: Receipt) -> list[str]:
    problems = []
    line_total = sum((item.total_price for item in items), Decimal("0"))
    computed = line_total + receipt.tax + receipt.tip - receipt.discount

    if abs(computed - receipt.total) > TOLERANCE:
        problems.append(
            f"The lines and charges come to {computed} but the receipt says {receipt.total}."
        )
    if line_total > 0 and receipt.tax > line_total * MAX_TAX_RATE:
        problems.append(
            f"Tax of {receipt.tax} is more than 20% of {line_total} - that is a misread, not a tax."
        )
    return problems
