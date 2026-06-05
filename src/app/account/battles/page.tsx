import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, BattlesHistoryList } from "@/features/user-account";
import { getAllBattles } from "@/server/user";

export default async function BattlesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const battles = await getAllBattles(user.id);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <Link
          href="/"
          style={{
            padding: "0.45rem 0.75rem",
            background: "transparent",
            border: "1px solid rgba(104, 183, 104, 0.25)",
            borderRadius: 4,
            color: "#68b768",
            fontSize: "0.75rem",
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          ← Arena
        </Link>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#d7e2d6",
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          Battle history
        </h1>
      </div>
      <BattlesHistoryList battles={battles} />
    </div>
  );
}
