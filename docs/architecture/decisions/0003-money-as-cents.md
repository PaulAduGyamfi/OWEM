# ADR-003: Money as whole cents inside the engine ## Status
Accepted - [today's date]
## Context
Splitting money requires dividing a total and reconciling the leftover exactly. Floating point introduces representation error that compounds across allocation steps.
## Decision
- Stored: NUMERIC(12,2) in Postgres
- Boundaries: decimal in C#
- Inside the settlement engine: long, whole cents - float and double are banned everywhere
## Consequences
+ "The parts sum to the whole" becomes a whole-number equality we can assert.
+ Rounding becomes an explicit, testable decision rather than a side effect.
- Conversion needed at the engine boundary.