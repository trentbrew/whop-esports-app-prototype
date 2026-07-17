import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Heading, Text } from "@whop/react/components";
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
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <Text asChild size="2" color="gray">
          <Link href="/">← All tournaments</Link>
        </Text>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "16px 0 6px",
          }}
        >
          <Text
            size="1"
            color="gray"
            weight="medium"
            style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {t.game}
          </Text>
          {t.status === "completed" ? (
            <Badge color="orange" variant="soft">
              settled
            </Badge>
          ) : t.status === "live" ? (
            <Badge color="teal" variant="soft">
              live
            </Badge>
          ) : (
            <Badge color="teal" variant="soft">
              open
            </Badge>
          )}
        </div>
        <Heading as="h1" size="8">
          {t.name}
        </Heading>
        <Text as="p" size="3" color="gray" style={{ marginTop: 8 }}>
          Hosted by {t.host}. {t.description}
        </Text>
      </div>

      <div className="stack">
        <Card size="2" variant="surface">
          <PrizeMeter
            poolCents={t.pool_cents}
            filled={t.filled}
            capacity={t.capacity}
            size="lg"
          />
          <div className="meta" style={{ marginTop: 22 }}>
            <div>
              <div className="k">Entry</div>
              <div className="v num" style={{ color: "var(--orange-11)" }}>
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
              <Button
                variant="soft"
                color="gray"
                disabled
                style={{ width: "100%" }}
              >
                Entries locked — bracket in progress
              </Button>
            ) : entered ? (
              <Button
                variant="soft"
                color="gray"
                disabled
                style={{ width: "100%" }}
              >
                ✓ You&apos;re in — good luck
              </Button>
            ) : (
              <EnterButton
                tournamentId={t.id}
                name={t.name}
                feeCents={t.entry_fee_cents}
              />
            )}
          </div>
        </Card>

        {bracket && (
          <Card size="2" variant="surface">
            <div className="between" style={{ marginBottom: 14 }}>
              <Heading as="h2" size="4">
                Bracket
              </Heading>
              {t.status === "live" && (
                <Text size="2" color="gray">
                  Tap a player to advance them
                </Text>
              )}
            </div>
            {bracket.champion && (
              <div className="champion-banner">
                <span className="trophy">🏆</span>
                <div>
                  <Text weight="bold">{bracket.champion.handle}</Text>
                  <Text as="div" size="2" color="gray" className="num">
                    Champion · {formatCents(t.pool_cents)} purse
                  </Text>
                </div>
              </div>
            )}
            <Bracket
              tournamentId={t.id}
              bracket={bracket}
              interactive={t.status === "live"}
            />
          </Card>
        )}

        <Card size="2" variant="surface">
          <Heading as="h2" size="4" style={{ marginBottom: 12 }}>
            Roster
          </Heading>
          {t.roster.length === 0 ? (
            <Text size="2" color="gray">
              No players yet. Be the first to buy in.
            </Text>
          ) : (
            <div className="rows">
              {t.roster.map((e, i) => (
                <div className="row" key={e.id}>
                  <span className="seed">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Text size="2" weight="medium">
                    {e.player_handle}
                    {e.player_email === CURRENT_USER && (
                      <Text color="gray"> · you</Text>
                    )}
                  </Text>
                  {t.winner_email === e.player_email && (
                    <Badge
                      color="orange"
                      variant="soft"
                      style={{ marginLeft: "auto" }}
                    >
                      winner
                    </Badge>
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
