import {
  Badge,
  Button,
  Card,
  Heading,
  Text,
  TextField,
} from "@whop/react/components";
import {
  CURRENT_USER,
  getAccount,
  listPayoutMethods,
  listPayoutRequests,
  payoutReadiness,
} from "@/lib/db";
import { formatCents } from "@/lib/money";
import {
  addPayout,
  completeIdentityVerification,
} from "@/app/actions";
import { WithdrawForm } from "@/app/components/WithdrawForm";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function AccountPage() {
  const acc = getAccount(CURRENT_USER);
  const methods = listPayoutMethods();
  const requests = listPayoutRequests(CURRENT_USER);
  const ready = payoutReadiness(CURRENT_USER, acc.balance_cents);
  const canWithdraw =
    ready.methodConfigured && ready.identityVerified && acc.balance_cents > 0;

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Your account
        </Text>
        <Heading as="h1" size="8" style={{ marginTop: 8 }}>
          Winnings &amp; payouts
        </Heading>
        <Text
          as="p"
          size="3"
          color="gray"
          style={{ maxWidth: "56ch", marginTop: 8 }}
        >
          Prize money lands here the moment you win. Clear the checks below, then
          cash out.
        </Text>
      </div>

      <div className="stack">
        <Card size="2" variant="surface">
          <Text
            size="1"
            color="gray"
            weight="medium"
            style={{
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Available balance
          </Text>
          <div className="balance">{formatCents(acc.balance_cents)}</div>

          <div className="ready" style={{ marginTop: 20 }}>
            <Heading as="h4" size="3" style={{ marginBottom: 8 }}>
              Payout readiness
            </Heading>
            <Check done={ready.identityVerified}>Identity verified</Check>
            <Check done={ready.methodConfigured}>Payout method configured</Check>
            <Check done={ready.balanceMet}>Balance available to withdraw</Check>
          </div>

          <div style={{ marginTop: 20 }}>
            {canWithdraw ? (
              <WithdrawForm maxCents={acc.balance_cents} />
            ) : (
              <Text size="2" color="gray">
                Finish the steps above to request a withdrawal.
              </Text>
            )}
          </div>
        </Card>

        <Card size="2" variant="surface">
          <div className="between">
            <div>
              <Heading as="h2" size="4" style={{ marginBottom: 4 }}>
                Identity verification
              </Heading>
              <Text size="2" color="gray">
                {acc.identity_status === "verified"
                  ? "Verified — you're cleared for payouts."
                  : "Required before any payout can be released."}
              </Text>
            </div>
            {acc.identity_status === "verified" ? (
              <Badge color="teal" variant="soft">
                verified
              </Badge>
            ) : (
              <form action={completeIdentityVerification}>
                <Button type="submit" color="blue" variant="solid">
                  Verify identity
                </Button>
              </form>
            )}
          </div>
        </Card>

        <Card size="2" variant="surface">
          <Heading as="h2" size="4" style={{ marginBottom: 12 }}>
            Payout methods
          </Heading>
          {methods.length === 0 ? (
            <Text size="2" color="gray" style={{ marginBottom: 12 }}>
              No payout method yet. Add one to receive winnings.
            </Text>
          ) : (
            <div className="rows" style={{ marginBottom: 16 }}>
              {methods.map((m) => (
                <div className="row" key={m.id}>
                  <Text size="2" weight="medium">
                    {m.label}
                    <Text size="2" color="gray">
                      {" "}
                      · {m.kind}
                      {m.masked ? ` ••••${m.masked}` : ""}
                    </Text>
                  </Text>
                  {m.is_default === 1 && (
                    <Badge
                      color="teal"
                      variant="soft"
                      style={{ marginLeft: "auto" }}
                    >
                      default
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          <form action={addPayout}>
            <div
              className="between"
              style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}
            >
              <label style={{ flex: 2, minWidth: 140, marginBottom: 0 }}>
                <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
                  Account name
                </Text>
                <TextField.Root>
                  <TextField.Input name="label" placeholder="nova" required />
                </TextField.Root>
              </label>
              <label style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
                  Type
                </Text>
                <select
                  name="kind"
                  defaultValue="Instant transfer"
                  style={{
                    width: "100%",
                    height: 36,
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-a7)",
                    background: "var(--color-surface)",
                    color: "var(--gray-12)",
                    padding: "0 10px",
                  }}
                >
                  <option>Instant transfer</option>
                  <option>Bank account</option>
                </select>
              </label>
              <label style={{ width: 96, marginBottom: 0 }}>
                <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
                  Last 4
                </Text>
                <TextField.Root>
                  <TextField.Input
                    name="masked"
                    placeholder="4821"
                    maxLength={4}
                  />
                </TextField.Root>
              </label>
              <Button type="submit" variant="soft" color="gray">
                Add
              </Button>
            </div>
          </form>
        </Card>

        <Card size="2" variant="surface">
          <Heading as="h2" size="4" style={{ marginBottom: 12 }}>
            Withdrawal history
          </Heading>
          {requests.length === 0 ? (
            <Text size="2" color="gray">
              No withdrawals requested yet.
            </Text>
          ) : (
            <div className="rows">
              {requests.map((r) => (
                <div className="row" key={r.id}>
                  <Text
                    size="2"
                    weight="bold"
                    color="orange"
                    className="num"
                    style={{ width: 90 }}
                  >
                    {formatCents(r.amount_cents)}
                  </Text>
                  <Text size="2" color="gray">
                    {r.reason}
                  </Text>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text size="1" color="gray">
                      {dateFmt.format(new Date(r.created_at))}
                    </Text>
                    <Badge
                      color={
                        r.status === "paid"
                          ? "teal"
                          : r.status === "pending"
                            ? "orange"
                            : "gray"
                      }
                      variant="soft"
                    >
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Check({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`check${done ? " done" : ""}`}>
      <span className="box">{done ? "✓" : ""}</span>
      {children}
    </div>
  );
}
