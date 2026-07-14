# Circuit — esports tournaments (Whop payments prototype)

A tightly-scoped "start.gg for esports" prototype whose whole subject is the
**money lifecycle**: players buy into a bracket, entries stack the purse, the
organizer settles a winner, and the winner cashes out.

Entry **payments are real** (Whop embedded checkout). Everything downstream —
purses, balances, withdrawals, approvals — runs on a modeled local ledger so
the full loop is demoable and flawless without moving real money.

## The loop

```
 /            Circuit lobby — tournament cards with the gold purse meter
 /t/[id]      Enter → pay entry (Whop checkout, or modeled) → roster + purse grow
 /admin       Organizer locks entries → single-elim bracket is generated
 /t/[id]      Report match results (tap to advance) → champion is credited
 /account     Verify identity + add payout method → request withdrawal
 /admin       Approve payout (readiness checks must clear) → balance debited
```

Lifecycle: `open → live (bracket) → completed`. Byes are distributed against
the top seeds and auto-advanced; deciding the final credits the champion the
full purse.

The webhook (`/api/webhooks/whop`) is the authoritative fulfillment path for
real payments; the client `onComplete` is only a UX signal.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Runs out of the box with **no configuration** — entries are modeled against a
local SQLite ledger (`.data/circuit.db`, via Node's built-in `node:sqlite`,
zero native deps). Seed data ships a signed-in player (`nova`) who already won
a past event, so the withdrawal flow is live immediately.

### Wiring real Whop payments (optional)

```bash
cp .env.example .env.local   # add WHOP_API_KEY + WHOP_PLAN_ID
```

With those set, "Enter tournament" routes through real `WhopCheckoutEmbed`;
the webhook adds the player to the roster on `payment.succeeded` using the
`tournament_id` / `player_email` metadata attached at checkout creation.

## Design

Ink-indigo base, **gold = money** as the one bold accent, a whisper of teal
for "live". Archivo / Inter / JetBrains Mono, with every currency figure and id
set in tabular mono so the whole app reads as a ledger. Glass panels float over
an ambient bracket-grid arena. Signature element: the gold **purse meter** —
one bar encoding both pot size and how full the bracket is.

## Scope

In: the money lifecycle end-to-end, plus a single-elimination bracket
(standard seeding, byes, tap-to-report results). Out (deferred): double-elim /
other formats, real auth, real Whop payouts.

## Map

| Path | Role |
| --- | --- |
| `lib/db.ts` | SQLite ledger: schema, seed, bracket engine, all reads/writes |
| `lib/bracket.ts` | Pure bracket math (seeding, byes, round labels) |
| `app/actions.ts` | Server actions for every mutation |
| `app/page.tsx` | Circuit lobby |
| `app/t/[id]/page.tsx` | Tournament detail + entry + bracket |
| `app/components/Bracket.tsx` | Interactive single-elim bracket |
| `app/account/page.tsx` | Identity, payout methods, balance, withdrawal |
| `app/admin/page.tsx` | Lock/start brackets, approve payouts |
| `app/api/webhooks/whop/route.ts` | Real-payment fulfillment |
| `lib/whop.ts` | Server-side Whop client |
