import Link from "next/link";
import { Badge, Card, Heading, Text } from "@whop/react/components";
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
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Open circuit
        </Text>
        <Heading as="h1" size="8" style={{ marginTop: 8 }}>
          Enter the bracket.
        </Heading>
        <Text
          as="p"
          size="3"
          color="gray"
          style={{ maxWidth: "56ch", marginTop: 8 }}
        >
          Buy in, fill the purse, and get paid when you win. Every entry stacks
          the pot; the whole payout runs on Circuit.
        </Text>
      </div>

      <div className="grid">
        {tournaments.map((t) => (
          <Card key={t.id} asChild size="2" variant="surface">
            <Link href={`/t/${t.id}`} className="tcard">
              <div className="tcard-head">
                <div>
                  <Text
                    size="1"
                    color="gray"
                    weight="medium"
                    style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
                  >
                    {t.game}
                  </Text>
                  <Heading as="h3" size="5" style={{ marginTop: 4 }}>
                    {t.name}
                  </Heading>
                  <Text size="2" color="gray">
                    by {t.host}
                  </Text>
                </div>
                {t.status === "completed" ? (
                  <Badge color="orange" variant="soft">
                    settled
                  </Badge>
                ) : t.status === "live" ? (
                  <Badge color="teal" variant="soft">
                    live
                  </Badge>
                ) : (
                  <Badge color="orange" variant="surface">
                    {formatShort(t.entry_fee_cents)}
                  </Badge>
                )}
              </div>

              <PrizeMeter
                poolCents={t.pool_cents}
                filled={t.filled}
                capacity={t.capacity}
              />

              <div className="between" style={{ marginTop: "auto" }}>
                <Text size="2" color="gray">
                  {t.status === "completed"
                    ? `Won by ${t.winner_email?.split("@")[0]}`
                    : t.status === "live"
                      ? "Bracket in progress"
                      : dateFmt.format(new Date(t.starts_at))}
                </Text>
                {t.status === "open" && (
                  <Badge color="teal" variant="soft">
                    open
                  </Badge>
                )}
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
