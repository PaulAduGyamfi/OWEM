1. Payer photographs the receipt
2. System extracts structured receipt data [AI]
3. System validates totals and internal consistency [DETERMINISTIC]
4. Payer verifies only the uncertain fields [HUMAN-IN-THE-LOOP]
5. Payer creates participants [DETERMINISTIC]
6. Items claimed / assigned [AI PROPOSES, CODE APPLIES]
7. Shared items split [DETERMINISTIC]
8. Settlement engine calculates balances [DETERMINISTIC]
9. Each participant's amount is displayed [DETERMINISTIC]
10. Payments recorded as they arrive [DETERMINISTIC]
11. Outstanding participants reminded [AI DRAFTS, HUMAN APPROVES]





## Pieces of the system

Phone / web app (Expo, React Native, TypeScript)

           |

         HTTPS

          |

API (python)
         
         |
         +--> PostgreSQL (all data)
         +--> AWS S3 (receipt photos)
          +--> AI provider (reads receipt photos)










## Backend layers - dependencies point INWARD only

- The backend uses a four-layer structure, and dependencies point inward only:

HTTP

v

Controller (parse, authorize, map DTOs. NO business logic.) 

v

Application Service (orchestration, transactions, use-case flow)

v

Domain (entities, value objects, settlement engine. NO framework, NO database, NO HTTP, NO AI.)

v

Repository (persistence interface)

v

PostgreSQL


## Why the Domain layer knows nothing about anything
The settlement engine must be testable as a pure function. If it needed a database to run, the tests would need a database, they would be slow, we would write fewer of them, and correctness would suffer.
A pure domain means a thousand settlement tests run in under a second. That is the whole reason for this structure.
INVARIANT 2: the Domain project references no database, no HTTP, no AI library. Enforced by having no such packages installed.