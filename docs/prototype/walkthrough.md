# Prototype walkthrough

For running the Phase 1 prototype in front of a tester. Hand them the phone and
say nothing beyond the prompt in bold; the point is to find out what they
understand without help.

Run it with `cd frontend && npm start`, then scan the QR with the iPhone Camera
app to open it in Expo Go. Reset between testers under
**You → Start the demo over**.

## What a tester finds on open

Three events, seeded so the app is not empty:

| Event | State | Still out |
|---|---|---|
| Dinner at Rosati's | mid-collection, Manny paid, Nia part-paid | $127.63 |
| Taco night at Vera's | nobody has paid | $46.20 |
| Kai's birthday · Ombu | everyone squared up | $0.00 |

Home shows **$173.83** — the sum of the three, computed, not typed.

## Path A · the whole flow, from nothing (4–6 min)

> **"You just paid for dinner for four people. Sort it out."**

1. **+** on the home dock → **New event** → name it → *Add people*
2. Type three names, Enter after each → *Next: the receipt*
3. The lime shutter → the model reads the receipt (~3s)
4. **Review items.** Every line is amber: *Needs you*. The green banner shows the
   lines add up to $186.40. The CTA is greyed — **2 lines need you**.
   - *Watch for:* do they understand why they cannot continue?
5. Tap **Chicken Wings** → the sheet shows `CHK WNG`, 71% confidence, the price
   → *That's right*. Repeat for **Margarita**.
6. The CTA unlocks → **Confirm all 12 lines**
7. **Tax & tip.** Tax came off the receipt. Drag the ruler or tap 20%. Try
   **Split evenly** vs **Split in proportion** and watch the totals.
8. **Assign items.** Tap a line → pick people → the ± steppers handle "two of the
   three beers". *Everyone on everything* fills the rest.
   - The CTA stays grey until every line has somebody on it.
9. **Work out the balances** → the settlement, with the proof line: the shares
   add up to the exact printed total.

## Path B · collecting (2–3 min)

> **"Albert still hasn't paid you. Chase him."**

1. Home → **Dinner at Rosati's** → Collect
2. **Ask** on Albert → the request sheet. Pick a rail. Read the small print:
   OWEM does not move the money and does not watch your bank.
3. **Mark paid** → the amount is pre-filled → **slide** to record it.
   - *Watch for:* do they try to tap the slider? That is the point of it.
4. Try a **part payment**: tap *Part of it*, enter 20.00, slide. Albert's row
   becomes "left of".
5. **Nudge the 3 who owe** → the AI draft, tagged *not sent*. Change the tone.
   Nothing sends until they approve.

## Path C · the correction (1 min)

> **"Devon says he never touched the wings."**

1. Settlement → **Change who had what** → Chicken Wings → deselect Devon → Save
2. **Save as version 2** → the settlement is regenerated
3. Tap the **VERSION 2** badge → History shows both versions side by side, what
   each person's amount was before and after, and that the total never moved.
   - *Watch for:* do they notice the ±$0.01 on two people? That is the rounding
     remainder moving, and it is honest.

## Questions worth asking afterwards

1. What did the amber "Needs you" mean to you?
2. When you slid to record Albert's payment — what did you expect to happen to
   his money?
3. Version 2 changed three people's amounts. Whose money moved, and where did it
   come from?
4. Was there any number on any screen you did not trust?

## Known stand-ins — say so only if asked

The camera returns the same receipt every time; extraction is a timer, not a
model; payment rails open a deep link and nothing reports back; there is no
account and no server. Every amount, though, is worked out by the same rules the
real engine will use.
