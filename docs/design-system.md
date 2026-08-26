# Orbit — Mobile Design System

A design system extracted from a reference set of 11 fintech and social product screens.
Version 1.0 · Mobile-first (iOS-led), adaptable to web.

---

## 1. What this system is

Two product families run through the references: **money movement** (wallets, transfer confirmation, payment sheets) and **people** (circles, invites, family feeds, profiles). They share one visual grammar:

- A **near-monochrome base** — pure white or pure black — with exactly one chromatic accent per product.
- **Pill geometry.** Primary actions, navigation, chips, and filters are all fully-rounded. Nothing important is a rectangle.
- **Sheets over pages.** Consequential moments (paying, confirming, viewing a transaction) arrive as a bottom sheet on a dimmed parent, never a full-screen route change.
- **People are rendered as circles in a cluster.** The avatar constellation is the recurring hero motif — it carries social weight without a photograph or illustration.
- **Numbers are the display type.** The largest text on any money screen is a currency figure, not a headline.

### Design principles

1. **The amount is the interface.** On any transactional screen, the number is set largest and everything else recedes to a label. If the user reads one thing, it should be what it costs.
2. **One accent, spent once.** Violet or blue appears on the single action the user came to take. A second accent on the same screen means one of them is decoration.
3. **Confirm in place.** Destructive or irreversible actions are confirmed in a sheet that keeps the origin visible behind it, so the user never loses their place.
4. **Chrome floats, content scrolls.** Navigation detaches from the screen edge and rides above content. Content owns the full canvas.
5. **Quiet until it matters.** Color is reserved for state (`+` green, `−` red, brand logos in lists). Neutral is the default, not the fallback.

---

## 2. Color

### 2.1 Neutrals — the spine of the system

| Token | Hex | Use |
|---|---|---|
| `--ink-900` | `#0A0A0B` | Primary buttons (light mode), dark surfaces, headings |
| `--ink-800` | `#1C1C1E` | Elevated dark cards, dark-mode sheet fill |
| `--ink-700` | `#2C2C2E` | Dark-mode row fill, dark divider |
| `--ink-500` | `#636366` | Body text on light |
| `--ink-400` | `#8E8E93` | Secondary labels, row subtitles, metadata |
| `--ink-300` | `#C7C7CC` | Placeholder text, disabled glyphs |
| `--ink-200` | `#E5E5EA` | Hairline separators, input borders |
| `--ink-100` | `#F2F2F7` | Grouped background, inactive chip fill, sheet header |
| `--ink-050` | `#FAFAFA` | Page background (light) |
| `--white` | `#FFFFFF` | Cards, sheets, primary button label on dark |

### 2.2 Accents — pick one per product

| Token | Hex | Sourced from | Use |
|---|---|---|---|
| `--accent-violet` | `#6042E4` | Payment sheet | Money-movement products. Primary CTA fill, links, active icon. |
| `--accent-violet-tint` | `#EEEAFD` | — | Selected row background, icon container behind violet glyph |
| `--accent-blue` | `#2F9BFF` | Family social app | Social products. FAB fill, verified badge, active tab. |
| `--accent-blue-tint` | `#E7F2FF` | — | Story ring background, selected chip |

Only one accent family ships in a given product. The other exists so the system covers both halves of the reference set — it is not a secondary color to mix in.

### 2.3 Semantic

| Token | Hex | Meaning |
|---|---|---|
| `--positive` | `#2EBD59` | Money in, APY, gains, success status |
| `--positive-tint` | `#E6F7EC` | Yield badge background |
| `--negative` | `#FF3B30` | Money out, errors, destructive |
| `--warning` | `#FF9F0A` | Pending, action needed |
| `--info` | `#2F9BFF` | Neutral informational state |

Amounts always carry a sign, and the sign carries the color: `+$30` in `--positive`, `-$15.99` in `--negative`. A balance figure with no direction stays `--ink-900`.

### 2.4 Ambient backgrounds

Two references use a soft atmospheric wash instead of flat white. Use for onboarding, empty states, and marketing screens only — never behind dense data.

```css
--wash-dawn:  linear-gradient(160deg, #EAF3FF 0%, #FFFFFF 45%, #FDF0F5 100%);
--wash-sky:   linear-gradient(180deg, #A9DCF7 0%, #E8F4FD 60%, #FFFFFF 100%);
```

### 2.5 Dark mode

Dark is a first-class mode, not an inversion. Surfaces get *lighter* as they get closer to the user.

| Role | Light | Dark |
|---|---|---|
| Page background | `#FAFAFA` | `#000000` |
| Card / sheet | `#FFFFFF` | `#1C1C1E` |
| Raised row | `#F2F2F7` | `#2C2C2E` |
| Primary text | `#0A0A0B` | `#FFFFFF` |
| Secondary text | `#8E8E93` | `#98989F` |
| Separator | `#E5E5EA` | `#38383A` |
| Primary button | fill `#0A0A0B`, label `#FFFFFF` | fill `#FFFFFF`, label `#0A0A0B` |

The primary button inverts. That inversion is the single most reliable signal of which mode the user is in.

---

## 3. Typography

**Display & UI:** SF Pro Display / SF Pro Text on Apple platforms; Inter as the cross-platform substitute.
**Numerals:** SF Pro with `font-variant-numeric: tabular-nums` on anything that updates in place (balances, running totals, transaction lists) so digits don't jitter.

### 3.1 Scale

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | 44 / 48 | 700 | −0.03em | Hero balance, sheet total (`$990.00`, `$126,300.00`) |
| `display-lg` | 34 / 40 | 700 | −0.02em | Secondary amount, transaction detail figure |
| `title-1` | 28 / 34 | 700 | −0.02em | Onboarding headline, page hero |
| `title-2` | 22 / 28 | 600 | −0.01em | Sheet title, section hero |
| `title-3` | 17 / 22 | 600 | 0 | Card title, list group header |
| `body` | 16 / 24 | 400 | 0 | Paragraphs, descriptions |
| `body-strong` | 16 / 22 | 600 | 0 | Row primary label, button text |
| `callout` | 15 / 20 | 500 | 0 | Row values, chip labels |
| `footnote` | 13 / 18 | 400 | 0 | Row subtitle, timestamps, helper text |
| `caption` | 11 / 14 | 500 | 0.02em | Tab labels, badge counts, eyebrows |

### 3.2 Rules

- **One weight jump per hierarchy step.** 400 → 600 → 700. Never 500 next to 600 in the same block; the difference reads as a rendering bug.
- **Negative tracking above 22px only.** Below that it hurts legibility at arm's length.
- **Sentence case everywhere**, including buttons. No all-caps except `caption` eyebrows.
- **Currency symbol matches the figure's weight and size.** Don't superscript it; don't shrink it. `$990.00` is one typographic object.
- **Decimals stay full size** on totals under six figures. Only shrink cents when the integer part exceeds 6 digits and would otherwise wrap.

---

## 4. Space & layout

A **4pt base grid**; every spacing token is a multiple of 4.

| Token | px | Typical use |
|---|---|---|
| `space-1` | 4 | Icon-to-badge, tight inline gaps |
| `space-2` | 8 | Label-to-value inside a row |
| `space-3` | 12 | Avatar-to-text, chip padding |
| `space-4` | 16 | **Default.** Screen gutter, card padding, row padding |
| `space-5` | 20 | Sheet horizontal padding |
| `space-6` | 24 | Between content groups |
| `space-8` | 32 | Section separation |
| `space-10` | 40 | Above a primary CTA |
| `space-12` | 48 | Hero top/bottom breathing room |

### Layout constants

- **Screen gutter:** 16px (20px inside bottom sheets — sheets feel more contained).
- **List row height:** 56px single-line, 64px with subtitle, 72px with avatar + subtitle.
- **Tap target:** 44 × 44 minimum, always.
- **Safe area:** floating navigation sits `space-4` above the home indicator; scroll containers add 96px bottom padding so content clears the dock.
- **Content max-width (web):** 1120px, centered, with the hero cluster capped at 640px.

---

## 5. Shape & elevation

### Radius

| Token | px | Applied to |
|---|---|---|
| `radius-sm` | 8 | Icon containers, small badges |
| `radius-md` | 12 | Inputs, inline chips |
| `radius-lg` | 16 | List rows, grouped row blocks |
| `radius-xl` | 20 | Cards, images in a feed |
| `radius-2xl` | 28 | Bottom sheets (top corners), balance card |
| `radius-full` | 999 | Buttons, avatars, tab bar, FAB, filter chips |

Nested corners follow `inner = outer − padding`. A 16px row inside a 28px sheet with 12px padding is correct; two identical radii nested look like a mistake.

### Elevation

Shadows are soft, low-opacity, and vertically offset — never spread wide. Dark mode replaces shadow with surface lightening.

```css
--shadow-sheet: 0 -8px 40px rgba(10, 10, 11, 0.12);
--shadow-float: 0 8px 24px rgba(10, 10, 11, 0.14);  /* tab bar, FAB */
--shadow-card:  0 2px 12px rgba(10, 10, 11, 0.06);
--shadow-press: 0 1px 4px  rgba(10, 10, 11, 0.10);
```

Behind any sheet: `rgba(10, 10, 11, 0.4)` scrim, plus 20px backdrop blur where the platform supports it.

---

## 6. Components

### 6.1 Button

| Variant | Fill | Label | Border |
|---|---|---|---|
| Primary | `--ink-900` (light) / `--white` (dark) | inverse | none |
| Accent | `--accent-violet` | `--white` | none |
| Secondary | `--ink-100` | `--ink-900` | none |
| Tertiary | transparent | `--ink-900` | 1px `--ink-200` |
| Ghost | transparent | `--accent` | none |
| Disabled | `--ink-100` | `--ink-300` | none |

**Geometry:** `radius-full` at every size. Height 56 (large, full-width CTA) / 48 (standard) / 36 (compact, inline). Horizontal padding 24 / 20 / 16.

**Slide-to-confirm.** For irreversible money movement, the primary button carries a leading white circular thumb with an arrow glyph. The user drags to commit; tapping alone does nothing. Reserve this for a single action per flow — its power comes from being rare.

**States:** press scales to 0.97 over 120ms; loading swaps the label for a 20px spinner and keeps the button's width fixed; success morphs to a checkmark for 800ms before dismissal.

### 6.2 Bottom sheet

The primary surface for decisions.

```
┌─────────────────────────────┐
│ ●  Title            (×)     │  ← 24px icon, title-2, close on ink-100 circle
├─────────────────────────────┤
│  To                  Payee  │  ← grouped rows, radius-lg
│  From             •••• 9460 │
│  Date             09/17/24  │
│  Fee (0%)            $0.00  │
├─────────────────────────────┤
│  Total                      │  ← label footnote / ink-400
│  $990.00        See details │  ← display-xl / accent link
├─────────────────────────────┤
│  ( → ) ── Pay in full ────  │  ← 56px, full-width, accent
└─────────────────────────────┘
```

- Top corners `radius-2xl`; bottom corners square (they meet the screen edge).
- 4px × 36px grab handle in `--ink-200`, centered, 8px from the top, on any sheet that supports drag-dismiss.
- Detents: `medium` (~50%) and `large` (~92%). Never full height — the parent screen must stay partly visible.
- Close affordance is a 32px `--ink-100` circle with an × glyph, top-right. It coexists with the grab handle; don't drop it.

### 6.3 List row

The workhorse of every wallet and contact screen.

```
[ 40px avatar/icon ]  Primary label            $150.00
                      Secondary label          2:47 PM
```

- Leading: 40px circle (avatar) or 36px `radius-sm` container (brand/app icon on its own tinted background).
- Primary label `body-strong`, secondary `footnote` in `--ink-400`.
- Trailing: value in `callout` with tabular numerals, or a chevron, or a trailing action pill ("Invite" / "Invited" for the used state).
- Separator: 1px `--ink-200` inset to the text's left edge, never full-bleed.
- Grouped rows sit in a single `radius-lg` container; separators appear only *between* rows, never above the first or below the last.

### 6.4 Avatar & avatar cluster

**Avatar sizes:** 24 (inline mention), 32 (compact row), 40 (list row), 56 (profile row), 96 (profile header). Always `radius-full`. Fallback is the person's initials in `body-strong` on a deterministic tint derived from their name.

**Cluster** — the system's signature element. A ring or bloom of avatars at varied sizes, used as the hero for anything about people: an empty circle, a join page, an invite prompt, a group card.

- Sizes vary 32–72px within one cluster; the variance is what makes it feel like a crowd rather than a grid.
- Arrange on 2–3 concentric rings with organic jitter — 8–14° of angular offset and ±6px radial offset per avatar. A perfect ring reads as a loading spinner.
- Cap at ~24 avatars; overflow becomes a `+N` circle in `--ink-100`.
- Ring shells: 4 members and under → single ring; 5–12 → double ring; 13+ → triple ring with the largest avatars at center.
- When used as a group card, the cluster sits inside a `--ink-050` circle with the group name in `title-3` and member count in `footnote` beneath.

**Stack** (overlapping row): −12px overlap, 2px `--white` ring on each avatar, maximum 4 visible then `+N`.

### 6.5 Floating tab bar

Detached from the screen edge and the full width.

- Pill container, `radius-full`, height 56, `--ink-900` fill in light mode / `--ink-800` in dark, `--shadow-float`.
- 3–4 destinations. Active icon fills solid in `--white`; inactive at 45% opacity. Labels optional — with 3 destinations, drop them.
- Optional adjacent FAB: a separate 56px circle in the accent, offset 12px to the right of the pill. Kept separate so the primary create action never competes with navigation.

### 6.6 Amount input

For entering a transfer value.

- A horizontal tick ruler above the figure — hairlines in `--ink-200`, every fifth tick taller, with the center tick in `--ink-900` marking the current value. Drag to adjust; tap the figure to enter numerically.
- The figure itself is `display-xl`, centered, with the currency symbol locked to the left of the digits.
- Below: a "Sending to" row showing the recipient's avatar and name — so the amount and the destination are never separated.

### 6.7 Chip & badge

- **Filter chip:** `radius-full`, height 36, `--ink-100` fill / `--ink-900` label; selected inverts to `--ink-900` / `--white`.
- **Status badge:** `radius-full`, height 24, `caption`, tinted fill (`--positive-tint` with `--positive` text).
- **Count badge:** 20px circle, accent fill, white `caption`, positioned at the top-right of its anchor with a 2px surface-colored ring.
- **Relationship tag** (social): 24px pill, `--ink-100`, `caption` — "Brother", "Co-worker". Sits at the trailing edge of a post header.

### 6.8 Input

Height 48, `radius-md`, `--ink-100` fill, no border at rest. Placeholder `--ink-300`. Focused state: `--white` fill with a 1.5px accent border. Leading search glyph in `--ink-400`, 16px, inset 12px. Error state swaps the border to `--negative` and prints the reason in `footnote` beneath — what happened and how to fix it, never just "Invalid".

### 6.9 Balance card

- Full-bleed `--ink-900` panel, `radius-2xl` on the bottom corners, occupying the top third.
- Currency selector as a small caret chip at top; label in `footnote` at 60% white; figure in `display-xl`.
- Two to three circular 48px action buttons beneath (send/receive, add), outlined in 1px white at 20% opacity.
- The transaction list slides up over it as a white `radius-2xl` sheet — that overlap is what gives the screen its depth.

---

## 7. Iconography

- **Style:** rounded outline, 1.75px stroke, 24px canvas, 2px corner radius on joins. Filled variants exist only for active navigation states.
- **Optical sizing:** 20px for inline/row use, 24px for navigation and headers, 28px for standalone actions.
- **Brand logos** (Spotify, YouTube, a bank) keep their own color and sit inside a 36px `radius-sm` white or tinted container. They're the only saturated color permitted inside a list.
- Never mix filled and outline icons in the same row or tab bar.

---

## 8. Motion

| Token | Duration | Curve | Use |
|---|---|---|---|
| `motion-instant` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` | Press, toggle, chip select |
| `motion-quick` | 240ms | `cubic-bezier(0.2, 0, 0, 1)` | Row expand, badge, tooltip |
| `motion-sheet` | 380ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet present / dismiss |
| `motion-hero` | 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Cluster assembly, onboarding entrance |

**Signature moment:** the avatar cluster assembles on entrance — avatars scale from 0.6 to 1 with a 30ms stagger, ordered from the center ring outward. It runs once per session, on the first screen where the cluster appears. Repeating it on every navigation turns a delight into a tax.

Sheets always animate from the bottom edge with the scrim fading in parallel. Nothing bounces — overshoot on a payment confirmation reads as instability.

Respect `prefers-reduced-motion`: replace all transforms with 120ms opacity fades and render the cluster in its final position.

---

## 9. Accessibility

- Contrast: 4.5:1 for body, 3:1 for text above 24px and for icon glyphs. `--ink-400` on `--white` passes at 4.6:1 — it is the lightest text permitted on a light surface.
- **Never rely on color alone for amount direction.** The `+` / `−` sign does the work; green and red reinforce it.
- Every avatar carries the person's name as its accessible label. A cluster is one group element labeled "24 members" with individual avatars available on focus — not 24 separate tab stops.
- Sheets trap focus, dismiss on Escape, and return focus to the control that opened them.
- The slide-to-confirm control exposes a standard button role to assistive technology with an explicit confirmation step; the gesture is a visual affordance, not the only path.
- Tab bar items announce their selected state and position ("Home, tab 1 of 3, selected").

---

## 10. Code tokens

```css
:root {
  /* neutrals */
  --ink-900: #0A0A0B; --ink-800: #1C1C1E; --ink-700: #2C2C2E;
  --ink-500: #636366; --ink-400: #8E8E93; --ink-300: #C7C7CC;
  --ink-200: #E5E5EA; --ink-100: #F2F2F7; --ink-050: #FAFAFA;
  --white:   #FFFFFF;

  /* accent */
  --accent:        #6042E4;
  --accent-tint:   #EEEAFD;
  --accent-social: #2F9BFF;

  /* semantic */
  --positive: #2EBD59; --positive-tint: #E6F7EC;
  --negative: #FF3B30; --warning: #FF9F0A;

  /* space */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;

  /* radius */
  --radius-sm: 8px;  --radius-md: 12px; --radius-lg: 16px;
  --radius-xl: 20px; --radius-2xl: 28px; --radius-full: 999px;

  /* type */
  --font-ui: "SF Pro Text", Inter, -apple-system, system-ui, sans-serif;
  --font-display: "SF Pro Display", Inter, -apple-system, sans-serif;

  /* elevation */
  --shadow-sheet: 0 -8px 40px rgba(10,10,11,.12);
  --shadow-float: 0 8px 24px rgba(10,10,11,.14);
  --shadow-card:  0 2px 12px rgba(10,10,11,.06);

  /* motion */
  --ease-out: cubic-bezier(.2,0,0,1);
  --ease-sheet: cubic-bezier(.32,.72,0,1);
}
```

---

## 11. Voice

- **Sentence case, active voice, plain verbs.** "Pay in full", "Send money", "Join now" — never "Submit" or "Proceed".
- **An action keeps its name.** The button that says "Pay in full" produces a confirmation that says "Paid in full".
- **Labels label; values value.** "Fee (0%)" on the left, "$0.00" on the right. The label never editorializes.
- **Empty states invite.** "Wanna create a new Circle? Tap the plus below" works because it names the exact control. "No circles yet" doesn't.
- **Errors explain and repair.** What happened, then what to do. No apology, no vagueness.
- **Permission prompts state the benefit, not the mechanism.** "Don't miss out on what your friends are up to" over "Enable push notifications".

---

## 12. Do / Don't

| Do | Don't |
|---|---|
| One accent color per product | Violet CTA next to a blue FAB on the same screen |
| Confirm money in a sheet over the origin screen | Route to a full-page confirmation |
| Vary avatar sizes in a cluster | Lay avatars out on an even grid |
| Float the tab bar with shadow | Pin an edge-to-edge bar to the bottom |
| Set the amount as the largest element | Give the screen a headline that outranks the number |
| Use tabular numerals in lists | Let digits shift width as values update |
| Keep the slide-to-confirm for one action per flow | Apply drag-to-commit to every button |
| Inset row separators to the text edge | Full-bleed dividers across the card |

---

## 13. Reference map

| Pattern | Source screens |
|---|---|
| Avatar cluster hero | Circles group cards; academy join page; "Inspired people"; social app entry ring |
| Payment sheet with grouped rows | Violet pay-in-full sheet; Apple Pay sheet |
| Confirm-transaction sheet with tick ruler | Black-CTA confirm screen |
| Dark balance card over white transaction sheet | Wallet home; dark transactions app |
| Floating pill tab bar | Wallet home; dark transactions app; family social feed |
| Tinted brand icon in list row | Subscription transaction lists |
| Ambient gradient wash | Crypto wallet home; family social onboarding |
| Trailing action pill in a row | Invite / Invited contact list |
