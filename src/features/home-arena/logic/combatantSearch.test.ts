import type { CombatantOption } from "../model";
import { describe, expect, test } from "@/test/testing";

import {
  findCompletion,
  findExactCombatantOption,
  findMatches,
} from "./combatantSearch";

const options: CombatantOption[] = [
  {
    id: "captain-america",
    name: "Captain America",
    universe: "Marvel Comics",
    aliases: ["Steve Rogers", "Cap"],
  },
  {
    id: "punisher",
    name: "Punisher",
    universe: "Marvel Comics",
    aliases: ["Frank Castle"],
  },
  {
    id: "giorno",
    name: "Giorno Giovanna",
    universe: "JoJo's Bizarre Adventure",
    aliases: ["GioGio"],
  },
  {
    id: "ozymandias",
    name: "Ozymandias",
    universe: "Fate/Grand Order",
    aliases: ["Ramses II"],
  },
  {
    id: "michael-myers",
    name: "Michael Myers",
    universe: "Halloween",
  },
  {
    id: "jason-voorhees",
    name: "Jason Voorhees",
    universe: "Friday the 13th",
  },
  {
    id: "darth-vader",
    name: "Darth Vader",
    universe: "Star Wars",
  },
];

describe("combatant search", () => {
  test("prioritizes exact names before prefixes and fuzzy text matches", () => {
    const matches = findMatches(options, "captain");

    expect(matches[0].id).toBe("captain-america");
    expect(matches.map((option) => option.id)).toContain("captain-america");
  });

  test("finds aliases and universe text", () => {
    expect(findMatches(options, "frank")[0].id).toBe("punisher");
    expect(findMatches(options, "fate")[0].id).toBe("ozymandias");
  });

  test("limits match count for compact autocomplete menus", () => {
    expect(findMatches(options, "a")).toHaveLength(6);
  });

  test("returns completion suffix only when a longer name starts with the query", () => {
    expect(findCompletion(options, "Capt")).toEqual({
      option: options[0],
      suffix: "ain America",
    });

    expect(findCompletion(options, "Captain America")).toBeNull();
    expect(findCompletion(options, "")).toBeNull();
  });

  test("resolves exact options by id, name, or alias", () => {
    expect(findExactCombatantOption(options, "punisher")?.id).toBe("punisher");
    expect(findExactCombatantOption(options, "Giorno Giovanna")?.id).toBe(
      "giorno",
    );
    expect(findExactCombatantOption(options, "Ramses II")?.id).toBe(
      "ozymandias",
    );
    expect(findExactCombatantOption(options, "unknown")).toBeNull();
  });
});
