"use server";

import { revalidatePath } from "next/cache";
import {
  CURRENT_USER,
  addPayoutMethod,
  approvePayout,
  createPayoutRequest,
  getTournament,
  lockAndStart,
  recordEntry,
  reportResult,
  verifyIdentity,
} from "@/lib/db";
import { getWhop, WHOP_PLAN_ID } from "@/lib/whop";
import { dollarsToCents } from "@/lib/money";

export type EnterResult =
  | { mode: "whop"; sessionId: string }
  | { mode: "simulated" }
  | { error: string };

/**
 * Starts an entry. If a real Whop plan is configured, returns a checkout
 * session for the embedded checkout. Otherwise records the entry directly
 * against our ledger so the lifecycle is fully demoable offline.
 */
export async function enterTournament(tournamentId: string): Promise<EnterResult> {
  const t = getTournament(tournamentId);
  if (!t) return { error: "Tournament not found." };
  if (t.status !== "open") return { error: "This tournament has closed." };
  if (t.filled >= t.capacity) return { error: "This tournament is full." };

  const whopReady = Boolean(process.env.WHOP_API_KEY && WHOP_PLAN_ID);

  if (whopReady) {
    try {
      const config = await getWhop().checkoutConfigurations.create({
        plan_id: WHOP_PLAN_ID,
        metadata: {
          tournament_id: tournamentId,
          player_email: CURRENT_USER,
          order_id: `entry_${tournamentId}_${Date.now()}`,
        },
      });
      return { mode: "whop", sessionId: config.id };
    } catch (err) {
      console.error("Whop checkout failed:", err);
      return { error: "Could not start checkout. Try again." };
    }
  }

  // Demo path: no real charge, entry recorded at the tournament's real fee.
  try {
    recordEntry({ tournamentId, email: CURRENT_USER, handle: "nova" });
    revalidatePath("/");
    revalidatePath(`/t/${tournamentId}`);
    return { mode: "simulated" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Entry failed." };
  }
}

export async function startTournament(tournamentId: string) {
  lockAndStart(tournamentId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function reportMatch(
  tournamentId: string,
  matchId: string,
  winnerEmail: string,
) {
  reportResult(matchId, winnerEmail);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/");
}

export async function completeIdentityVerification() {
  verifyIdentity(CURRENT_USER);
  revalidatePath("/account");
}

export async function addPayout(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const kind = String(formData.get("kind") ?? "bank");
  const masked = String(formData.get("masked") ?? "").trim();
  if (!label) return;
  addPayoutMethod({ label, kind, masked: masked || undefined });
  revalidatePath("/account");
}

export type WithdrawResult = { ok: true } | { error: string };

export async function requestWithdrawal(formData: FormData): Promise<WithdrawResult> {
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Enter an amount greater than zero." };
  if (!reason) return { error: "Add a short description." };

  try {
    createPayoutRequest({ amountCents: dollarsToCents(amount), reason });
    revalidatePath("/account");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Request failed." };
  }
}

export async function approvePayoutRequest(requestId: string) {
  approvePayout(requestId);
  revalidatePath("/admin");
  revalidatePath("/account");
}
