import type { ArenaCard } from "../model";

export default function makeCombatantCard(
  template: ArenaCard,
  name: string,
): ArenaCard {
  const trimmedName = name.trim();

  return {
    ...template,
    id: `${template.side}-${trimmedName.toLowerCase().replace(/\s+/g, "-")}`,
    name: trimmedName,
    universe: "Input Pending",
    stance:
      template.side === "left"
        ? "Queued as left-side contender"
        : "Queued as right-side contender",
    backCopy:
      "Temporary test card generated from the arena input slot. Full dossier data will come from the battle report pipeline.",
  };
}
