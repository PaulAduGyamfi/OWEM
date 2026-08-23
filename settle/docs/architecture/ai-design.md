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
