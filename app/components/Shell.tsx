import Link from "next/link";
import { NavLinks } from "./NavLinks";

/** App frame: sticky nav rail + main stage. The arena bg sits behind it. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand">
          <span className="mark">C</span>
          Circuit
        </Link>
        <NavLinks />
        <div className="rail-foot">
          <span className="avatar">N</span>
          <span className="who">
            <b>nova</b>
            <span>nova@circuit.gg</span>
          </span>
        </div>
      </aside>
      <main className="stage">{children}</main>
    </div>
  );
}
