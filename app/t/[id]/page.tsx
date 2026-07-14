import Link from "next/link";
import { notFound } from "next/navigation";
import { CURRENT_USER, getBracket, getTournament } from "@/lib/db";
import { formatCents, formatShort } from "@/lib/money";
import { PrizeMeter } from "@/app/components/PrizeMeter";
import { EnterButton } from "@/app/components/EnterButton";
import { Bracket } from "@/app/components/Bracket";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTournament(id);
  if (!t) notFound();

  const entered = t.roster.some((e) => e.player_email === CURRENT_USER);
  const spotsLeft = t.capacity - t.filled;
  const bracket = getBracket(t.id);

  return (
    <>
      <Link href="/" className="link" style={{ fontSize: 13 }}>
        ← All tournaments
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 6px" }}>
        <span className="game-tag">{t.game}</span>
        {t.status === "completed" ? (
          <span className="pill completed">
            <span className="dot" /> settled
          </span>
        ) : t.status === "live" ? (
          <span className="pill open">
            <span className="dot" /> live
          </span>
        ) : (
          <span className="pill open">
            <span className="dot" /> open
          </span>
        )}
      </div>
      <h1 className="page">{t.name}</h1>
      <p className="lede" style={{ marginBottom: 24 }}>
        Hosted by {t.host}. {t.description}
      </p>

      <div className="stack">
        <section className="panel" style={{ padding: 24 }}>
          <PrizeMeter
            poolCents={t.pool_cents}
            filled={t.filled}
            capacity={t.capacity}
            size="lg"
          />
          <div className="meta" style={{ marginTop: 22 }}>
            <div>
              <div className="k">Entry</div>
              <div className="v num" style={{ color: "var(--gold)" }}>
                {formatShort(t.entry_fee_cents)}
              </div>
            </div>
            <div>
              <div className="k">Starts</div>
              <div className="v">{dateFmt.format(new Date(t.starts_at))}</div>
            </div>
            <div>
              <div className="k">Field</div>
              <div className="v num">
                {t.filled}/{t.capacity}
              </div>
            </div>
            <div>
              <div className="k">
                {t.status === "completed" ? "Winner" : "Spots left"}
              </div>
              <div className="v num">
                {t.status === "completed"
                  ? t.winner_email?.split("@")[0]
                  : spotsLeft}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            {t.status === "completed" ? (
              <div className="ready">
                <div className="check done">
                  <span className="box">✓</span>
                  {t.winner_email?.split("@")[0]} took the{" "}
                  {formatCents(t.pool_cents)} purse.
                </div>
              </div>
            ) : t.status === "live" ? (
              <button className="btn btn-ghost btn-block" disabled>
                Entries locked — bracket in progress
              </button>
            ) : entered ? (
              <button className="btn btn-ghost btn-block" disabled>
                ✓ You&apos;re in — good luck
              </button>
            ) : (
              <EnterButton
                tournamentId={t.id}
                name={t.name}
                feeCents={t.entry_fee_cents}
              />
            )}
          </div>
        </section>

        {bracket && (
          <section className="panel" style={{ padding: 24 }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                Bracket
              </h2>
              {t.status === "live" && (
                <span className="muted" style={{ fontSize: 13 }}>
                  Tap a player to advance them
                </span>
              )}
            </div>
            {bracket.champion && (
              <div className="champion-banner">
                <span className="trophy">🏆</span>
                <div>
                  <b>{bracket.champion.handle}</b>
                  <div className="muted num" style={{ fontSize: 13 }}>
                    Champion · {formatCents(t.pool_cents)} purse
                  </div>
                </div>
              </div>
            )}
            <Bracket
              tournamentId={t.id}
              bracket={bracket}
              interactive={t.status === "live"}
            />
          </section>
        )}

        <section className="panel" style={{ padding: 24 }}>
          <h2 className="section-title">Roster</h2>
          {t.roster.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>
              No players yet. Be the first to buy in.
            </p>
          ) : (
            <div className="rows">
              {t.roster.map((e, i) => (
                <div className="row" key={e.id}>
                  <span className="seed">{String(i + 1).padStart(2, "0")}</span>
                  <span className="handle">
                    {e.player_handle}
                    {e.player_email === CURRENT_USER && (
                      <span className="muted"> · you</span>
                    )}
                  </span>
                  {t.winner_email === e.player_email && (
                    <span className="win">winner</span>
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
