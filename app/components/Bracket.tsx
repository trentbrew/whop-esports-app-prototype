import type { Bracket as BracketData, Match } from "@/lib/db";
import { roundLabel } from "@/lib/bracket";
import { reportMatch } from "@/app/actions";

/**
 * Single-elimination bracket. Read-only for spectators; when `interactive`,
 * each ready match's players become buttons that report the result (organizer
 * action — no auth boundary in this prototype).
 */
export function Bracket({
  tournamentId,
  bracket,
  interactive,
}: {
  tournamentId: string;
  bracket: BracketData;
  interactive: boolean;
}) {
  return (
    <div className="bracket-scroll">
      <div className="bracket">
        {bracket.rounds.map((r) => (
          <div className="round" key={r.round}>
            <div className="round-label">
              {roundLabel(r.round, bracket.totalRounds)}
            </div>
            <div className="round-matches">
              {r.matches.map((m) => (
                <MatchCard
                  key={m.id}
                  tournamentId={tournamentId}
                  match={m}
                  interactive={interactive}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  tournamentId,
  match,
  interactive,
}: {
  tournamentId: string;
  match: Match;
  interactive: boolean;
}) {
  const ready = Boolean(match.a_email && match.b_email);
  const decided = Boolean(match.winner_email);
  const canReport = interactive && ready && !decided;

  return (
    <div className={`match${decided ? " decided" : ""}`}>
      <Slot
        tournamentId={tournamentId}
        matchId={match.id}
        email={match.a_email}
        handle={match.a_handle}
        isWinner={match.winner_email === match.a_email && decided}
        isLoser={decided && match.winner_email !== match.a_email}
        canReport={canReport}
        isBye={match.is_bye === 1 && !match.a_email}
      />
      <Slot
        tournamentId={tournamentId}
        matchId={match.id}
        email={match.b_email}
        handle={match.b_handle}
        isWinner={match.winner_email === match.b_email && decided}
        isLoser={decided && match.winner_email !== match.b_email}
        canReport={canReport}
        isBye={match.is_bye === 1 && !match.b_email}
      />
    </div>
  );
}

function Slot({
  tournamentId,
  matchId,
  email,
  handle,
  isWinner,
  isLoser,
  canReport,
  isBye,
}: {
  tournamentId: string;
  matchId: string;
  email: string | null;
  handle: string | null;
  isWinner: boolean;
  isLoser: boolean;
  canReport: boolean;
  isBye: boolean;
}) {
  const label = handle ?? (isBye ? "bye" : "TBD");
  const cls = `slot${isWinner ? " winner" : ""}${isLoser ? " loser" : ""}${
    !handle ? " empty" : ""
  }`;

  if (canReport && email) {
    return (
      <form action={reportMatch.bind(null, tournamentId, matchId, email)}>
        <button type="submit" className={`${cls} pickable`}>
          <span>{label}</span>
          <span className="advance">advance →</span>
        </button>
      </form>
    );
  }

  return (
    <div className={cls}>
      <span>{label}</span>
      {isWinner && <span className="crown">◆</span>}
    </div>
  );
}
