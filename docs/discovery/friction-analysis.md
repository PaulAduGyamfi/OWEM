
| Friction point | Frequency | Pain | Automatable? | Deterministic or AI? | Priority |
| --- | --- | --- | --- | --- | --- |
| Enter receipt items High High by hand | High | High | Yes | AI | 1 |
| Track who has repaid | High | High | Yes | Deterministic | 2 |
| Calculate balances / tax / tip | High | Medium | Yes| Deterministic | 3 |
| Remind people who owe | Medium | High | Yes | Deterministic + AI drafting | 4 |
| Remember who ordered what | Medium | Medium | Partly | AI-assisted, human confirmed | 5 |
| Assign items to people | Medium | Medium | Yes | AI propose, code applies | 6 |


## What this tells us
The single worst thing (typing in receipt items) is genuinely ambiguous work - reading a crumpled receipt with abbreviated text. No amount of clever code solves it. That is a real AI problem.
The second and third worst things are NOT AI problems. Balance calculation and payment tracking are ordinary software. If we started by "building agents", we would have wrapped an AI model around arithmetic: slower, more expensive, non-reproducible, and wrong some fraction of the time.
