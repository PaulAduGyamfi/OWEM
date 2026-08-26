AI interprets. Software decides and calculates.

# Deterministic — same input always produces the same output:
All arithmetic: $30 / 3 = $10 Tax allocation
Tip allocation
Discount allocation
Rounding and remainder distribution Balance calculation
Settlement generation
Payment status and reconciliation Database reads and writes Authentication and authorization Permission checks
State machine transitions
Validation of every kind
API request/response handling Creating users, events, participants

# AI — the input contains genuine ambiguity
Reading a receipt image
Interpreting "CHK WNG" as "Chicken Wings"
Inferring that "2 MARG" means two margaritas at $X each Parsing "everyone had the wings except John" Normalizing merchant names
Drafting a natural-sounding reminder message


| Provenance | Meaning | May feed the settlement engine? |
| --- | --- | --- | 
| AI_SUGGESTED | Produced by a model, not yet reviewed | No |
| USER_CONFIRMED | HA human accepted or corrected it | Yes |
| SYSTEM_COMPUTED | Produced by deterministic code | Yes |


Rules:
INVARIANT 1. The settlement engine reads only USER_CONFIRMED and SYSTEM_COMPUTED values. If it encounters an AI_SUGGESTED value in its inputs, it throws. This is enforced by a guard clause at the engine boundary and covered by a
unit test.


## Provenance and the trust boundary
AI_SUGGESTED -> (human confirms) -> USER_CONFIRMED
INVARIANT 1: the settlement engine reads only USER_CONFIRMED and SYSTEM_COMPUTED. Given an AI_SUGGESTED value it throws.
This lets us say something strong and true: no value an AI produced has ever entered a balance without a human seeing it. That is a claim about architecture, not about model quality, which is why it survives changing models.
## Receipt extraction contract
The AI must return EXACTLY this
{
"merchant": "string | null", "currency": "USD",
"items": [
{
"rawName": "string", "normalizedName": "string "quantity": 1, "unitPrice": 0.00, "totalPrice": 0.00, "confidence": 0.95
} ],
"subtotal": 0.00,
"tax": 0.00,
"tip": 0.00,
"discount": 0.00,
"total": 0.00, "extractionConfidence": 0.95, "notes": "string | null"
}
shape:
| null",
We are not asking "what does this receipt say" (an open question with an unbounded answer). We are asking "convert this image into exactly this structure". A constrained model is a testable model.
## Validation
1. Schema 2. Types 3. Maths
4. Domain
5. Confidence
layers - never trust AI output
- is the shape right?
- are the prices actually numbers?
- do item totals equal subtotal (within 5 cents)?
does subtotal + tax + tip - discount = total? - tax >= 0? tip >= 0? tax <= 20% of subtotal?
- item < 0.85 or receipt < 0.90 -> human review
Receipts are self-validating: they contain redundant information, and that redundancy is what lets ordinary code catch AI mistakes. That is the general pattern - find the arithmetic the problem already gives you and use it as a checksum on the model.




| Agent | CAN | CANNOT |
|---|---|---|
| Receipt | read image, propose items, flag problems, request confirmation | confirm a receipt, change a settlement, send money
| Assignment | read participants/items, propose assignments | change a confirmed settlement, change any amount, mark anyone paid |
| Reminder | read balances, draft text, schedule approved reminder | move money, change a debt, mark anyone paid, send without approval |




Every CANNOT is something a helpful-seeming model might attempt. "Mark someone as paid" is the clearest: an agent could conclude that a participant who said "sent it!" should be marked paid. That is a financial change based on an interpretation. It needs a human.

Permissions are enforced in the code that runs each tool, NOT in the prompt. A prompt is a request. A permission check is a guarantee.

