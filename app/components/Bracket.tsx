import type { Bracket as BracketData, Match } from "@/lib/db";
import { feeder, roundLabel } from "@/lib/bracket";
import { reportMatch } from "@/app/actions";

/**
 * Single-elimination bracket. Read-only for spectators; when `interactive`,
 * each ready match's players become buttons that report the result (organizer
 * action — no auth boundary in this prototype).
 *
 * Match positions are computed here rather than left to flexbox: the tree is
 * laid out on a fixed pitch so every card is the same size, and knowing each
 * card's exact center is what lets us draw the connectors as real paths.
 */

const MATCH_W = 184;
const SLOT_H = 36;
const BORDER = 1;
// box-sizing is border-box, so the card must budget for its own border or the
// bottom slot gets clipped.
const MATCH_H = SLOT_H * 2 + BORDER * 2;
const ROW_GAP = 16; // vertical space between round-1 matches
const COL_GAP = 72; // horizontal space between rounds — the edges live here
const PITCH = MATCH_H + ROW_GAP;
const COL_PITCH = MATCH_W + COL_GAP;

type Placed = { match: Match; x: number; y: number; cy: number };
type Edge = { key: string; d: string; live: boolean };

/**
 * Places every match and routes an edge from each one into its feeder.
 * Round 1 sits on a constant pitch; each later match centers on the midpoint
 * of the two matches that feed it, which is what gives a bracket its taper.
 */
function layout(bracket: BracketData) {
  const centerOf = new Map<string, number>();
  const placed: Placed[] = [];

  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      const cy =
        match.round === 1
          ? match.position * PITCH + MATCH_H / 2
          : (centerOf.get(`${match.round - 1}:${match.position * 2}`)! +
              centerOf.get(`${match.round - 1}:${match.position * 2 + 1}`)!) /
            2;
      centerOf.set(`${match.round}:${match.position}`, cy);
      placed.push({
        match,
        x: (match.round - 1) * COL_PITCH,
        y: cy - MATCH_H / 2,
        cy,
      });
    }
  }

  const edges: Edge[] = [];
  for (const { match, x, cy } of placed) {
    if (match.round === bracket.totalRounds) continue;
    const next = centerOf.get(
      `${match.round + 1}:${feeder(match.position).pos}`,
    )!;
    edges.push({
      key: match.id,
      d: elbow(x + MATCH_W, cy, x + COL_PITCH, next),
      live: Boolean(match.winner_email),
    });
  }

  const firstRound = bracket.rounds[0]?.matches.length ?? 0;
  return {
    placed,
    edges,
    width: bracket.totalRounds * COL_PITCH - COL_GAP,
    height: firstRound * PITCH - ROW_GAP,
  };
}

/** Horizontal → vertical → horizontal, with the two corners rounded off. */
function elbow(x1: number, y1: number, x2: number, y2: number): string {
  const midX = x1 + (x2 - x1) / 2;
  const dy = y2 - y1;
  if (Math.abs(dy) < 0.5) return `M${x1} ${y1} H${x2}`;

  const dir = Math.sign(dy);
  const r = Math.min(10, Math.abs(dy) / 2, midX - x1);
  return [
    `M${x1} ${y1}`,
    `H${midX - r}`,
    `Q${midX} ${y1} ${midX} ${y1 + dir * r}`,
    `V${y2 - dir * r}`,
    `Q${midX} ${y2} ${midX + r} ${y2}`,
    `H${x2}`,
  ].join(" ");
}

export function Bracket({
  tournamentId,
  bracket,
  interactive,
}: {
  tournamentId: string;
  bracket: BracketData;
  interactive: boolean;
}) {
  const { placed, edges, width, height } = layout(bracket);

  return (
    <div className="bracket-scroll">
      <div
        className="bracket"
        style={
          {
            width,
            "--match-w": `${MATCH_W}px`,
            "--slot-h": `${SLOT_H}px`,
            "--col-gap": `${COL_GAP}px`,
          } as React.CSSProperties
        }
      >
        <div className="bracket-labels">
          {bracket.rounds.map((r) => (
            <div className="round-label" key={r.round}>
              {roundLabel(r.round, bracket.totalRounds)}
            </div>
          ))}
        </div>

        <div className="bracket-graph" style={{ width, height }}>
          <svg
            className="bracket-edges"
            width={width}
            height={height}
            aria-hidden
          >
            {edges.map((e) => (
              <path
                key={e.key}
                d={e.d}
                className={`edge${e.live ? " live" : ""}`}
              />
            ))}
          </svg>

          {placed.map(({ match, x, y }) => (
            <MatchCard
              key={match.id}
              tournamentId={tournamentId}
              match={match}
              interactive={interactive}
              x={x}
              y={y}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  tournamentId,
  match,
  interactive,
  x,
  y,
}: {
  tournamentId: string;
  match: Match;
  interactive: boolean;
  x: number;
  y: number;
}) {
  const ready = Boolean(match.a_email && match.b_email);
  const decided = Boolean(match.winner_email);
  const canReport = interactive && ready && !decided;

  // `playable`, not `ready` — the global `.ready` is the checklist block.
  return (
    <div
      className={`match${decided ? " decided" : ""}${
        canReport ? " playable" : ""
      }`}
      style={{ left: x, top: y, width: MATCH_W, height: MATCH_H }}
    >
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
  // `vacant`, not `empty` — the global `.empty` is a padded empty-state block.
  const cls = `slot${isWinner ? " winner" : ""}${isLoser ? " loser" : ""}${
    !handle ? " vacant" : ""
  }`;

  if (canReport && email) {
    return (
      <form action={reportMatch.bind(null, tournamentId, matchId, email)}>
        <button type="submit" className={`${cls} pickable`}>
          <span className="who">{label}</span>
          <span className="advance">advance →</span>
        </button>
      </form>
    );
  }

  return (
    <div className={cls}>
      <span className="who">{label}</span>
      {isWinner && <span className="crown">◆</span>}
    </div>
  );
}
