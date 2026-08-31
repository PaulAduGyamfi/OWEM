from dataclasses import dataclass, field


@dataclass
class OwemError(Exception):
    code: str
    message: str
    status: int = 409
    details: dict[str, object] = field(default_factory=dict)


def not_found(what: str, identifier: object) -> OwemError:
    return OwemError("NOT_FOUND", f"No {what} with id {identifier}.", 404)


def forbidden() -> OwemError:
    return OwemError("FORBIDDEN", "That event is not yours.", 403)


def conflict(code: str, message: str) -> OwemError:
    return OwemError(code, message, 409)


def unprocessable(code: str, message: str, **details: object) -> OwemError:
    return OwemError(code, message, 422, details)
