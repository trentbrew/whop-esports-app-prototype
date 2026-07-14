import Link from "next/link";
import Image from "next/image";
import { NavLinks } from "./NavLinks";
import logoImg from "../../logo.png";

/** App frame: sticky nav rail + main stage. The arena bg sits behind it. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image
            src={logoImg}
            alt="GG Logo"
            width={24}
            height={24}
            style={{ borderRadius: "6px" }}
          />
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
