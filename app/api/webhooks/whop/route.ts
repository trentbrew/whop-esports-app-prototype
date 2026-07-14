import { NextRequest } from "next/server";
import { getWhop } from "@/lib/whop";
import { recordEntry } from "@/lib/db";

/**
 * Whop webhook receiver — the authoritative fulfillment path for entries.
 *
 * 1. Read the RAW body (the signature is over the exact bytes).
 * 2. Verify + unwrap with the SDK (checks WHOP_WEBHOOK_SECRET).
 * 3. On payment.succeeded, add the player to the tournament roster using the
 *    metadata we attached when creating the checkout. recordEntry is
 *    idempotent, so duplicate deliveries are safe.
 *
 * Register at: <your-domain>/api/webhooks/whop
 */
export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);
  const whop = getWhop();

  let event: ReturnType<typeof whop.webhooks.unwrap>;
  try {
    event = whop.webhooks.unwrap(payload, { headers });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "payment.succeeded") {
      const meta = (event.data as { metadata?: Record<string, unknown> })
        .metadata;
      const tournamentId = meta?.tournament_id as string | undefined;
      const email = meta?.player_email as string | undefined;
      const paymentId = (event.data as { id?: string }).id ?? null;

      if (tournamentId && email) {
        recordEntry({ tournamentId, email, paymentId });
      } else {
        console.warn("payment.succeeded missing tournament metadata");
      }
    } else {
      console.log(`Unhandled Whop event: ${event.type}`);
    }
  } catch (err) {
    // 500 tells Whop to retry — only for transient failures.
    console.error(`Error handling ${event.type}:`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
