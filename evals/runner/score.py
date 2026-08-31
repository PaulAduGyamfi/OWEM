from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from owem.ai import CONFIDENCE_FLOOR
from owem.models import ExtractedReceipt

from evals.runner.cases import Case


@dataclass(frozen=True)
class LineScore:
    expected_raw: str
    got_raw: str | None
    price_correct: bool
    raw_name_correct: bool
    confidence: Decimal | None

    @property
    def matched(self) -> bool:
        return self.got_raw is not None


@dataclass
class Score:
    slug: str
    expected_lines: int
    got_lines: int
    lines: list[LineScore] = field(default_factory=list)
    subtotal_correct: bool = False
    tax_correct: bool = False
    total_correct: bool = False
    self_consistent: bool = False
    error: str | None = None

    @property
    def line_count_correct(self) -> bool:
        return self.expected_lines == self.got_lines

    @property
    def price_accuracy(self) -> float:
        if not self.lines:
            return 0.0
        return sum(1 for line in self.lines if line.price_correct) / len(self.lines)

    @property
    def raw_name_accuracy(self) -> float:
        if not self.lines:
            return 0.0
        return sum(1 for line in self.lines if line.raw_name_correct) / len(self.lines)

    @property
    def caught_its_own_mistakes(self) -> tuple[int, int]:
        wrong = [line for line in self.lines if not line.price_correct]
        flagged = [
            line
            for line in wrong
            if line.confidence is not None and line.confidence < CONFIDENCE_FLOOR
        ]
        return len(flagged), len(wrong)

    @property
    def false_alarms(self) -> int:
        return sum(
            1
            for line in self.lines
            if line.price_correct
            and line.confidence is not None
            and line.confidence < CONFIDENCE_FLOOR
        )


def _normalise(name: str) -> str:
    return " ".join(name.split()).upper()


def score_case(case: Case, got: ExtractedReceipt) -> Score:
    result = Score(
        slug=case.slug,
        expected_lines=len(case.lines),
        got_lines=len(got.lines),
    )

    for index, expected in enumerate(case.lines):
        actual = got.lines[index] if index < len(got.lines) else None
        result.lines.append(
            LineScore(
                expected_raw=expected.raw,
                got_raw=actual.raw_name if actual else None,
                price_correct=bool(
                    actual and actual.total_price == Decimal(expected.total)
                ),
                raw_name_correct=bool(
                    actual and _normalise(actual.raw_name) == _normalise(expected.raw)
                ),
                confidence=actual.confidence if actual else None,
            )
        )

    result.subtotal_correct = got.subtotal == case.subtotal
    result.tax_correct = got.tax == Decimal(case.tax)
    result.total_correct = got.total == case.total
    result.self_consistent = abs(
        (got.subtotal + got.tax + got.tip - got.discount) - got.total
    ) <= Decimal("0.05")
    return result


@dataclass
class Summary:
    scores: list[Score]

    @property
    def usable(self) -> list[Score]:
        return [s for s in self.scores if s.error is None]

    def rate(self, attribute: str) -> float:
        if not self.usable:
            return 0.0
        return sum(1 for s in self.usable if getattr(s, attribute)) / len(self.usable)

    @property
    def price_accuracy(self) -> float:
        lines = [line for s in self.usable for line in s.lines]
        if not lines:
            return 0.0
        return sum(1 for line in lines if line.price_correct) / len(lines)

    @property
    def raw_name_accuracy(self) -> float:
        lines = [line for s in self.usable for line in s.lines]
        if not lines:
            return 0.0
        return sum(1 for line in lines if line.raw_name_correct) / len(lines)

    @property
    def calibration(self) -> tuple[int, int]:
        flagged = total = 0
        for s in self.usable:
            f, t = s.caught_its_own_mistakes
            flagged += f
            total += t
        return flagged, total

    @property
    def false_alarms(self) -> int:
        return sum(s.false_alarms for s in self.usable)
