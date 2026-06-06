import type { ArenaCard } from "../../model";
import { cardThemeStyle } from "../../logic";

type CombatantDeckProps = {
  cards: [ArenaCard, ArenaCard];
  onReturn: () => void;
};

export default function CombatantDeck({ cards, onReturn }: CombatantDeckProps) {
  return (
    <div
      className="home-combatant-deck"
      role="group"
      aria-label="Return to arena setup"
    >
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="home-combatant-deck__card"
          data-card-side={card.side}
          style={{ zIndex: cards.length - index }}
        >
          <MiniCombatantCard card={card} onReturn={onReturn} />
        </div>
      ))}
      <button
        type="button"
        className="home-combatant-deck__hint"
        onClick={onReturn}
      >
        RETURN
      </button>
    </div>
  );
}

type MiniCombatantCardProps = {
  card: ArenaCard;
  onReturn: () => void;
};

function MiniCombatantCard({ card, onReturn }: MiniCombatantCardProps) {
  const themeStyle = cardThemeStyle(card.theme);

  return (
    <button
      type="button"
      aria-label="Return to arena setup"
      className="home-combatant-deck__mini-card"
      onClick={onReturn}
      style={themeStyle}
    >
      <span className="home-combatant-deck__mini-top">
        <span>{card.serial}</span>
        <span>{card.powerIndex}</span>
      </span>
      <span className="home-combatant-deck__mini-art" aria-hidden="true">
        <span />
      </span>
      <span className="home-combatant-deck__mini-name">
        {card.side === "left" ? "ALPHA" : "OMEGA"}
      </span>
    </button>
  );
}
