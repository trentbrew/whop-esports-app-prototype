"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = use(searchParams);
  const router = useRouter();

  if (!session) {
    return (
      <div className="panel" style={{ padding: 28, maxWidth: 460 }}>
        <p className="eyebrow">Checkout</p>
        <h1 className="page" style={{ fontSize: 26 }}>
          Missing session
        </h1>
        <p className="muted">
          No checkout session was provided.{" "}
          <a className="link" href="/">
            Back to the circuit
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="eyebrow">Secure checkout</p>
      <h1 className="page" style={{ fontSize: 30, marginBottom: 20 }}>
        Confirm your entry
      </h1>
      <div className="panel" style={{ padding: 8, overflow: "hidden" }}>
        <WhopCheckoutEmbed
          sessionId={session}
          theme="dark"
          returnUrl={`${BASE_URL}/checkout/complete`}
          onComplete={(_planId, receiptId) => {
            router.push(
              `/checkout/complete?status=success&payment=${encodeURIComponent(
                receiptId ?? "",
              )}`,
            );
          }}
        />
      </div>
    </div>
  );
}
