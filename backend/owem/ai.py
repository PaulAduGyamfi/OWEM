import base64
import json
import time
from decimal import Decimal
from typing import Any, Literal, cast

import anthropic
from anthropic.types.beta import (
    BetaBase64ImageSourceParam,
    BetaImageBlockParam,
    BetaMessageParam,
    BetaTextBlockParam,
)

from owem.config import settings
from owem.errors import unprocessable
from owem.models import ExtractedLine, ExtractedReceipt
from owem.prompt import (
    PROMPT_VERSION,
    RECEIPT_SCHEMA,
    SYSTEM_PROMPT,
    USER_PROMPT,
)

CAPABILITY = "receipt_extraction"
INPUT_COST_PER_MTOK = Decimal("5.00")
OUTPUT_COST_PER_MTOK = Decimal("25.00")

VisionMediaType = Literal["image/jpeg", "image/png", "image/gif", "image/webp"]
READABLE = {"image/jpeg", "image/png", "image/gif", "image/webp"}

CONFIDENCE_FLOOR = Decimal("0.85")
RECEIPT_CONFIDENCE_FLOOR = Decimal("0.90")

STUB_LINES = [
    ("MRG PZA", "Margherita Pizza", 1, "18.00", "0.97"),
    ("CHK WNG", "Chicken Wings", 1, "16.50", "0.71"),
    ("CSR SLD", "Caesar Salad", 1, "12.00", "0.96"),
    ("RIG VDKA", "Rigatoni Vodka", 1, "22.00", "0.94"),
    ("CHK PARM", "Chicken Parm", 1, "24.00", "0.95"),
    ("CALAMARI", "Calamari", 1, "15.00", "0.98"),
    ("GRLC KNT", "Garlic Knots", 1, "8.50", "0.93"),
    ("2 MARG", "Margarita", 2, "26.00", "0.68"),
    ("3 PERONI", "Peroni", 3, "21.00", "0.91"),
    ("TIRAMISU", "Tiramisu", 1, "11.00", "0.97"),
    ("2 ESPRSO", "Espresso", 2, "7.00", "0.89"),
    ("SPK WTR", "Sparkling water", 1, "5.40", "0.92"),
]


class Call(dict[str, Any]):
    pass


def read_receipt(image: bytes, kind: str) -> tuple[ExtractedReceipt, Call]:
    if settings.use_stub:
        return read_with_stub()
    return read_with_claude(image, kind)


def read_with_stub() -> tuple[ExtractedReceipt, Call]:
    lines = [
        ExtractedLine(
            raw_name=raw,
            normalized_name=name,
            quantity=quantity,
            unit_price=(Decimal(total) / quantity).quantize(Decimal("0.01")),
            total_price=Decimal(total),
            confidence=Decimal(confidence),
        )
        for raw, name, quantity, total, confidence in STUB_LINES
    ]
    subtotal = sum((line.total_price for line in lines), Decimal("0"))
    tax, tip = Decimal("19.11"), Decimal("37.28")
    receipt = ExtractedReceipt(
        merchant="Rosati's",
        lines=lines,
        subtotal=subtotal,
        tax=tax,
        tip=tip,
        discount=Decimal("0.00"),
        total=subtotal + tax + tip,
        extraction_confidence=Decimal("0.93"),
    )
    call = Call(
        capability=CAPABILITY,
        prompt_version=f"{PROMPT_VERSION}-stub",
        model="stub",
        raw_response=None,
        latency_ms=0,
        input_tokens=None,
        output_tokens=None,
        cost_usd=Decimal("0"),
        outcome="ok",
    )
    return receipt, call


def read_with_claude(
    image: bytes, kind: str, client: anthropic.Anthropic | None = None
) -> tuple[ExtractedReceipt, Call]:
    if kind not in READABLE:
        raise unprocessable(
            "UNREADABLE_IMAGE", f"{kind} cannot be read directly. Send the photo as JPEG or PNG."
        )

    client = client or build_client()
    started = time.monotonic()
    usage = None

    try:
        response = client.with_options(timeout=settings.ai_timeout_seconds).beta.messages.create(
            model=settings.ai_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            messages=build_message(image, kind),
            thinking={"type": "adaptive"},
            output_config={"format": {"type": "json_schema", "schema": RECEIPT_SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        usage = getattr(response, "usage", None)

        if getattr(response, "stop_reason", None) == "refusal":
            raise unprocessable(
                "EXTRACTION_FAILED",
                "The model declined to read this image. Try a clearer photo, or type the lines in.",
            )

        text = next((block.text for block in response.content if block.type == "text"), None)
        if text is None:
            raise unprocessable("EXTRACTION_FAILED", "The model returned no structured output.")

        payload = json.loads(text, parse_float=Decimal)
        return parse_extraction(payload), build_call(payload, started, usage, "ok")

    except anthropic.APIError as error:
        raise unprocessable("EXTRACTION_FAILED", f"The reading service failed: {error}") from error


def build_client() -> anthropic.Anthropic:
    workspace = settings.anthropic_workspace_id
    if workspace:
        return anthropic.Anthropic(default_headers={"anthropic-workspace-id": workspace})
    return anthropic.Anthropic()


def build_message(image: bytes, kind: str) -> list[BetaMessageParam]:
    photo = BetaImageBlockParam(
        type="image",
        source=BetaBase64ImageSourceParam(
            type="base64",
            media_type=cast(VisionMediaType, kind),
            data=base64.standard_b64encode(image).decode("utf-8"),
        ),
    )
    return [
        BetaMessageParam(
            role="user", content=[photo, BetaTextBlockParam(type="text", text=USER_PROMPT)]
        )
    ]


def build_call(payload: Any, started: float, usage: Any, outcome: str) -> Call:
    return Call(
        capability=CAPABILITY,
        prompt_version=PROMPT_VERSION,
        model=settings.ai_model,
        raw_response=json.loads(json.dumps(payload, default=str)) if payload else None,
        latency_ms=int((time.monotonic() - started) * 1000),
        input_tokens=getattr(usage, "input_tokens", None),
        output_tokens=getattr(usage, "output_tokens", None),
        cost_usd=cost(usage),
        outcome=outcome,
    )


def cost(usage: Any) -> Decimal | None:
    inputs = getattr(usage, "input_tokens", None)
    outputs = getattr(usage, "output_tokens", None)
    if inputs is None or outputs is None:
        return None
    million = Decimal(1_000_000)
    total = (
        Decimal(inputs) / million * INPUT_COST_PER_MTOK
        + Decimal(outputs) / million * OUTPUT_COST_PER_MTOK
    )
    return total.quantize(Decimal("0.000001"))


def parse_extraction(payload: Any) -> ExtractedReceipt:
    if not isinstance(payload, dict):
        raise unprocessable("EXTRACTION_FAILED", "The response was not an object.")
    if not isinstance(payload.get("items"), list):
        raise unprocessable("EXTRACTION_FAILED", "`items` is missing or not a list.")

    lines = []
    for index, raw in enumerate(payload["items"]):
        if not isinstance(raw, dict):
            raise unprocessable("EXTRACTION_FAILED", f"item {index} is not an object.")
        quantity = raw.get("quantity", 1)
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 1:
            raise unprocessable("EXTRACTION_FAILED", f"item {index} has a bad quantity.")
        lines.append(
            ExtractedLine(
                raw_name=require_str(raw.get("rawName"), index),
                normalized_name=require_str(raw.get("normalizedName"), index),
                quantity=quantity,
                unit_price=require_money(raw.get("unitPrice"), f"item {index} unitPrice"),
                total_price=require_money(raw.get("totalPrice"), f"item {index} totalPrice"),
                confidence=require_money(raw.get("confidence", 0), f"item {index} confidence"),
            )
        )

    merchant = payload.get("merchant")
    return ExtractedReceipt(
        merchant=merchant if isinstance(merchant, str) else None,
        lines=lines,
        subtotal=require_money(payload.get("subtotal"), "subtotal"),
        tax=require_money(payload.get("tax"), "tax"),
        tip=require_money(payload.get("tip"), "tip"),
        discount=require_money(payload.get("discount"), "discount"),
        total=require_money(payload.get("total"), "total"),
        extraction_confidence=require_money(
            payload.get("extractionConfidence", 0), "extractionConfidence"
        ),
    )


def require_str(value: Any, index: int) -> str:
    if not isinstance(value, str):
        raise unprocessable("EXTRACTION_FAILED", f"item {index} is missing a name.")
    return value


def require_money(value: Any, where: str) -> Decimal:
    if isinstance(value, bool):
        raise unprocessable("EXTRACTION_FAILED", f"{where} is not a number: {value}")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, str):
        try:
            return Decimal(value)
        except ArithmeticError:
            raise unprocessable("EXTRACTION_FAILED", f"{where} is not a number: {value}") from None
    raise unprocessable("EXTRACTION_FAILED", f"{where} is not a number: {value}")


def low_confidence_lines(receipt: ExtractedReceipt) -> list[int]:
    return [i for i, line in enumerate(receipt.lines) if line.confidence < CONFIDENCE_FLOOR]


def extraction_problems(receipt: ExtractedReceipt) -> list[str]:
    problems = []
    line_total = sum((line.total_price for line in receipt.lines), Decimal("0"))
    if abs(line_total - receipt.subtotal) > Decimal("0.05"):
        problems.append(f"The lines come to {line_total} but the subtotal says {receipt.subtotal}.")
    computed = receipt.subtotal + receipt.tax + receipt.tip - receipt.discount
    if abs(computed - receipt.total) > Decimal("0.05"):
        problems.append(
            f"Subtotal plus tax and tip less discount is {computed}, "
            f"but the total says {receipt.total}."
        )
    if receipt.subtotal > 0 and receipt.tax > receipt.subtotal * Decimal("0.20"):
        problems.append(
            f"Tax of {receipt.tax} is more than 20% of {receipt.subtotal} - "
            "that is a misread, not a tax."
        )
    for index, line in enumerate(receipt.lines):
        if line.quantity > 1 and line.unit_price > 0:
            expected = line.unit_price * line.quantity
            if abs(expected - line.total_price) > Decimal("0.05"):
                problems.append(
                    f"Line {index + 1} ({line.raw_name}): {line.quantity} x {line.unit_price} "
                    f"is {expected}, not {line.total_price}."
                )
    return problems
