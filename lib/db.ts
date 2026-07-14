import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  bracketSize,
  feeder,
  seedOrder,
  totalRounds as roundsForSize,
} from "./bracket";

/**
 * Local SQLite ledger (Node's built-in driver — zero native deps).
 *
 * This is the source of truth for the modeled money lifecycle: rosters,
 * prize pools, balances, and payout requests. Entry *payments* are real
 * (Whop checkout) but everything downstream is tracked here.
 */

const DATA_DIR = join(process.cwd(), ".data");
mkdirSync(DATA_DIR, { recursive: true });

// Reuse a single connection across HMR reloads in dev.
const g = globalThis as unknown as { __circuitDb?: DatabaseSync };
const db = g.__circuitDb ?? new DatabaseSync(join(DATA_DIR, "circuit.db"));
g.__circuitDb = db;

// WAL + a generous busy timeout so the parallel workers `next build` spawns
// (each importing this module) don't collide on the file.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 8000;");

/** The single signed-in player for this prototype (no auth layer). */
export const CURRENT_USER = "nova@circuit.gg";

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    entry_fee_cents INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    starts_at TEXT NOT NULL,
    host TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',   -- open | live | completed
    winner_email TEXT
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    a_email TEXT,
    a_handle TEXT,
    b_email TEXT,
    b_handle TEXT,
    winner_email TEXT,
    is_bye INTEGER NOT NULL DEFAULT 0,
    UNIQUE (tournament_id, round, position)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    player_email TEXT NOT NULL,
    player_handle TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_id TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (tournament_id, player_email)
  );

  CREATE TABLE IF NOT EXISTS accounts (
    email TEXT PRIMARY KEY,
    handle TEXT NOT NULL,
    identity_status TEXT NOT NULL DEFAULT 'started',  -- started | verified
    balance_cents INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payout_methods (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,
    masked TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payout_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    handle TEXT NOT NULL,
    tournament_id TEXT,
    amount_cents INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | paid
    method_label TEXT,
    created_at TEXT NOT NULL,
    decided_at TEXT
  );
`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tournament = {
  id: string;
  name: string;
  game: string;
  entry_fee_cents: number;
  capacity: number;
  starts_at: string;
  host: string;
  description: string;
  status: "open" | "live" | "completed";
  winner_email: string | null;
};

export type Entry = {
  id: string;
  tournament_id: string;
  player_email: string;
  player_handle: string;
  amount_cents: number;
  payment_id: string | null;
  created_at: string;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  a_email: string | null;
  a_handle: string | null;
  b_email: string | null;
  b_handle: string | null;
  winner_email: string | null;
  is_bye: number;
};

export type BracketRound = {
  round: number;
  matches: Match[];
};

export type Bracket = {
  rounds: BracketRound[];
  totalRounds: number;
  champion: { email: string; handle: string } | null;
};

export type Account = {
  email: string;
  handle: string;
  identity_status: "started" | "verified";
  balance_cents: number;
};

export type PayoutMethod = {
  id: string;
  email: string;
  label: string;
  kind: string;
  masked: string | null;
  is_default: number;
  created_at: string;
};

export type PayoutRequest = {
  id: string;
  email: string;
  handle: string;
  tournament_id: string | null;
  amount_cents: number;
  reason: string;
  status: "pending" | "paid";
  method_label: string | null;
  created_at: string;
  decided_at: string | null;
};

export type TournamentView = Tournament & {
  filled: number;
  pool_cents: number;
  roster: Entry[];
};

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function listTournaments(): TournamentView[] {
  const rows = db
    .prepare(`SELECT * FROM tournaments ORDER BY status = 'completed', starts_at`)
    .all() as Tournament[];
  return rows.map(withStats);
}

export function getTournament(tid: string): TournamentView | null {
  const t = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(tid) as Tournament | undefined;
  return t ? withStats(t) : null;
}

function withStats(t: Tournament): TournamentView {
  const roster = db
    .prepare("SELECT * FROM entries WHERE tournament_id = ? ORDER BY created_at")
    .all(t.id) as Entry[];
  const pool_cents = roster.reduce((sum, e) => sum + e.amount_cents, 0);
  return { ...t, filled: roster.length, pool_cents, roster };
}

export function getAccount(email = CURRENT_USER): Account {
  const acc = db
    .prepare("SELECT * FROM accounts WHERE email = ?")
    .get(email) as Account | undefined;
  if (acc) return acc;
  // Auto-provision an account row so pages never 404 on a fresh email.
  const handle = email.split("@")[0];
  db.prepare(
    "INSERT INTO accounts (email, handle, identity_status, balance_cents) VALUES (?, ?, 'started', 0)",
  ).run(email, handle);
  return { email, handle, identity_status: "started", balance_cents: 0 };
}

export function listPayoutMethods(email = CURRENT_USER): PayoutMethod[] {
  return db
    .prepare(
      "SELECT * FROM payout_methods WHERE email = ? ORDER BY is_default DESC, created_at",
    )
    .all(email) as PayoutMethod[];
}

export function listPayoutRequests(email?: string): PayoutRequest[] {
  if (email) {
    return db
      .prepare("SELECT * FROM payout_requests WHERE email = ? ORDER BY created_at DESC")
      .all(email) as PayoutRequest[];
  }
  return db
    .prepare("SELECT * FROM payout_requests ORDER BY status = 'paid', created_at DESC")
    .all() as PayoutRequest[];
}

export function getPayoutRequest(rid: string): PayoutRequest | null {
  return (
    (db
      .prepare("SELECT * FROM payout_requests WHERE id = ?")
      .get(rid) as PayoutRequest | undefined) ?? null
  );
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Records a paid entry. Idempotent on (tournament, player) and on payment_id,
 * so a duplicate webhook delivery is a no-op. Returns true if newly added.
 */
export function recordEntry(args: {
  tournamentId: string;
  email: string;
  handle?: string;
  paymentId?: string | null;
}): boolean {
  const t = getTournament(args.tournamentId);
  if (!t) throw new Error(`Unknown tournament ${args.tournamentId}`);
  if (t.status !== "open") throw new Error("Tournament is not open for entries");
  if (t.filled >= t.capacity) throw new Error("Tournament is full");

  const handle = args.handle ?? args.email.split("@")[0];
  getAccount(args.email); // ensure account exists

  try {
    db.prepare(
      `INSERT INTO entries (id, tournament_id, player_email, player_handle, amount_cents, payment_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id("ent"),
      args.tournamentId,
      args.email,
      handle,
      t.entry_fee_cents,
      args.paymentId ?? null,
      new Date().toISOString(),
    );
    return true;
  } catch (err) {
    // UNIQUE violation => already entered. Treat as success (idempotent).
    if (String(err).includes("UNIQUE")) return false;
    throw err;
  }
}

/**
 * Completes a tournament and credits the champion's balance with the full
 * pool. Idempotent: a tournament can only be settled once. Called when the
 * final match of the bracket is decided.
 */
function creditChampion(tournamentId: string, winnerEmail: string): void {
  const t = getTournament(tournamentId);
  if (!t) throw new Error("Unknown tournament");
  if (t.status === "completed") return; // already settled
  const winner = t.roster.find((e) => e.player_email === winnerEmail);
  if (!winner) throw new Error("Champion must be on the roster");

  getAccount(winnerEmail);
  db.prepare(
    "UPDATE tournaments SET status = 'completed', winner_email = ? WHERE id = ?",
  ).run(winnerEmail, tournamentId);
  db.prepare(
    "UPDATE accounts SET balance_cents = balance_cents + ? WHERE email = ?",
  ).run(t.pool_cents, winnerEmail);
}

// ---------------------------------------------------------------------------
// Bracket
// ---------------------------------------------------------------------------

export function getBracket(tournamentId: string): Bracket | null {
  const rows = db
    .prepare(
      "SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, position",
    )
    .all(tournamentId) as Match[];
  if (rows.length === 0) return null;

  const total = Math.max(...rows.map((m) => m.round));
  const rounds: BracketRound[] = [];
  for (let r = 1; r <= total; r++) {
    rounds.push({ round: r, matches: rows.filter((m) => m.round === r) });
  }

  const finalMatch = rows.find((m) => m.round === total && m.position === 0);
  const t = getTournament(tournamentId);
  const champion =
    finalMatch?.winner_email && t?.status === "completed"
      ? {
          email: finalMatch.winner_email,
          handle:
            finalMatch.a_email === finalMatch.winner_email
              ? finalMatch.a_handle!
              : finalMatch.b_handle!,
        }
      : null;

  return { rounds, totalRounds: total, champion };
}

/** Writes a resolved winner into the slot of its downstream match. */
function advanceInto(
  tournamentId: string,
  round: number,
  position: number,
  email: string,
  handle: string,
): void {
  const { pos, slot } = feeder(position);
  db.prepare(
    `UPDATE matches SET ${slot}_email = ?, ${slot}_handle = ?
     WHERE tournament_id = ? AND round = ? AND position = ?`,
  ).run(email, handle, tournamentId, round + 1, pos);
}

/**
 * Locks entries and generates the single-elimination bracket. Byes are
 * distributed against the top seeds and auto-advanced. Requires >= 2 players.
 */
export function lockAndStart(tournamentId: string): void {
  const t = getTournament(tournamentId);
  if (!t) throw new Error("Unknown tournament");
  if (t.status !== "open") throw new Error("Tournament is not open");
  if (t.filled < 2) throw new Error("Need at least 2 players to start");

  const size = bracketSize(t.filled);
  const rounds = roundsForSize(size);
  const order = seedOrder(size);
  // slot -> roster player (or null for a bye)
  const slots = order.map((seed) => t.roster[seed - 1] ?? null);

  const insert = db.prepare(
    `INSERT INTO matches (id, tournament_id, round, position, a_email, a_handle, b_email, b_handle, winner_email, is_bye)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // Empty shells for every round first, so advanceInto has targets.
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let p = 0; p < count; p++) {
      insert.run(id("m"), tournamentId, r, p, null, null, null, null, null, 0);
    }
  }

  db.prepare("UPDATE tournaments SET status = 'live' WHERE id = ?").run(
    tournamentId,
  );

  // Fill round 1 and resolve byes.
  for (let p = 0; p < size / 2; p++) {
    const a = slots[2 * p];
    const b = slots[2 * p + 1];
    const bye = Boolean(a) !== Boolean(b); // exactly one side present
    const winner = a && !b ? a : b && !a ? b : null;
    db.prepare(
      `UPDATE matches SET a_email = ?, a_handle = ?, b_email = ?, b_handle = ?, winner_email = ?, is_bye = ?
       WHERE tournament_id = ? AND round = 1 AND position = ?`,
    ).run(
      a?.player_email ?? null,
      a?.player_handle ?? null,
      b?.player_email ?? null,
      b?.player_handle ?? null,
      bye ? winner!.player_email : null,
      bye ? 1 : 0,
      tournamentId,
      p,
    );
    if (bye && rounds > 1) {
      advanceInto(
        tournamentId,
        1,
        p,
        winner!.player_email,
        winner!.player_handle,
      );
    }
  }
}

/**
 * Records a match result and advances the winner. When the final is decided,
 * completes the tournament and credits the champion. Idempotent per match.
 */
export function reportResult(matchId: string, winnerEmail: string): void {
  const m = db
    .prepare("SELECT * FROM matches WHERE id = ?")
    .get(matchId) as Match | undefined;
  if (!m) throw new Error("Unknown match");
  if (!m.a_email || !m.b_email) throw new Error("Match is not ready yet");
  if (winnerEmail !== m.a_email && winnerEmail !== m.b_email)
    throw new Error("Winner must be one of the two players");
  if (m.winner_email === winnerEmail) return; // idempotent

  const handle = winnerEmail === m.a_email ? m.a_handle! : m.b_handle!;
  db.prepare("UPDATE matches SET winner_email = ? WHERE id = ?").run(
    winnerEmail,
    matchId,
  );

  const total = (
    db
      .prepare(
        "SELECT MAX(round) AS r FROM matches WHERE tournament_id = ?",
      )
      .get(m.tournament_id) as { r: number }
  ).r;

  if (m.round < total) {
    advanceInto(m.tournament_id, m.round, m.position, winnerEmail, handle);
  } else {
    creditChampion(m.tournament_id, winnerEmail);
  }
}

export function verifyIdentity(email = CURRENT_USER): void {
  getAccount(email);
  db.prepare("UPDATE accounts SET identity_status = 'verified' WHERE email = ?").run(
    email,
  );
}

export function addPayoutMethod(args: {
  email?: string;
  label: string;
  kind: string;
  masked?: string;
}): void {
  const email = args.email ?? CURRENT_USER;
  const existing = listPayoutMethods(email);
  db.prepare(
    `INSERT INTO payout_methods (id, email, label, kind, masked, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id("pm"),
    email,
    args.label,
    args.kind,
    args.masked ?? null,
    existing.length === 0 ? 1 : 0,
    new Date().toISOString(),
  );
}

export function createPayoutRequest(args: {
  email?: string;
  tournamentId?: string | null;
  amountCents: number;
  reason: string;
}): PayoutRequest {
  const email = args.email ?? CURRENT_USER;
  const acc = getAccount(email);
  if (args.amountCents <= 0) throw new Error("Amount must be greater than zero");
  if (args.amountCents > acc.balance_cents)
    throw new Error("Amount exceeds your available balance");

  const method = listPayoutMethods(email).find((m) => m.is_default) ?? null;
  const rid = id("po");
  db.prepare(
    `INSERT INTO payout_requests (id, email, handle, tournament_id, amount_cents, reason, status, method_label, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(
    rid,
    email,
    acc.handle,
    args.tournamentId ?? null,
    args.amountCents,
    args.reason,
    method?.label ?? null,
    new Date().toISOString(),
  );
  return getPayoutRequest(rid)!;
}

/**
 * Approves + settles a payout. Debits the requester's balance. Idempotent.
 * In the modeled ledger this is where a real Whop payout call would fire.
 */
export function approvePayout(rid: string): void {
  const req = getPayoutRequest(rid);
  if (!req) throw new Error("Unknown payout request");
  if (req.status === "paid") return;

  db.prepare(
    "UPDATE accounts SET balance_cents = balance_cents - ? WHERE email = ?",
  ).run(req.amount_cents, req.email);
  db.prepare(
    "UPDATE payout_requests SET status = 'paid', decided_at = ? WHERE id = ?",
  ).run(new Date().toISOString(), rid);
}

/** Readiness gates shown on both the withdrawal form and the admin approval. */
export function payoutReadiness(email = CURRENT_USER, amountCents = 0) {
  const acc = getAccount(email);
  const methods = listPayoutMethods(email);
  return {
    methodConfigured: methods.length > 0,
    identityVerified: acc.identity_status === "verified",
    balanceMet: acc.balance_cents > 0 && amountCents <= acc.balance_cents,
  };
}

// ---------------------------------------------------------------------------
// Seed (runs once, when the tournaments table is empty)
// ---------------------------------------------------------------------------

function seed() {
  // IMMEDIATE grabs the write lock up front. Concurrent workers block here,
  // and once the first commits they see a populated table and skip.
  db.exec("BEGIN IMMEDIATE");
  try {
    if ((db.prepare("SELECT COUNT(*) AS n FROM tournaments").get() as { n: number }).n > 0) {
      db.exec("COMMIT");
      return;
    }
    seedRows();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function seedRows() {
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offset: number) => new Date(now + offset).toISOString();

  const tournaments: Omit<Tournament, "status" | "winner_email">[] = [
    {
      id: "t_valorant",
      name: "Spike Rush Open",
      game: "Valorant",
      entry_fee_cents: 2500,
      capacity: 16,
      starts_at: iso(2 * day),
      host: "riotwatch",
      description:
        "Single-elimination 5v5. Best-of-three finals. Open to all ranks, NA servers.",
    },
    {
      id: "t_rocket",
      name: "Aerial Ladder 2s",
      game: "Rocket League",
      entry_fee_cents: 1000,
      capacity: 32,
      starts_at: iso(5 * day),
      host: "boostgg",
      description:
        "Doubles ladder, first to 4 wins. Cross-platform. Top 4 teams split the purse.",
    },
    {
      id: "t_smash",
      name: "Weekly Wavedash",
      game: "Smash Ultimate",
      entry_fee_cents: 1500,
      capacity: 24,
      starts_at: iso(-3 * day),
      host: "framedata",
      description:
        "Double-elimination, 3-stock. Legal stage list only. Winner takes the full pool.",
    },
  ];

  const insertT = db.prepare(
    `INSERT INTO tournaments (id, name, game, entry_fee_cents, capacity, starts_at, host, description, status, winner_email)
     VALUES (@id, @name, @game, @entry_fee_cents, @capacity, @starts_at, @host, @description, @status, @winner_email)`,
  );
  for (const t of tournaments) {
    insertT.run({ ...t, status: "open", winner_email: null });
  }

  // The signed-in player: identity not yet finished, no payout method,
  // but holds winnings from a past event so the withdrawal flow is live.
  db.prepare(
    "INSERT INTO accounts (email, handle, identity_status, balance_cents) VALUES (?, 'nova', 'started', 0)",
  ).run(CURRENT_USER);

  const rivals = [
    ["ace@circuit.gg", "ace"],
    ["blitz@circuit.gg", "blitz"],
    ["cypher@circuit.gg", "cypher"],
    ["drift@circuit.gg", "drift"],
    ["echo@circuit.gg", "echo"],
    ["flux@circuit.gg", "flux"],
    ["ghost@circuit.gg", "ghost"],
  ];

  // Partially fill the two open events so the purse meters read non-empty.
  for (const [email, handle] of rivals.slice(0, 6)) {
    recordEntry({ tournamentId: "t_valorant", email, handle });
  }
  for (const [email, handle] of rivals.slice(0, 4)) {
    recordEntry({ tournamentId: "t_rocket", email, handle });
  }

  // A finished event nova won — plays out a full bracket so the completed
  // state is viewable, and is the source of nova's withdrawable balance.
  for (const [email, handle] of rivals) {
    recordEntry({ tournamentId: "t_smash", email, handle });
  }
  recordEntry({ tournamentId: "t_smash", email: CURRENT_USER, handle: "nova" });
  lockAndStart("t_smash");
  playOut("t_smash", CURRENT_USER); // nova wins every match → champion
}

/**
 * Deterministically resolves all pending matches, forcing `championEmail` to
 * win any match they're in. Used to seed a finished bracket.
 */
function playOut(tournamentId: string, championEmail: string) {
  for (let guard = 0; guard < 64; guard++) {
    const ready = db
      .prepare(
        `SELECT * FROM matches WHERE tournament_id = ?
         AND a_email IS NOT NULL AND b_email IS NOT NULL AND winner_email IS NULL
         ORDER BY round, position`,
      )
      .all(tournamentId) as Match[];
    if (ready.length === 0) break;
    for (const m of ready) {
      const winner =
        m.a_email === championEmail || m.b_email === championEmail
          ? championEmail
          : m.a_email!;
      reportResult(m.id, winner);
    }
  }
}

seed();

export { db };
