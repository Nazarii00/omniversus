import { getCurrentUser } from "@/features/user-account";
import { getUserBattles } from "@/features/user-account/server/profile-data";
import BattleHistory from "@/features/user-account/components/battle-history";

export default async function ArchivePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="error-state">
        PROFILE NOT INITIALIZED · CONTACT SUPPORT
      </div>
    );
  }

  // DEVELOPMENT BYPASS — fully mocked battle history, no DB calls
  if (process.env.NODE_ENV === "development") {
    const DEV_BATTLES = [
      {
        id: "dev-1",
        battleNumber: 42,
        fighterA: "Gojo Satoru",
        fighterB: "Madara Uchiha",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-06-07",
        wager: 500,
      },
      {
        id: "dev-2",
        battleNumber: 41,
        fighterA: "Kratos",
        fighterB: "Doomslayer",
        mode: "1v1" as const,
        result: "loss" as const,
        date: "2026-06-06",
        wager: -300,
      },
      {
        id: "dev-3",
        battleNumber: 40,
        fighterA: "Homelander",
        fighterB: "Omni-Man",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-06-05",
        wager: 750,
      },
      {
        id: "dev-4",
        battleNumber: 39,
        fighterA: "Meruem",
        fighterB: "Frieza",
        mode: "1v1" as const,
        result: "draw" as const,
        date: "2026-06-04",
      },
      {
        id: "dev-5",
        battleNumber: 38,
        fighterA: "Saitama",
        fighterB: "Zeno",
        mode: "FFA" as const,
        result: "loss" as const,
        date: "2026-06-03",
        wager: -1200,
      },
      {
        id: "dev-6",
        battleNumber: 37,
        fighterA: "Rimuru Tempest",
        fighterB: "Ainz Ooal Gown",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-06-02",
        wager: 950,
      },
      {
        id: "dev-7",
        battleNumber: 36,
        fighterA: "Geralt of Rivia",
        fighterB: "Arthur Morgan",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-06-01",
      },
      {
        id: "dev-8",
        battleNumber: 35,
        fighterA: "Batman",
        fighterB: "Iron Man",
        mode: "2v2" as const,
        result: "loss" as const,
        date: "2026-05-28",
        wager: -400,
      },
      {
        id: "dev-9",
        battleNumber: 34,
        fighterA: "Sung Jin-Woo",
        fighterB: "Itachi Uchiha",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-05-25",
        wager: 800,
      },
      {
        id: "dev-10",
        battleNumber: 33,
        fighterA: "Levi Ackerman",
        fighterB: "Zoro Roronoa",
        mode: "1v1" as const,
        result: "draw" as const,
        date: "2026-05-22",
      },
      {
        id: "dev-11",
        battleNumber: 32,
        fighterA: "Guts",
        fighterB: "Doomslayer",
        mode: "1v1" as const,
        result: "win" as const,
        date: "2026-05-19",
        wager: 600,
      },
      {
        id: "dev-12",
        battleNumber: 31,
        fighterA: "Vergil",
        fighterB: "Sesshomaru",
        mode: "1v1" as const,
        result: "loss" as const,
        date: "2026-05-15",
        wager: -250,
      },
      {
        id: "dev-13",
        battleNumber: 30,
        fighterA: "Walter White",
        fighterB: "Gustavo Fring",
        mode: "CUSTOM" as const,
        result: "win" as const,
        date: "2026-05-12",
        wager: 100,
      },
      {
        id: "dev-14",
        battleNumber: 29,
        fighterA: "Light Yagami",
        fighterB: "Lelouch vi Britannia",
        mode: "1v1" as const,
        result: "loss" as const,
        date: "2026-05-08",
      },
      {
        id: "dev-15",
        battleNumber: 28,
        fighterA: "Thanos",
        fighterB: "Darkseid",
        mode: "FFA" as const,
        result: "win" as const,
        date: "2026-05-03",
        wager: 1500,
      },
    ];
    return <BattleHistory battles={DEV_BATTLES} />;
  }

  const battles = await getUserBattles(user.id);

  return <BattleHistory battles={battles ?? []} />;
}
