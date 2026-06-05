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

  const battles = await getUserBattles(user.id);

  return <BattleHistory battles={battles ?? []} />;
}
