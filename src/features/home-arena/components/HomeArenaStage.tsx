import { arenaCards } from "../data/arenaCards";
import ArenaVersusMark from "./ArenaVersusMark";
import BattleStartButton from "./BattleStartButton";
import CardDockSlot from "./CardDockSlot";
import HologramCombatantCard from "./HologramCombatantCard";

export default function HomeArenaStage() {
  const [leftCard, rightCard] = arenaCards;

  return (
    <section className="min-h-screen px-5 pb-[18vh] pt-[6vh] sm:px-8 sm:pt-[7vh] md:pb-[16vh] md:pt-[8vh]">
      <div className="mx-auto flex w-full max-w-[72rem] flex-col items-center gap-14 sm:gap-16">
        <div className="grid w-full grid-cols-1 justify-items-center gap-7 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-10 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-12">
          <div className="relative w-[min(84vw,18.5rem)] sm:w-[18.75rem] sm:justify-self-end md:w-[19.5rem]">
            <CardDockSlot side={leftCard.side} theme={leftCard.theme} />
            <HologramCombatantCard card={leftCard} />
          </div>

          <ArenaVersusMark />

          <div className="relative w-[min(84vw,18.5rem)] sm:w-[18.75rem] sm:justify-self-start md:w-[19.5rem]">
            <CardDockSlot side={rightCard.side} theme={rightCard.theme} />
            <HologramCombatantCard card={rightCard} />
          </div>
        </div>

        <div className="mt-4 sm:mt-8 md:mt-10">
          <BattleStartButton />
        </div>
      </div>
    </section>
  );
}
