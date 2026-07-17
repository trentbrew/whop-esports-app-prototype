import { Button, Card, Heading, Text } from "@whop/react/components";
import Link from "next/link";

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>;
}) {
  const { status, payment } = await searchParams;
  const ok = status === "success";

  return (
    <Card size="2" variant="surface" style={{ maxWidth: 460 }}>
      <Text
        size="1"
        color="gray"
        weight="medium"
        style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {ok ? "Entry confirmed" : "Checkout"}
      </Text>
      <Heading as="h1" size="6" style={{ marginTop: 8 }}>
        {ok ? "You're in the bracket." : "Something went wrong"}
      </Heading>
      <Text as="p" size="2" color="gray" style={{ marginTop: 8 }}>
        {ok
          ? "Your seat is locked and the purse just grew. Fulfillment is confirmed server-side by the payment webhook."
          : "The payment did not complete. No charge was made."}
      </Text>
      {payment && (
        <Text
          as="p"
          size="1"
          color="gray"
          className="num"
          style={{ marginTop: 14 }}
        >
          Receipt: {payment}
        </Text>
      )}
      <div style={{ marginTop: 22 }}>
        <Button asChild color="blue" variant="solid">
          <Link href="/">Back to the circuit</Link>
        </Button>
      </div>
    </Card>
  );
}
