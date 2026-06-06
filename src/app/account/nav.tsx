"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const NAV_ITEMS = [
  { label: "IDENTITY", href: "/account/identity" },
  { label: "ARCHIVE", href: "/account/archive" },
  { label: "COMMENDATIONS", href: "/account/commendations" },
  { label: "INTEL", href: "/account/intel" },
] as const;

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${isActive ? styles.linkActive : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
