import type { ArenaCard, CombatantOption } from "../model";

export default function makeCombatantCard(
  template: ArenaCard,
  name: string,
  option?: CombatantOption | null,
): ArenaCard {
  const trimmedName = option?.name ?? name.trim();
  const versionCopy = option?.versionLabel ? ` / ${option.versionLabel}` : "";

  return {
    ...template,
    id: `${template.side}-${option?.versionId ?? option?.subjectId ?? slugify(trimmedName)}`,
    name: trimmedName,
    universe: option?.universe ?? "Input Pending",
    portraitUrl: option?.portraitUrl,
    stance:
      option?.versionLabel
        ? `Loaded database dossier${versionCopy}`
        : template.side === "left"
          ? "Queued as left-side contender"
          : "Queued as right-side contender",
    backCopy:
      option?.summary ??
      "Temporary test card generated from the arena input slot. Full dossier data will come from the battle report pipeline.",
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
