import { getCurrentUser } from "@/features/user-account";
import { getUserBattles } from "@/lib/profile";
import BattleHistory from "@/components/profile/BattleHistory";

export default async function ArchivePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="error-state">
        PROFILE NOT INITIALIZED · CONTACT SUPPORT
      </div>
    );
  }

  const battles = await getUserBattles(user.id);

  return <BattleHistory battles={battles ?? []} />;
}
