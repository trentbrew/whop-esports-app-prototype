import { formatCents } from "@/lib/money";

/**
 * Signature element: the purse. One gold bar encodes both the pot size and
 * how full the bracket is — money and competition in a single mark.
 */
export function PrizeMeter({
  poolCents,
  filled,
  capacity,
  size = "md",
}: {
  poolCents: number;
  filled: number;
  capacity: number;
  size?: "md" | "lg";
}) {
  const pct = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  return (
    <div className="purse">
      <div className="purse-row">
        <span
          className="purse-amt"
          style={size === "lg" ? { fontSize: 38 } : undefined}
        >
          {formatCents(poolCents)}
          <small>purse</small>
        </span>
        <span className="purse-count num">
          {filled}/{capacity}
        </span>
      </div>
      <div className="meter">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
