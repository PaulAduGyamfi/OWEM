import secrets
from datetime import UTC, datetime
from pathlib import Path

from owem.config import settings
from owem.errors import conflict

MAX_BYTES = 10 * 1024 * 1024

SIGNATURES = [(b"\xff\xd8\xff", "image/jpeg"), (b"\x89PNG\r\n\x1a\n", "image/png")]
HEIC_BRANDS = {b"heic", b"heix", b"hevc", b"heim", b"heis", b"mif1", b"msf1"}
EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/heic": "heic"}

ROOT = Path(settings.receipt_storage_dir)


def media_type(data: bytes) -> str:
    if not data:
        raise conflict("UNSUPPORTED_IMAGE", "The upload is empty.")
    if len(data) > MAX_BYTES:
        raise conflict("IMAGE_TOO_LARGE", "Receipt photos are limited to 10MB.")
    for signature, kind in SIGNATURES:
        if data.startswith(signature):
            return kind
    if len(data) > 12 and data[4:8] == b"ftyp" and data[8:12] in HEIC_BRANDS:
        return "image/heic"
    raise conflict(
        "UNSUPPORTED_IMAGE",
        "That file is not a JPEG, PNG or HEIC. The extension is not what we check.",
    )


def save(data: bytes, kind: str) -> str:
    key = f"{datetime.now(UTC):%Y/%m/%d}/{secrets.token_hex(16)}.{EXTENSIONS.get(kind, 'bin')}"
    path = ROOT / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def load(key: str) -> bytes:
    return _resolve(key).read_bytes()


def remove(key: str) -> None:
    _resolve(key).unlink(missing_ok=True)


def _resolve(key: str) -> Path:
    path = (ROOT / key).resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError(f"key escapes the storage root: {key}")
    return path
