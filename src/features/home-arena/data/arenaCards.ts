import type { ArenaCard, ArenaCardTheme } from "../types";

const greenTheme: ArenaCardTheme = {
  accent: "#245c24",
  accentSoft: "rgba(52, 125, 52, 0.36)",
  accentGlow: "rgba(88, 210, 88, 0.72)",
  accentText: "#d6ffd2",
  secondary: "#78d478",
};

const amberTheme: ArenaCardTheme = {
  accent: "#c8a84b",
  accentSoft: "rgba(200, 168, 75, 0.22)",
  accentGlow: "rgba(200, 168, 75, 0.56)",
  accentText: "#ffe8a3",
  secondary: "#f5d76e",
};

export const arenaCards: ArenaCard[] = [
  {
    id: "alpha",
    side: "left",
    name: "Contender Alpha",
    universe: "Universe Pending",
    serial: "A-01",
    powerIndex: "87.4",
    stance: "Close pressure profile",
    backTitle: "Reverse Dossier",
    backCopy:
      "Placeholder panel for canonical feats, matchup logic, arena modifiers, and AI-generated battle notes.",
    theme: greenTheme,
    metrics: [
      { label: "Output", value: "A-" },
      { label: "Tempo", value: "High" },
      { label: "Range", value: "Mid" },
    ],
  },
  {
    id: "omega",
    side: "right",
    name: "Contender Omega",
    universe: "Universe Pending",
    serial: "B-02",
    powerIndex: "91.8",
    stance: "Distance control profile",
    backTitle: "Reverse Dossier",
    backCopy:
      "Placeholder panel for lore evidence, scaling conflicts, verdict telemetry, and counter-condition notes.",
    theme: amberTheme,
    metrics: [
      { label: "Output", value: "A" },
      { label: "Tempo", value: "Steady" },
      { label: "Range", value: "Long" },
    ],
  },
];
