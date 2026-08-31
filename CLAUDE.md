# Project Context

OWEM is an AI-assisted group expense settlement application. Frontend: Expo / React Native / TypeScript. Backend: Python 3.12 with FastAPI, SQLAlchemy 2.x, and PostgreSQL. The system digitizes restaurant receipts, assigns items to participants, and calculates exact reimbursement balances.

# Engineering Principles

- AI interprets uncertain information. Deterministic code performs all financial calculations.
- Never allow an LLM to compute, modify, or approve a balance.
- Monetary values are `decimal.Decimal` at boundaries and `int` minor units inside the settlement engine. NEVER `float`.
- `money.py` and `settlement.py` import no framework, no ORM and no AI SDK.
- Route handlers parse, authorize, delegate and return. Arithmetic belongs in `settlement.py`.
- The settlement engine is the only place money is calculated.
- Every AI call lives in `ai.py`. Nothing else imports an AI SDK.
- Every AI-produced value carries a provenance tag. The settlement engine rejects `AI_SUGGESTED` inputs.
- All business logic has pytest coverage, including edge cases and failure paths, not only happy paths.
- No secrets in source. Configuration via environment variables, loaded through pydantic-settings.
- Prefer small, reviewable, incremental changes.

# Money Handling In Python

Python leaks floats in more places than a statically typed backend does. Guard every one of them:

- Money crosses the API as a **string**, never a JSON number. `Money` in `models.py` rejects a float outright.
- Pydantic money fields are `Decimal` with two decimal places, serialised as a string.
- SQLAlchemy monetary columns use `Numeric(12, 2, asdecimal=True)`. Never `Float` or `REAL`.
- Convert to `int` cents once, at the engine boundary, with `to_cents`. Inside the engine use integer arithmetic only.
- Never call `round()` on a monetary value. Rounding is a domain decision with a named rule.
- Never call `float()` on a monetary value, including in logs, sorting, comparisons or test assertions.

`allocate()` splits by largest remainder: everyone gets the floor of their exact
share, then leftover cents go one each to the largest remainders, ties breaking
to the larger weight and then the earlier index. `assert_sums_to` raises if the
parts ever fail to reach the whole.

# Package Layout

```
owem/
  models.py       every shape, once - Pydantic, used from the database to the response
  db.py           SQLAlchemy tables and the functions that read and write them
  money.py        cents, allocate, assert_sums_to
  settlement.py   the engine and its two guards
  ai.py           reading a receipt: the Claude call, the stub, and validation
  storage.py      receipt photos
  errors.py       OwemError
  config.py       settings
  api.py          FastAPI app and every route
tests/
```

One model per concept. No separate entities, DTOs, mappers or repository
interfaces - a Pydantic model goes from `model_validate(row)` straight to the
HTTP response, and `alias_generator=to_camel` handles the casing.

`money.py` and `settlement.py` import nothing but the standard library, Pydantic
and each other. That is what keeps the arithmetic testable without a database.

# Style

- No comments. If a line needs explaining, rename it or restructure it. Reasons that genuinely matter go in `backend/README.md`, not above the code.
- `Literal[...]` for closed sets, not `Enum` subclasses.
- Plain functions over classes. No `super()`, no inheritance for its own sake, no `Protocol` with a single implementation.
- One way to do a thing. If two layers hold the same data, delete one.

# Coding Workflow

Before implementing anything:

1. Inspect the relevant existing files.
2. State the implementation plan in prose.
3. List every file that will be created or modified.
4. Identify assumptions and open questions.
5. STOP. Do not write implementation code until the plan is approved.

After approval:

6. Implement only what was approved.
7. Add or update tests.
8. Run `pytest` and report results, including failures.
9. Explain every file changed and why.
10. Do not modify unrelated files.

# Things That Are Never Acceptable

- `float` for money, anywhere, including fixtures and test data
- Arithmetic on money outside `money.py` or `settlement.py`
- A `Float` or `REAL` column for a monetary field
- A model call outside a port implementation
- `except Exception:` that swallows the error and returns a default monetary value
- A settlement calculation whose parts do not sum exactly to the total
- A framework, ORM, or AI SDK import inside `money.py` or `settlement.py`
- A comment explaining what the code below it does
- New dependencies added to `pyproject.toml` without being called out explicitly

# Where The Detail Lives

- Running it locally: `RUNNING.md`
- Schema and tables: `docs/architecture/data-model.md`
- Endpoints and errors: `docs/architecture/api-design.md`
- AI contracts: `docs/architecture/ai-design.md`
- Security controls: `docs/architecture/security.md`
- Why things are this way: `docs/architecture/decisions/`

# Frontend UI

Reference `docs/design-system.md` for the UI design system and `docs/OWEM Color Palette.md` for colour.

If a task touches one of these areas and the relevant document was not given to you, ASK FOR IT before planning. Do not infer the schema or the API contract from surrounding code.