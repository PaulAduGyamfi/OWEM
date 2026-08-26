# API Design
Base path: /api
## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /events | Create an event |
| GET | /events | List my events |
| GET | /events/{id} | One event with participants + receipt |
| POST | /events/{id}/participants | Add a participant |
| DELETE | /events/{id}/participants/{pid} | Remove (only if unassigned) | | POST | /events/{id}/receipts | Create a receipt |
| POST | /receipts/{id}/items | Add an item |
| PATCH | /receipts/{id}/items/{iid} | Edit item (sets USER_CONFIRMED) |
| DELETE | /receipts/{id}/items/{iid} | Remove an item |
| POST | /receipts/{id}/confirm | Confirm the receipt |
| PUT | /items/{id}/assignments | Replace the FULL assignment set |
| POST | /events/{id}/settlement | Generate a new settlement version |
| GET | /events/{id}/settlement | Latest settlement |
| POST | /events/{id}/payments | Record a payment |
| GET | /events/{id}/balances | Outstanding per participant |
## Two design notes
Assignments use PUT with the COMPLETE set, not POST per person. "Who is on this item" is one logical fact. Replacing it atomically avoids a half-applied state where an item briefly belongs to nobody, and it makes the AI assignment path safe: the AI proposes a complete set, code validates and applies it in one transaction.
Settlement generation is a POST that CREATES a versioned thing, not a GET that calculates on demand. That is INVARIANT 3 showing up in the API.
## Error format - one shape everywhere
{
"error": {
"code": "UNASSIGNED_ITEMS",
"message": "3 items are not assigned to anyone.", "details": { "itemIds": ["...","...","..."] }, "traceId": "0af7651916cd43dd"
} }
## Status codes
400 bad input | 401 not logged in | 403 not your event
404 not found | 409 illegal state change | 422 rule violated
429 too many requests | 500 our fault