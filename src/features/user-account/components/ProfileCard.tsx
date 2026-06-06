import Link from "next/link";
import { signOutAction } from "../actions/authActions";
import styles from "../styles/account.module.css";

interface ProfileCardProps {
  email: string;
}

export function ProfileCard({ email }: ProfileCardProps) {
  const initials = email.charAt(0).toUpperCase();

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backButton}>
            ← Arena
          </Link>
          <h1 className={styles.title}>Account</h1>
        </div>
        <form action={signOutAction}>
          <button className={styles.logoutButton} type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <span className={styles.displayName}>{email}</span>
            <span className={styles.email}>{email}</span>
          </div>
        </div>
      </div>
    </>
  );
}
