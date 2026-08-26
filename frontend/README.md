# OWEM — Phase 1 prototype

A clickable, mostly-static Expo app. It walks a payer through the whole flow —
photograph a receipt, confirm what the model read, say who had what, settle,
collect — with no backend, no network calls and no AI provider.

```bash
npm install
npm start        # then scan the QR with the iPhone Camera app
npm test         # money + settlement engine
npm run typecheck
```

## Testing on a phone

Install **Expo Go** from the App Store, run `npm start`, and scan the QR code with
the iPhone **Camera** app (not from inside Expo Go). Mac and phone must share a
Wi-Fi network; on a locked-down network use `npx expo start --tunnel`.

**The project is pinned to Expo SDK 54 on purpose.** Since SDK 53, the App Store
build of Expo Go supports exactly one SDK at a time, and that is currently 54 — a
project on a newer SDK is rejected with "incompatible with this version of Expo
Go" no matter how up to date the client is. Check what the store client supports
before bumping:

```bash
curl -s https://api.expo.dev/v2/versions/latest | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['expoGoSdkVersion'])"
```

Going past that number means giving up Expo Go and building a development client
(`npx expo run:ios --device`, which needs Xcode, or EAS Build, which needs a paid
Apple Developer account). Nothing in this prototype needs an API newer than 54 —
`expo-glass-effect` and Reanimated 4 are both in it.

## What is real and what is a stand-in

| Real | Stand-in |
|---|---|
| Every amount on screen, worked out from the data by `lib/settlement.ts` | The camera: the shutter returns a fixed 12-line receipt |
| Provenance — a line the model produced cannot reach the maths until you confirm it | The extraction itself: a timer, not a model |
| Versioned settlements, never edited in place | The rails: deep links open, nothing reports back |
| Payments, part-payments and the running balance | Auth: you are always Paul |

Nothing is hardcoded that ought to be computed. Change who is on the chicken
wings and every balance moves, including the odd cent.

## Brand assets

`assets/images/` holds the shipped marks, taken from the lime export
(`~/Downloads/expo 2`), not redrawn:

| File | What it is |
|---|---|
| `icon.png` | 1024² app icon — ink mark on `#C9F31D`, fully opaque (iOS forbids alpha) |
| `adaptive-icon.png` | 1024² Android foreground — transparent, mark inside the 66% safe zone |
| `splash-icon.png` | the same transparent mark, used by the splash plugin at `imageWidth: 220` |
| `splash-full.png` | 1284×2778 full-bleed lime splash, the one Expo Go actually shows |
| `favicon.png` | 48² web favicon |

The lime in every file is exactly `#C9F31D` — the `accent` token in
`theme/tokens.ts`, so the splash hands off to the app with no colour shift.

**Why the splash is configured twice.** The `expo-splash-screen` plugin only takes
effect when native projects are generated (prebuild / EAS). Expo Go reads the
legacy top-level `splash` key instead, and with the plugin alone that key resolves
to `null` — you get Expo Go's blank default. `app.json` therefore carries both:
the plugin for real builds, the legacy key for Expo Go. Verify with:

```bash
npx expo config --type public --json | python3 -c "import json,sys; print(json.load(sys.stdin)['expo']['splash'])"
```

## Layout

```
app/                     expo-router routes, one file per screen
  index.tsx              welcome
  (tabs)/                events · balances · you
  event/new.tsx
  event/[id]/            participants → capture → extracting → review →
                         charges → assign → settlement → collect → settled
components/ui/           the kit: Button, Sheet, Avatar, TabBar, SlideToConfirm…
components/owem/         domain pieces: ItemRow, AssignSheet, PaymentSheets…
theme/                   tokens from docs/OWEM Color Palette.md + docs/design-system.md
lib/                     types · money · settlement · api · store · mock
```

## The seam Phase 2 swaps

`lib/api.ts` is the mock backend. Every function is named after the endpoint it
stands in for, from `docs/architecture/api-design.md`:

```ts
createEvent      → POST /events
putAssignments   → PUT  /items/{id}/assignments
createSettlement → POST /events/{id}/settlement
createPayment    → POST /events/{id}/payments
```

Replacing the body of each with a `fetch` is the whole migration. `lib/store.tsx`
(the React binding) and every screen and component stay as they are.

`lib/settlement.ts` is deleted at that point — the real engine lives in
`Owem.Domain` and the app stops doing arithmetic altogether.

## Money

Whole cents everywhere, in a branded `Cents` type so a dollar `number` cannot be
passed by mistake. `allocate()` splits by largest remainder so the parts always
sum to the whole; `assertSumsTo()` throws if they ever do not. There is no
`float` and no `parseFloat` in this codebase.

## Two rules the code enforces

- **INVARIANT 1** — `computeSettlement()` throws `UnconfirmedInputError` if it is
  handed anything still marked `AI_SUGGESTED`. The review screen is the door.
- **INVARIANT 3** — a settlement is never updated. Re-settling after an edit
  writes version + 1 and the history screen shows what moved.

## Design

iOS-first. Colour from `docs/OWEM Color Palette.md`: system neutrals, acid lime
spent exactly once per screen on the one action, status colours reserved for
money. Geometry, type and motion from `docs/design-system.md`. Glass is used on
the navigation layer only. Dark mode is a first-class mode, switchable under You.
