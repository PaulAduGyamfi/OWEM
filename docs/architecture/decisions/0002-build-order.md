# ADR-004: Build the deterministic system before the AI ## Status
Accepted - [today's date]
## Context
The obvious first move is "build the AI receipt reader", since that is the exciting part.
## Decision
Build in this order: app ui -> domain -> settlement engine -> tests -> API  -> THEN AI.
## Consequences
+ When AI is added, the engine is a fixed point we trust, so every remaining bug is in the new layer. Building AI first means debugging two unproven systems through each other.
+ The deterministic app is independently useful. Someone typing in eight items still gets exact tax-proportional balances. That is a real product even if the AI never ships.
- The exciting part is delayed by several weeks.