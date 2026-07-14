import Link from "next/link";
import { listTournaments } from "@/lib/db";
import { formatShort } from "@/lib/money";
import { PrizeMeter } from "./components/PrizeMeter";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function Lobby() {
  const tournaments = listTournaments();

  return (
    <>
      <p className="eyebrow">Open circuit</p>
      <h1 className="page">Enter the bracket.</h1>
      <p className="lede">
        Buy in, fill the purse, and get paid when you win. Every entry stacks
        the pot; the whole payout runs on Circuit.
      </p>

      <div className="grid">
        {tournaments.map((t) => (
          <Link key={t.id} href={`/t/${t.id}`} className="panel tcard">
            <div className="tcard-head">
              <div>
                <span className="game-tag">{t.game}</span>
                <h3>{t.name}</h3>
                <div className="host">by {t.host}</div>
              </div>
              {t.status === "completed" ? (
                <span className="pill completed">
                  <span className="dot" /> settled
                </span>
              ) : t.status === "live" ? (
                <span className="pill open">
                  <span className="dot" /> live
                </span>
              ) : (
                <span className="fee">{formatShort(t.entry_fee_cents)}</span>
              )}
            </div>

            <PrizeMeter
              poolCents={t.pool_cents}
              filled={t.filled}
              capacity={t.capacity}
            />

            <div className="between" style={{ marginTop: "auto" }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {t.status === "completed"
                  ? `Won by ${t.winner_email?.split("@")[0]}`
                  : t.status === "live"
                    ? "Bracket in progress"
                    : dateFmt.format(new Date(t.starts_at))}
              </span>
              {t.status === "open" && (
                <span className="pill open">
                  <span className="dot" /> open
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
