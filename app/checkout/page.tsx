"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, Link, Text } from "@whop/react/components";
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
      <Card size="2" variant="surface" style={{ maxWidth: 460 }}>
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Checkout
        </Text>
        <Heading as="h1" size="6" style={{ marginTop: 8 }}>
          Missing session
        </Heading>
        <Text as="p" size="2" color="gray" style={{ marginTop: 8 }}>
          No checkout session was provided.{" "}
          <Link href="/">Back to the circuit</Link>.
        </Text>
      </Card>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 480, gap: 20 }}>
      <div>
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Secure checkout
        </Text>
        <Heading as="h1" size="7" style={{ marginTop: 8 }}>
          Confirm your entry
        </Heading>
      </div>
      <Card
        size="1"
        variant="surface"
        style={{ overflow: "hidden", padding: 8 }}
      >
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
      </Card>
    </div>
  );
}
