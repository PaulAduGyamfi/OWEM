from __future__ import annotations

import shutil
import subprocess
import tempfile
from decimal import Decimal
from pathlib import Path

from evals.runner.cases import Case

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
]


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if Path(candidate).is_file():
            return candidate
        found = shutil.which(candidate)
        if found:
            return found
    raise RuntimeError(
        "No Chrome or Chromium found to render receipts. Install one, or drop your "
        "own photos into evals/dataset/ with a matching ground-truth JSON."
    )


def _row(label: str, amount: str, *, bold: bool = False) -> str:
    weight = "font-weight:700;" if bold else ""
    return (
        f'<div class="row" style="{weight}">'
        f"<span>{label}</span><span>{amount}</span></div>"
    )


def receipt_html(case: Case) -> str:
    lines = []
    for line in case.lines:
        classes = "row line" + (" faded" if line.faded else "")
        quantity = f"{line.quantity} " if line.quantity > 1 else ""
        lines.append(
            f'<div class="{classes}"><span>{quantity}{line.raw}</span>'
            f"<span>{line.total}</span></div>"
        )

    totals = [_row("SUBTOTAL", f"{case.subtotal:.2f}")]
    if Decimal(case.discount) > 0:
        totals.append(_row("DISCOUNT", f"-{Decimal(case.discount):.2f}"))
    totals.append(_row("TAX", f"{Decimal(case.tax):.2f}"))
    if Decimal(case.tip) > 0:
        totals.append(_row("TIP", f"{Decimal(case.tip):.2f}"))
    totals.append(_row("TOTAL", f"{case.total:.2f}", bold=True))

    crumple = (
        "background-image:repeating-linear-gradient(102deg,rgba(0,0,0,.05) 0 1px,"
        "transparent 1px 14px),repeating-linear-gradient(8deg,rgba(0,0,0,.04) 0 1px,"
        "transparent 1px 23px);"
        if case.crumpled
        else ""
    )

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
  body {{ margin:0; background:#8a8a8a; display:flex; justify-content:center;
          padding:40px 0; font-family:"Courier New",Courier,monospace; }}
  .paper {{ width:340px; background:#f6f4ee; padding:26px 22px 34px;
            transform:rotate({case.rotation}deg); {crumple}
            box-shadow:0 6px 24px rgba(0,0,0,.35); color:#1a1a1a; }}
  .merchant {{ text-align:center; font-weight:700; font-size:17px;
               letter-spacing:1px; margin-bottom:2px; }}
  .sub {{ text-align:center; font-size:11px; color:#555; margin-bottom:18px; }}
  .rule {{ border-top:1px dashed #777; margin:12px 0; }}
  .row {{ display:flex; justify-content:space-between; font-size:13px;
          line-height:1.9; letter-spacing:.4px; }}
  .line span:first-child {{ padding-right:12px; }}
  .faded {{ color:#9a9a94; }}
  .foot {{ text-align:center; font-size:10px; color:#666; margin-top:18px; }}
</style></head><body>
  <div class="paper">
    <div class="merchant">{case.merchant}</div>
    <div class="sub">GUEST CHECK &nbsp;·&nbsp; TABLE 12 &nbsp;·&nbsp; SERVER: SAM</div>
    <div class="rule"></div>
    {"".join(lines)}
    <div class="rule"></div>
    {"".join(totals)}
    <div class="foot">THANK YOU — PLEASE COME AGAIN</div>
  </div>
</body></html>"""


def _page_height(case: Case) -> int:
    charges = (
        3
        + (1 if Decimal(case.discount) > 0 else 0)
        + (1 if Decimal(case.tip) > 0 else 0)
    )
    rows = len(case.lines) + charges
    return 80 + 26 + 34 + 70 + int(rows * 24.7) + 60 + 40


def render_receipt(case: Case, out: Path) -> bytes:
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        page = Path(work) / f"{case.slug}.html"
        page.write_text(receipt_html(case), encoding="utf-8")
        subprocess.run(
            [
                find_chrome(),
                "--headless",
                "--disable-gpu",
                "--hide-scrollbars",
                f"--window-size=440,{_page_height(case)}",
                "--virtual-time-budget=4000",
                f"--screenshot={out}",
                page.as_uri(),
            ],
            check=True,
            capture_output=True,
            timeout=120,
        )
        if not out.is_file():  # pragma: no cover - environment problem
            raise RuntimeError(f"Chrome produced no image for {case.slug}")
    return out.read_bytes()
