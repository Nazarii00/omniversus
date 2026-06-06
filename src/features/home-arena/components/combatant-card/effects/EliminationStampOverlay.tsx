const ELIMINATION_STAMP_LABEL = "ELIMINATED";

export default function EliminationStampOverlay() {
  return (
    <>
      <span className="home-battle-elimination-shadow" aria-hidden="true" />
      <span className="home-battle-elimination-press" aria-hidden="true">
        <span>{ELIMINATION_STAMP_LABEL}</span>
      </span>
      <span className="home-battle-elimination-imprint" aria-hidden="true">
        <span>{ELIMINATION_STAMP_LABEL}</span>
      </span>
    </>
  );
}
