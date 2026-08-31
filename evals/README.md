# Evals — receipt extraction accuracy

"Which prompt version performed better" is unanswerable retroactively, so this
exists from the first call.

```bash
cd /Users/pauladu/OWEM
backend/.venv/bin/python -m evals.runner.run           # stub reader — free, no network
backend/.venv/bin/python -m evals.runner.run --live    # the real model — costs money
backend/.venv/bin/python -m evals.runner.run --live --case taqueria-faded
```

Reports land in `evals/report/`, with `latest.md` always pointing at the newest.

## What it measures

Accuracy on its own is the less interesting half. The number that matters is
**calibration**: of the lines the model got wrong, how many did it flag below the
0.85 confidence floor?

A wrong line the model was unsure about routes to a human and costs nothing. A
wrong line it was confident about is the one that reaches somebody's balance.
A model at 95% accuracy that knows which 5% it missed is worth more here than one
at 98% that does not.

The report also counts false alarms — correct lines flagged anyway. Those are
cheap but not free: each one is a person asked to check something already right.

## The dataset

`evals/dataset/*.png` is generated from `runner/cases.py`, where the ground truth
lives. Chrome renders them; there is no image dependency.

They are deliberately awkward in the ways real receipts are: abbreviations
(`CHK WNG`), multiples on one line (`2 MARG 26.00`), failing thermal print, a
skew, a discount, `1/2L` where the characters are ambiguous, and one receipt
printed with what looks like an instruction to the model.

Real photographs are better evidence. They are also a small dossier on somebody's
evening, so `evals/dataset/*.jpg|jpeg|png` is gitignored — drop your own in with
a matching entry in `cases.py` and they will be scored alongside.

## Adding a case

Add a `Case` to `runner/cases.py` and run with `--regenerate`. The subtotal and
total are computed from the lines, so ground truth cannot drift from the image.
