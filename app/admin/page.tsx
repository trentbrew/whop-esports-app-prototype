import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@whop/react/components";
import {
  listPayoutRequests,
  listTournaments,
  getAccount,
  listPayoutMethods,
} from "@/lib/db";
import { formatCents } from "@/lib/money";
import { approvePayoutRequest, startTournament } from "@/app/actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function AdminPage() {
  const requests = listPayoutRequests();
  const pending = requests.filter((r) => r.status === "pending");
  const manageable = listTournaments().filter((t) => t.status !== "completed");

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Organizer console
        </Text>
        <Heading as="h1" size="8" style={{ marginTop: 8 }}>
          Run the money.
        </Heading>
        <Text
          as="p"
          size="3"
          color="gray"
          style={{ maxWidth: "56ch", marginTop: 8 }}
        >
          Settle brackets to release the purse, and approve player withdrawals
          once every check clears.
        </Text>
      </div>

      <div className="stack">
        <Card size="2" variant="surface">
          <div className="between" style={{ marginBottom: 12 }}>
            <Heading as="h2" size="4">
              Payout requests
            </Heading>
            <Badge color="orange" variant="soft">
              {pending.length} pending
            </Badge>
          </div>

          {requests.length === 0 ? (
            <Text size="2" color="gray">
              No payout requests yet.
            </Text>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {requests.map((r) => {
                const acc = getAccount(r.email);
                const hasMethod = listPayoutMethods(r.email).length > 0;
                const ready = [
                  { label: "Payout method configured", ok: hasMethod },
                  {
                    label: "Identity verified",
                    ok: acc.identity_status === "verified",
                  },
                  {
                    label: "Sufficient balance",
                    ok:
                      r.status === "paid" ||
                      acc.balance_cents >= r.amount_cents,
                  },
                ];
                const clear = ready.every((c) => c.ok);
                return (
                  <div key={r.id} className="ready">
                    <div className="between" style={{ alignItems: "flex-start" }}>
                      <div>
                        <Text weight="bold">{r.handle}</Text>
                        <Text as="div" size="2" color="gray">
                          {r.reason}
                        </Text>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Text
                          size="4"
                          weight="bold"
                          color="orange"
                          className="num"
                        >
                          {formatCents(r.amount_cents)}
                        </Text>
                        <Text as="div" size="1" color="gray">
                          {dateFmt.format(new Date(r.created_at))}
                        </Text>
                      </div>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      {ready.map((c) => (
                        <div
                          key={c.label}
                          className={`check${c.ok ? " done" : ""}`}
                        >
                          <span className="box">{c.ok ? "✓" : ""}</span>
                          {c.label}
                        </div>
                      ))}
                    </div>

                    {r.status === "paid" ? (
                      <Badge
                        color="teal"
                        variant="soft"
                        style={{ alignSelf: "flex-start", marginTop: 4 }}
                      >
                        paid via {r.method_label ?? "transfer"}
                      </Badge>
                    ) : (
                      <form
                        action={approvePayoutRequest.bind(null, r.id)}
                        style={{ marginTop: 8 }}
                      >
                        <Button
                          type="submit"
                          color="blue"
                          variant="solid"
                          disabled={!clear}
                          style={{ width: "100%" }}
                        >
                          {clear
                            ? "Approve payout"
                            : "Blocked — checks incomplete"}
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card size="2" variant="surface">
          <Heading as="h2" size="4" style={{ marginBottom: 8 }}>
            Brackets
          </Heading>
          <Text size="2" color="gray" style={{ marginBottom: 12 }}>
            Lock entries to generate the bracket, then report results on the
            tournament page. The champion is credited the full purse.
          </Text>
          {manageable.length === 0 ? (
            <Text size="2" color="gray">
              No active tournaments.
            </Text>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {manageable.map((t) => (
                <div
                  key={t.id}
                  className="between"
                  style={{
                    gap: 12,
                    padding: "12px 0",
                    borderTop: "1px solid var(--gray-a5)",
                  }}
                >
                  <div>
                    <Text weight="bold">{t.name}</Text>
                    <Text as="div" size="2" color="gray" className="num">
                      {formatCents(t.pool_cents)} purse · {t.filled} players
                    </Text>
                  </div>
                  {t.status === "live" ? (
                    <Button asChild variant="soft" color="gray">
                      <Link href={`/t/${t.id}`}>Open bracket →</Link>
                    </Button>
                  ) : (
                    <form action={startTournament.bind(null, t.id)}>
                      <Button
                        type="submit"
                        color="blue"
                        variant="solid"
                        disabled={t.filled < 2}
                      >
                        {t.filled < 2 ? "Need 2+ players" : "Lock & start"}
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
