# ADR-002: Only the payer has an account ## Status
Accepted - [today's date]
## Context
Group expense apps normally require everyone to sign up. Every interview said getting everyone to install an app was the reason they abandoned Splitwise.
## Decision
V1 has exactly one authenticated actor per event: the payer. Participants are rows owned by the event, identified by name, with no login.
## Consequences
+ Deletes roughly a third of the system: no invites, no participant sessions, no multi-tenant permissions, no real-time sync, no push to non-users.
+ Removes the exact adoption barrier users described.
- Participants cannot check their own balance in-app. They get a
shared summary instead.
- Participant accounts become a V2 project, not a bolt-on.