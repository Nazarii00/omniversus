import { getCurrentUser } from "@/features/user-account";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "./nav";
import styles from "./layout.module.css";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.arenaLink}>
          ← ARENA
        </Link>
      </div>

      <AccountNav />

      <div className={styles.content}>{children}</div>
    </div>
  );
}
