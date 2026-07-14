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
    <>
      <p className="eyebrow">Your account</p>
      <h1 className="page">Winnings &amp; payouts</h1>
      <p className="lede">
        Prize money lands here the moment you win. Clear the checks below, then
        cash out.
      </p>

      <div className="stack">
        {/* Balance + withdraw */}
        <section className="panel" style={{ padding: 24 }}>
          <div className="between" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="k" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)" }}>
                Available balance
              </div>
              <div className="balance">{formatCents(acc.balance_cents)}</div>
            </div>
          </div>

          <div className="ready" style={{ marginTop: 20 }}>
            <h4>Payout readiness</h4>
            <Check done={ready.identityVerified}>Identity verified</Check>
            <Check done={ready.methodConfigured}>Payout method configured</Check>
            <Check done={ready.balanceMet}>Balance available to withdraw</Check>
          </div>

          <div style={{ marginTop: 20 }}>
            {canWithdraw ? (
              <WithdrawForm maxCents={acc.balance_cents} />
            ) : (
              <p className="muted" style={{ fontSize: 14 }}>
                Finish the steps above to request a withdrawal.
              </p>
            )}
          </div>
        </section>

        {/* Identity */}
        <section className="panel" style={{ padding: 24 }}>
          <div className="between">
            <div>
              <h2 className="section-title" style={{ marginBottom: 4 }}>
                Identity verification
              </h2>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                {acc.identity_status === "verified"
                  ? "Verified — you're cleared for payouts."
                  : "Required before any payout can be released."}
              </p>
            </div>
            {acc.identity_status === "verified" ? (
              <span className="pill paid">
                <span className="dot" /> verified
              </span>
            ) : (
              <form action={completeIdentityVerification}>
                <button className="btn btn-gold">Verify identity</button>
              </form>
            )}
          </div>
        </section>

        {/* Payout methods */}
        <section className="panel" style={{ padding: 24 }}>
          <h2 className="section-title">Payout methods</h2>
          {methods.length === 0 ? (
            <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
              No payout method yet. Add one to receive winnings.
            </p>
          ) : (
            <div className="rows" style={{ marginBottom: 16 }}>
              {methods.map((m) => (
                <div className="row" key={m.id}>
                  <span className="handle">
                    {m.label}
                    <span className="muted" style={{ fontSize: 13 }}>
                      {" "}
                      · {m.kind}
                      {m.masked ? ` ••••${m.masked}` : ""}
                    </span>
                  </span>
                  {m.is_default === 1 && (
                    <span className="win" style={{ color: "var(--live)" }}>
                      default
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <form action={addPayout} className="between" style={{ gap: 10, alignItems: "flex-end" }}>
            <label className="field" style={{ flex: 2, marginBottom: 0 }}>
              <span>Account name</span>
              <input className="inp" name="label" placeholder="nova" required />
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>Type</span>
              <select className="inp" name="kind" defaultValue="Instant transfer">
                <option>Instant transfer</option>
                <option>Bank account</option>
              </select>
            </label>
            <label className="field" style={{ width: 96, marginBottom: 0 }}>
              <span>Last 4</span>
              <input className="inp" name="masked" placeholder="4821" maxLength={4} />
            </label>
            <button className="btn btn-ghost">Add</button>
          </form>
        </section>

        {/* History */}
        <section className="panel" style={{ padding: 24 }}>
          <h2 className="section-title">Withdrawal history</h2>
          {requests.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>
              No withdrawals requested yet.
            </p>
          ) : (
            <div className="rows">
              {requests.map((r) => (
                <div className="row" key={r.id}>
                  <span className="num" style={{ color: "var(--gold)", width: 90 }}>
                    {formatCents(r.amount_cents)}
                  </span>
                  <span className="handle" style={{ fontWeight: 400, color: "var(--muted)" }}>
                    {r.reason}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {dateFmt.format(new Date(r.created_at))}
                    </span>
                    <span className={`pill ${r.status}`}>
                      <span className="dot" /> {r.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Check({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div className={`check${done ? " done" : ""}`}>
      <span className="box">{done ? "✓" : ""}</span>
      {children}
    </div>
  );
}
