import { getCurrentUser, signOutAction } from "@/features/user-account";
import {
  getUserProfile,
  getUserBattles,
} from "@/features/user-account/server/profile-data";
import { getPrisma } from "@/server/db/prisma";
import styles from "./page.module.css";

/* ================================================================
   IDENTITY PAGE
   ================================================================ */

async function ensureProfile(supabaseId: string, fallbackUsername: string) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const existing = await prisma.profile.findUnique({
    where: { supabaseId },
  });

  if (existing) return existing;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.profile as any).create({
    data: {
      supabaseId,
      username: fallbackUsername,
      clearance: "SIGMA-1",
      reputation: 0,
      credits: 100,
    },
  });

  return prisma.profile.findUnique({ where: { supabaseId } });
}

export default async function IdentityPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // layout handles redirect
  }

  // DEVELOPMENT BYPASS — fully mocked UI without any DB calls
  if (process.env.NODE_ENV === "development") {
    const DEV = {
      initial: "D",
      username: "dev_user",
      email: user.email ?? "dev@arena.local",
      joined: "2026-06-07",
      clearance: "SIGMA-1",
      reputation: 42,
      credits: 1337,
      totalBattles: 12,
      winRate: 67,
      currentStreak: 3,
      recentBattles: [
        { fighterB: "ShadowWolf", result: "win" as const, date: "2026-06-07" },
        { fighterB: "BlazeFist", result: "loss" as const, date: "2026-06-06" },
        { fighterB: "IceQueen", result: "win" as const, date: "2026-06-05" },
      ],
    } as const;

    return (
      <div className={styles.identity}>
        <div className={styles.profileLeft}>
          <div className={styles.avatar}>
            <span className={styles.avatarInitial}>{DEV.initial}</span>
          </div>
          <hr className={styles.idDivider} />
          <div className={styles.idMeta}>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>USERNAME</span>
              <span className={styles.idValue}>{DEV.username}</span>
            </div>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>EMAIL</span>
              <span className={styles.idValueDim}>{DEV.email}</span>
            </div>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>JOINED</span>
              <span className={styles.idValueDim}>{DEV.joined}</span>
            </div>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>CLEARANCE</span>
              <span className={styles.idValueDim}>{DEV.clearance}</span>
            </div>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>REPUTATION</span>
              <span className={styles.idValueDim}>{DEV.reputation}</span>
            </div>
            <div className={styles.idRow}>
              <span className={styles.idLabel}>CREDITS</span>
              <span className={styles.idValueDim}>{DEV.credits}</span>
            </div>
          </div>
          <form action={signOutAction}>
            <button className={styles.signOutButton} type="submit">
              SIGN OUT
            </button>
          </form>
        </div>
        <div className={styles.profileRight}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>TOTAL BATTLES</span>
              <span className={styles.statValue}>{DEV.totalBattles}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>WIN RATE</span>
              <span className={styles.statValue}>{DEV.winRate}%</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>CUR. STREAK</span>
              <span className={styles.statValue}>x{DEV.currentStreak}</span>
            </div>
          </div>
          <div className={styles.activitySection}>
            <span className={styles.activityLabel}>{"// RECENT ACTIVITY"}</span>
            {DEV.recentBattles.map((battle, i) => (
              <div key={i} className={styles.activityRow}>
                <span className={styles.activityOpponent}>
                  {battle.fighterB}
                </span>
                <span
                  className={`${styles.activityResult} ${
                    battle.result === "win"
                      ? styles.activityResultWin
                      : styles.activityResultLoss
                  }`}
                >
                  {battle.result.toUpperCase()}
                </span>
                <span className={styles.activityDate}>{battle.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const email = user.email ?? "Unknown";

  // Ensure profile exists (for users who registered before onboarding was removed)
  await ensureProfile(user.id, email.split("@")[0] ?? "user");

  const profile = await getUserProfile(user.id);
  const recentBattles = await getUserBattles(user.id, 3);

  const initial = email.charAt(0).toUpperCase();
  const joined = profile?.user.createdAt.toISOString().split("T")[0] ?? "—";

  return (
    <div className={styles.identity}>
      {/* LEFT COLUMN — PROFILE INFO */}
      <div className={styles.profileLeft}>
        <div className={styles.avatar}>
          <span className={styles.avatarInitial}>{initial}</span>
        </div>

        <hr className={styles.idDivider} />

        <div className={styles.idMeta}>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>USERNAME</span>
            <span className={styles.idValue}>
              {profile?.user.username ?? "—"}
            </span>
          </div>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>EMAIL</span>
            <span className={styles.idValueDim}>{email}</span>
          </div>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>JOINED</span>
            <span className={styles.idValueDim}>{joined}</span>
          </div>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>CLEARANCE</span>
            <span className={styles.idValueDim}>
              {profile?.user.clearance ?? "—"}
            </span>
          </div>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>REPUTATION</span>
            <span className={styles.idValueDim}>
              {profile?.reputation ?? 0}
            </span>
          </div>
          <div className={styles.idRow}>
            <span className={styles.idLabel}>CREDITS</span>
            <span className={styles.idValueDim}>{profile?.credits ?? 0}</span>
          </div>
        </div>

        <form action={signOutAction}>
          <button className={styles.signOutButton} type="submit">
            SIGN OUT
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN — STATS + RECENT ACTIVITY */}
      <div className={styles.profileRight}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>TOTAL BATTLES</span>
            <span className={styles.statValue}>
              {profile?.totalBattles ?? 0}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>WIN RATE</span>
            <span className={styles.statValue}>{profile?.winRate ?? 0}%</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>CUR. STREAK</span>
            <span className={styles.statValue}>
              x{profile?.currentStreak ?? 0}
            </span>
          </div>
        </div>

        <div className={styles.activitySection}>
          <span className={styles.activityLabel}>{"// RECENT ACTIVITY"}</span>
          {recentBattles && recentBattles.length > 0 ? (
            recentBattles.map((battle, i) => (
              <div key={i} className={styles.activityRow}>
                <span className={styles.activityOpponent}>
                  {battle.fighterB}
                </span>
                <span
                  className={`${styles.activityResult} ${
                    battle.result === "win"
                      ? styles.activityResultWin
                      : styles.activityResultLoss
                  }`}
                >
                  {battle.result.toUpperCase()}
                </span>
                <span className={styles.activityDate}>{battle.date}</span>
              </div>
            ))
          ) : (
            <div className={styles.activityRow}>
              <span className={styles.activityOpponent}>
                No battles recorded
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
