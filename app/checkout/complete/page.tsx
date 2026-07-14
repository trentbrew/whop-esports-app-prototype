export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>;
}) {
  const { status, payment } = await searchParams;
  const ok = status === "success";

  return (
    <div className="panel" style={{ padding: 28, maxWidth: 460 }}>
      <p className="eyebrow">{ok ? "Entry confirmed" : "Checkout"}</p>
      <h1 className="page" style={{ fontSize: 28 }}>
        {ok ? "You're in the bracket." : "Something went wrong"}
      </h1>
      <p className="muted">
        {ok
          ? "Your seat is locked and the purse just grew. Fulfillment is confirmed server-side by the payment webhook."
          : "The payment did not complete. No charge was made."}
      </p>
      {payment && (
        <p className="muted num" style={{ marginTop: 14, fontSize: 13 }}>
          Receipt: {payment}
        </p>
      )}
      <div style={{ marginTop: 22 }}>
        <a className="btn btn-gold" href="/">
          Back to the circuit
        </a>
      </div>
    </div>
  );
}
