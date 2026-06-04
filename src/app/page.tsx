import CRTBackgroundWrapper from "@/components/background/CRTBackgroundWrapper";
import { loadHomeArenaCombatants } from "@/features/home-arena/data/loadHomeArenaData";
import { HomeArenaStage } from "@/features/home-arena";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const combatantOptions = await loadHomeArenaCombatants();

  return (
    <CRTBackgroundWrapper>
      <HomeArenaStage combatantOptions={combatantOptions} />
    </CRTBackgroundWrapper>
  );
}
