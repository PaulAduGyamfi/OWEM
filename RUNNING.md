# Running OWEM locally

Three processes: Postgres, the API, the app. Nothing needs an internet
connection except the receipt reader, and even that has an offline stand-in.

**Total, from a fresh clone: about five minutes.**

---

## What you need

| | Why | Check |
|---|---|---|
| Docker | Postgres | `docker --version` |
| Python 3.12 | the backend | `python3.12 --version` |
| Node 20+ | the app | `node --version` |
| Expo Go on your phone | to run it on a real device | App Store |
| An Anthropic API key | to read real receipts | *optional — see [The receipt reader](#the-receipt-reader)* |

Python 3.13+ will not work — the backend pins 3.12.

---

## 1. Database

```bash
cd ~/OWEM
docker compose up -d db
```

One container, `owem-db`, on port 5432. `docker compose ps` should say healthy.

## 2. Backend

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cp .env.example .env
.venv/bin/alembic upgrade head          # creates the 11 tables
.venv/bin/python scripts/seed_demo.py   # a dinner to look at
.venv/bin/uvicorn owem.api.main:app --reload
```

- API: <http://localhost:8000>
- Interactive docs: <http://localhost:8000/docs>
- Pulse: <http://localhost:8000/health>

The seed prints what it made — a $242.79 dinner with $127.63 still out.
Re-run it with `--reset` to start clean.

## 3. App

```bash
cd ../frontend
npm install
cp .env.example .env
npm start
```

Scan the QR with the iPhone **Camera** app (not from inside Expo Go). Press `w`
for a browser instead.

### Pointing the app at the API

`frontend/.env` holds one line that matters:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

**`localhost` works in a browser and in a simulator. It does not work on a real
phone** — to your phone, `localhost` is the phone. Use your Mac's LAN address,
the same one Expo prints in the QR screen:

```bash
ipconfig getifaddr en0        # e.g. 192.168.1.192
```

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.192:8000
```

Then restart the API so it listens beyond loopback:

```bash
.venv/bin/uvicorn owem.api.main:app --reload --host 0.0.0.0
```

Restart `npm start` after editing `.env` — Expo reads it at build time.

### How do I know it connected?

The home screen tells you. Connected, the note under the events reads *"worked
out by the settlement engine"*. Not connected, it turns amber and says it is
running on sample data.

**That fallback is deliberate.** With no backend the app runs the same flow
against an in-memory copy, so you can demo it on a plane. Every screen works in
both modes.

---

## The receipt reader

The camera works without a key. What happens to the photo depends on whether
you have one.

**Without a credential** the backend uses a stub reader that returns one fixed
receipt — the twelve-line Rosati's dinner — whatever you photograph. Two of its
lines score below the confidence floor, so the review-and-confirm path is
exercised properly. It costs nothing and needs no network.

**With a credential** the photo goes to Claude and comes back as whatever the
receipt actually says.

```bash
ant auth login                 # stores a profile the SDK finds on its own
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Restart the API. It picks the reader at startup and logs which one to
`ai_calls`. To force one or the other, set `AI_USE_STUB=true|false` in
`backend/.env`.

Whichever reader runs, **every line it produces is `AI_SUGGESTED`** and the
settlement engine refuses those. That is enforced in code, not in a prompt —
`compute_settlement` raises before it will do arithmetic on an unconfirmed value.

### iPhones shoot HEIC; the vision API does not read it

The app captures JPEG explicitly for this reason. If you send a HEIC some other
way you get a clear error rather than a provider rejection.

---

## Walking the whole flow

1. **+** on the dock → name the dinner → add three people
2. The lime shutter → the receipt is read (~5s live, instant on the stub)
3. **Review items.** Every line is amber, *Needs you*. The CTA is locked until
   you open the two low-confidence lines and confirm each
4. **Confirm all 12 lines** → tax and tip → assign → **Work out the balances**
5. **Collect** → *Ask* opens the rail; *Mark paid* is a slide, not a tap

`docs/prototype/walkthrough.md` has the tester script and the questions worth
asking afterwards.

---

## Tests

```bash
cd backend
.venv/bin/pytest                    # 297 tests
.venv/bin/pytest -m live_ai         # the one that calls Claude and costs money
.venv/bin/ruff check owem tests
.venv/bin/mypy -p owem

cd ../frontend
npm test                            # money + settlement engine
npm run typecheck
```

API tests need Postgres running; they skip cleanly without it.

## Evals

How accurate is the reader, and does it know when it is wrong?

```bash
cd ~/OWEM
backend/.venv/bin/python -m evals.runner.run          # stub — proves the harness
backend/.venv/bin/python -m evals.runner.run --live   # the real thing
```

Reports land in `evals/report/latest.md`. See `evals/README.md` for what the
numbers mean — the headline is calibration, not raw accuracy.

---

## When it will not start

**`connection refused` on 5432** — `docker compose up -d db`, then
`docker compose ps` to confirm healthy.

**`relation "group_events" does not exist`** — migrations have not run:
`.venv/bin/alembic upgrade head`.

**The app says offline but the API is up** — nine times in ten it is the URL.
A phone cannot reach `localhost`; see [above](#pointing-the-app-at-the-api).
After that, check the API is bound to `0.0.0.0`, and that your Mac's firewall
is not blocking Node.

**Expo Go says the project is incompatible** — Expo Go supports exactly one SDK
at a time and this project is pinned to match. Check with:

```bash
curl -s https://api.expo.dev/v2/versions/latest | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['expoGoSdkVersion'])"
```

If that number is not 54, see `frontend/README.md`.

**The QR scans but never loads** — a locked-down network blocking device-to-
device traffic. `npx expo start --tunnel`.

**`ModuleNotFoundError: owem`** — you are outside the venv. Use
`.venv/bin/python`, not `python`.

---

## Where things are

```
backend/     FastAPI + SQLAlchemy. Money is Decimal at the edges, int cents inside.
frontend/    Expo app. Works against the API or its own mock.
evals/       Receipt-reading accuracy, with generated ground truth.
prompts/     The extraction prompt, versioned.
docs/        Architecture, decisions, the design system, the tester walkthrough.
```

`backend/README.md` explains the layering and the two invariants.
`frontend/README.md` covers the app and the Expo Go SDK pin.
