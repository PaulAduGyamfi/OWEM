# Data Model

## Money rule

- Stored in Postgres as NUMERIC(12,2)
- Represented in C# as decimal
- Calculated inside the settlement engine as WHOLE CENTS (long) - NEVER float, NEVER double, anywhere, for any reason
Why cents inside the engine: splitting money means dividing and then reconciling the leftover exactly. With whole cents, "the leftover" is a whole number you must explicitly give to someone. There is nowhere for a fraction to hide.

## Provenance rule

Every field that can come from AI carries a provenance tag:


| Value           | Meaning                          | Can the settlement engine use it? |
| --------------- | -------------------------------- | --------------------------------- |
| AI_SUGGESTED    | AI produced it, nobody checked   | **NO**                            |
| USER_CONFIRMED  | a human accepted or corrected it | yes                               |
| SYSTEM_COMPUTED | our own code produced it         | yes                               |


INVARIANT 1: the settlement engine reads ONLY USER_CONFIRMED and SYSTEM_COMPUTED values. Given anything AI_SUGGESTED, it throws an error.

This makes it structurally impossible for
a hallucinated price to impossible.
land in someone's balance. Not unlikely -

## Tables



### users

The payer. The only person who logs in.


| column       | type        | notes       |
| ------------ | ----------- | ----------- |
| id           | uuid        | primary key |
| email        | text        | unique      |
| display_name | text        |             |
| created_at   | timestamptz |             |




### group_events

One dinner. The boundary of


| column        | type        | notes                           |
| ------------- | ----------- | ------------------------------- |
| id            | uuid        | primary key                     |
| owner_user_id | uuid        | ->                              |
| title         | text        | e.g. "Dinner at Rosati's"       |
| currency      | char(3)     | always 'USD' in V1              |
| status        | text        | DRAFT/COLLECTING/SETTLED/CLOSED |
| updated_at    | timestamptz |                                 |




### participants

A person at the dinner. NO login. Just a name. 


| column         | type | notes                      |
| -------------- | ---- | -------------------------- |
| id             | uuid | primary key                |
| event_id       | uuid | -> group_events.id         |
| display_name   | text | unique within the event    |
| is_payer       | bool | exactly one true per event |
| contact_handle | text | optional, for reminders    |




### receipts


| column       | type          | notes                   |
| ------------ | ------------- | ----------------------- |
| id           | uuid          | primary key             |
| event_id     | uuid          | -> group_events.id      |
| image_s3_key | text          | nullable                |
| state        | text          | see state machine below |
| tax          | numeric(12,2) |                         |
| tip          | numeric(12,2) |                         |
| discount     | numeric(12,2) |                         |
| total        | numeric(12,2) |                         |
| tip_policy   | text          | PROPORTIONAL or EQUAL   |
| confirmed_at | timestamptz   | nullable                |




### receipt_items

One line on the receipt.


| column                                                                                                                                                                                                             | type          | notes                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------- |
| id                                                                                                                                                                                                                 | uuid          | primary key                   |
| receipt_id                                                                                                                                                                                                         | uuid          | -> receipts.id                |
| line_number                                                                                                                                                                                                        | int           | unique within receipt         |
| raw_name                                                                                                                                                                                                           | text          | exactly as printed: "CHK WNG" |
| normalized_name                                                                                                                                                                                                    | text          | interpreted: "Chicken Wings"  |
| unit_price                                                                                                                                                                                                         | numeric(12,2) |                               |
| total_price                                                                                                                                                                                                        | numeric(12,2) |                               |
| provenance                                                                                                                                                                                                         | text          | AI_SUGGESTED etc              |
| confidence                                                                                                                                                                                                         | numeric(4,3)  | null unless AI produced it    |
| Why raw_name AND normalized_name: when someone disputes an item, you can show them what was literally printed. It also lets us measure "did the AI read it right" separately from "did the AI interpret it right". |               |                               |




### item_assignments

Links an item to a person, with a weight. 

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| item_id | uuid | -> receipt_items.id |
| participant_id | uuid | -> participants.id | 
| weight | numeric(8,3) | default 1 |
| provenance | text | |


Why a weight and not just a link: "Paul had two of the three beers" is common. Weights (2 and 1) keep the maths uniform. Costs nothing now, saves a migration later.

### settlements
An immutable snapshot of who owes what. 
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| event_id | uuid | -> group_events.id |
| version | int | 1, 2, 3... |
| total_amount | numeric(12,2) | |
| engine_version | text | e.g. "settlement-1.0.0" | 
| created_at | timestamptz | |

INVARIANT 3: a settlement row is NEVER updated. Corrections create a NEW settlement with version + 1.

Why: once you have told people what they owe, that is a promise. If someone edits a receipt item later, you must not silently change what people were told. You generate a new version and show the difference. Recomputing on the fly makes the displayed amount a moving target, which is exactly the trust failure that kills a money app.

### settlement_lines
One person's amount within a settlement. 
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| settlement_id | uuid | -> settlements.id |
| participant_id | uuid | -> participants.id | 
| items_subtotal | numeric(12,2) | |
| tax_share | numeric(12,2) | |
| tip_share | numeric(12,2) | |
| discount_share | numeric(12,2) | |
| amount_owed | numeric(12,2) | |

### payments
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| event_id | uuid | -> group_events.id |
| participant_id | uuid | -> participants.id | 
| amount | numeric(12,2) | must be > 0 |
| method | text | venmo/zelle/cash/other |
| external_ref | text | nullable |
| recorded_at | timestamptz | |
| recorded_by | uuid | -> users.id |

### ai_calls
A record of every single AI request. Written from the very first call, because "which prompt ersion performed better" is unanswerable retroactively.

| column | type | notes | 
|---|---|---|
| id | uuid | primary key |
| event_id | uuid | nullable |
| capability | text | receipt_extraction etc |
| prompt_version | text | |
| model | text | |
| raw_response | jsonb | |
| latency_ms | int | |
| input_tokens | int | |
| output_tokens | int | |
| cost_usd | numeric(10,6) | |
| outcome | text | ok/schema_fail/validation_fail/error | | created_at | timestamptz | |
| created_at | timestamptz | |


NEVER put the receipt image or personal data in this table. Store the S3 key only.
