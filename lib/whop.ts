import Whop from "@whop/sdk";

/**
 * Server-side Whop client. Never import this from a Client Component —
 * it carries your company API key.
 *
 * Lazily constructed so that `next build` (which imports route modules) does
 * not require the key to be present at build time. The check fires on first
 * request instead.
 */
let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (_whop) return _whop;
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is not set. Copy .env.example to .env.local.");
  }
  _whop = new Whop({ apiKey });
  return _whop;
}

export const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID ?? "";
