import type { CombatantOption } from "../model";

const MAX_MATCHES = 6;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function optionSearchText(option: CombatantOption) {
  return [option.name, option.universe, ...(option.aliases ?? [])]
    .join(" ")
    .toLowerCase();
}

function scoreOption(option: CombatantOption, query: string) {
  const normalizedName = option.name.toLowerCase();
  const normalizedAliases =
    option.aliases?.map((alias) => alias.toLowerCase()) ?? [];
  const searchText = optionSearchText(option);

  if (!query) return 1;
  if (normalizedName === query) return 100;
  if (normalizedName.startsWith(query)) return 80;
  if (normalizedAliases.some((alias) => alias === query)) return 72;
  if (normalizedAliases.some((alias) => alias.startsWith(query))) return 64;
  if (searchText.includes(query)) return 36;

  return 0;
}

export function findMatches(options: CombatantOption[], query: string) {
  const normalizedQuery = normalizeSearch(query);

  return options
    .map((option) => ({ option, score: scoreOption(option, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name),
    )
    .slice(0, MAX_MATCHES)
    .map(({ option }) => option);
}

export function findCompletion(options: CombatantOption[], query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) return null;

  const option = options.find((item) =>
    item.name.toLowerCase().startsWith(normalizedQuery),
  );

  if (!option || option.name.length <= query.length) return null;

  return {
    option,
    suffix: option.name.slice(query.length),
  };
}
