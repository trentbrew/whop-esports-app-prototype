import Link from "next/link";
import { NavLinks } from "./NavLinks";

/** App frame: sticky nav rail + main stage. The arena bg sits behind it. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg className="mark-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 20L15 4" stroke="url(#whop-orange-grad)" strokeWidth="4.5" strokeLinecap="round"/>
            <path d="M12 20L21 4" stroke="url(#whop-orange-grad)" strokeWidth="4.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="whop-orange-grad" x1="6" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff5f25" />
                <stop offset="1" stopColor="#ff3b00" />
              </linearGradient>
            </defs>
          </svg>
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
