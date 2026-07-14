import {
  listPayoutRequests,
  listTournaments,
  getAccount,
  listPayoutMethods,
} from "@/lib/db";
import { formatCents } from "@/lib/money";
import Link from "next/link";
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
    <>
      <p className="eyebrow">Organizer console</p>
      <h1 className="page">Run the money.</h1>
      <p className="lede">
        Settle brackets to release the purse, and approve player withdrawals
        once every check clears.
      </p>

      <div className="stack">
        <section className="panel" style={{ padding: 24 }}>
          <div className="between" style={{ marginBottom: 4 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              Payout requests
            </h2>
            <span className="pill pending">
              <span className="dot" /> {pending.length} pending
            </span>
          </div>

          {requests.length === 0 ? (
            <p className="empty">No payout requests yet.</p>
          ) : (
            <div className="stack" style={{ gap: 14, marginTop: 14 }}>
              {requests.map((r) => {
                const acc = getAccount(r.email);
                const hasMethod = listPayoutMethods(r.email).length > 0;
                const ready = [
                  { label: "Payout method configured", ok: hasMethod },
                  {
                    label: "Identity verified",
                    ok: acc.identity_status === "verified",
                  },
                  { label: "Sufficient balance", ok: r.status === "paid" || acc.balance_cents >= r.amount_cents },
                ];
                const clear = ready.every((c) => c.ok);
                return (
                  <div
                    key={r.id}
                    className="ready"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <div className="between" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {r.handle}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {r.reason}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          className="num"
                          style={{ color: "var(--gold)", fontWeight: 700, fontSize: 18 }}
                        >
                          {formatCents(r.amount_cents)}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {dateFmt.format(new Date(r.created_at))}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      {ready.map((c) => (
                        <div key={c.label} className={`check${c.ok ? " done" : ""}`}>
                          <span className="box">{c.ok ? "✓" : ""}</span>
                          {c.label}
                        </div>
                      ))}
                    </div>

                    {r.status === "paid" ? (
                      <span className="pill paid" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                        <span className="dot" /> paid via {r.method_label ?? "transfer"}
                      </span>
                    ) : (
                      <form action={approvePayoutRequest.bind(null, r.id)}>
                        <button className="btn btn-gold btn-block" disabled={!clear}>
                          {clear ? "Approve payout" : "Blocked — checks incomplete"}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel" style={{ padding: 24 }}>
          <h2 className="section-title">Brackets</h2>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
            Lock entries to generate the bracket, then report results on the
            tournament page. The champion is credited the full purse.
          </p>
          {manageable.length === 0 ? (
            <p className="empty">No active tournaments.</p>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {manageable.map((t) => (
                <div
                  key={t.id}
                  className="between"
                  style={{ gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div className="muted num" style={{ fontSize: 13 }}>
                      {formatCents(t.pool_cents)} purse · {t.filled} players
                    </div>
                  </div>
                  {t.status === "live" ? (
                    <Link href={`/t/${t.id}`} className="btn btn-ghost">
                      Open bracket →
                    </Link>
                  ) : (
                    <form action={startTournament.bind(null, t.id)}>
                      <button className="btn btn-gold" disabled={t.filled < 2}>
                        {t.filled < 2 ? "Need 2+ players" : "Lock & start"}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
