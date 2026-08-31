from __future__ import annotations

import argparse
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from evals.runner.cases import BY_SLUG, CASES, Case
from evals.runner.generate import render_receipt
from evals.runner.score import Score, Summary, score_case

DATASET = ROOT / "evals" / "dataset"
REPORT = ROOT / "evals" / "report"


def read(image: bytes, live: bool):
    from owem.ai import read_with_claude, read_with_stub

    if live:
        return read_with_claude(image, "image/png")[0]
    return read_with_stub()[0]


def run_case(case: Case, live: bool, regenerate: bool) -> tuple[Score, float]:
    image_path = DATASET / f"{case.slug}.png"
    if regenerate or not image_path.is_file():
        render_receipt(case, image_path)
    image = image_path.read_bytes()

    started = time.monotonic()
    try:
        got = read(image, live)
    except Exception as error:  # noqa: BLE001
        blank = Score(slug=case.slug, expected_lines=len(case.lines), got_lines=0)
        blank.error = str(error)
        return blank, time.monotonic() - started
    return score_case(case, got), time.monotonic() - started


def report(summary: Summary, timings: dict[str, float], *, live: bool) -> str:
    flagged, wrong = summary.calibration
    lines = [
        "# Receipt extraction — accuracy",
        "",
        f"- **Run:** {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
        f"- **Reader:** {'claude-opus-5' if live else 'stub (no model called)'}",
        "- **Prompt:** receipt-extraction-v1",
        f"- **Cases:** {len(summary.scores)}",
        "",
    ]
    if not live:
        lines += [
            "> **These numbers measure nothing about a model.** The stub reader",
            "> returns one fixed receipt whatever it is shown, so it scores 100% on",
            "> `rosatis-clean` and near zero elsewhere. That is the harness proving",
            "> it discriminates. For real accuracy: `--live`.",
            "",
        ]
    lines += [
        "## Headline",
        "",
        "| Measure | Result |",
        "|---|---|",
        f"| Right number of lines | {summary.rate('line_count_correct'):.0%} of receipts |",
        f"| Line price exactly right | {summary.price_accuracy:.0%} of lines |",
        f"| Printed name transcribed exactly | {summary.raw_name_accuracy:.0%} of lines |",
        f"| Subtotal exactly right | {summary.rate('subtotal_correct'):.0%} of receipts |",
        f"| Tax exactly right | {summary.rate('tax_correct'):.0%} of receipts |",
        f"| Total exactly right | {summary.rate('total_correct'):.0%} of receipts |",
        f"| Returned a self-consistent receipt | {summary.rate('self_consistent'):.0%} of receipts |",
        "",
        "## Did it know when it was wrong?",
        "",
        "The number that matters most. A wrong line the model flagged goes to a",
        "human and costs nothing. A wrong line it was confident about is the one",
        "that reaches somebody's balance.",
        "",
        (
            f"- **{flagged} of {wrong}** wrong lines were flagged below the "
            f"0.85 confidence floor."
            if wrong
            else "- No lines were wrong."
        ),
        (
            f"- **{summary.false_alarms}** correct lines were flagged anyway "
            "(a person checks something already right - cheap, but not free)."
        ),
        "",
        "## Per receipt",
        "",
        "| Case | Lines | Prices | Names | Totals | Time |",
        "|---|---|---|---|---|---|",
    ]
    for s in summary.scores:
        if s.error:
            lines.append(f"| `{s.slug}` | — | — | — | — | failed: {s.error[:60]} |")
            continue
        totals = "".join(
            mark
            for mark in (
                "S" if s.subtotal_correct else "·",
                "T" if s.tax_correct else "·",
                "G" if s.total_correct else "·",
            )
        )
        lines.append(
            f"| `{s.slug}` | {s.got_lines}/{s.expected_lines} | "
            f"{s.price_accuracy:.0%} | {s.raw_name_accuracy:.0%} | {totals} | "
            f"{timings.get(s.slug, 0):.1f}s |"
        )

    lines += [
        "",
        "Totals column: S subtotal, T tax, G grand total; `·` means wrong.",
        "",
    ]

    misses = [
        (s.slug, line)
        for s in summary.usable
        for line in s.lines
        if not line.price_correct or not line.raw_name_correct
    ]
    if misses:
        lines += [
            "## Every line it got wrong",
            "",
            "| Case | Expected | Got | Confidence |",
            "|---|---|---|---|",
        ]
        for slug, line in misses:
            confidence = (
                f"{line.confidence:.2f}" if line.confidence is not None else "—"
            )
            lines.append(
                f"| `{slug}` | `{line.expected_raw}` | `{line.got_raw or '(missing)'}` | {confidence} |"
            )
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live", action="store_true", help="call the real model (costs money)"
    )
    parser.add_argument("--case", help="run one case by slug")
    parser.add_argument(
        "--regenerate", action="store_true", help="re-render the images first"
    )
    args = parser.parse_args()

    cases = [BY_SLUG[args.case]] if args.case else CASES

    scores: list[Score] = []
    timings: dict[str, float] = {}
    for case in cases:
        score, seconds = run_case(case, args.live, args.regenerate)
        scores.append(score)
        timings[case.slug] = seconds
        status = "failed" if score.error else f"{score.price_accuracy:.0%} prices"
        print(f"  {case.slug:22} {status}")

    summary = Summary(scores)
    REPORT.mkdir(parents=True, exist_ok=True)
    name = f"{datetime.now(UTC).strftime('%Y%m%d-%H%M')}-{'live' if args.live else 'stub'}.md"
    out = REPORT / name
    text = report(summary, timings, live=args.live)
    out.write_text(text, encoding="utf-8")
    (REPORT / "latest.md").write_text(text, encoding="utf-8")

    print(f"\n{text.split('## Headline')[1].split('## Did')[0].strip()}")
    print(f"\nWritten to {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
