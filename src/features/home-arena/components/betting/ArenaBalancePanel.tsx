import Image from "next/image";

const CREDIT_MARK_ASSET = "/assets/home-arena/arena-credit.png";

type ArenaBalancePanelProps = {
  credits: number;
  isLocked?: boolean;
  onTopUpCredits: () => void;
  reputation: number;
  status?: string;
};

export default function ArenaBalancePanel({
  credits,
  isLocked = false,
  onTopUpCredits,
  reputation,
  status = "BETTING_READY",
}: ArenaBalancePanelProps) {
  return (
    <aside className="home-balance-terminal" aria-label="Arena balance">
      <div className="home-balance-terminal__titlebar">
        <span>WALLET.DAT</span>
        <span>LOCAL</span>
      </div>

      <div className="home-balance-terminal__screen">
        <div className="home-balance-terminal__credit-visual" aria-hidden="true">
          <Image
            alt=""
            className="home-balance-terminal__credit-image"
            height={512}
            priority={false}
            sizes="(max-width: 900px) 96px, 112px"
            src={CREDIT_MARK_ASSET}
            width={512}
          />
        </div>

        <div className="home-balance-terminal__row home-balance-terminal__row--credits">
          <span>
            <Image
              alt=""
              aria-hidden="true"
              className="home-balance-terminal__credit-glyph"
              height={24}
              src={CREDIT_MARK_ASSET}
              width={24}
            />
            CREDITS
          </span>
          <strong>{credits.toString().padStart(4, "0")}</strong>
        </div>
        <div className="home-balance-terminal__row">
          <span>REPUTATION</span>
          <strong>{reputation.toString().padStart(4, "0")}</strong>
        </div>
        <div className="home-balance-terminal__status">{status}</div>
        <div className="home-balance-terminal__actions">
          <button
            type="button"
            className="home-balance-terminal__topup"
            aria-label="Top up credits"
            disabled={isLocked}
            onClick={onTopUpCredits}
          >
            <span className="home-balance-terminal__topup-label">
              <Image
                alt=""
                aria-hidden="true"
                className="home-balance-terminal__topup-glyph"
                height={24}
                src={CREDIT_MARK_ASSET}
                width={24}
              />
              CREDIT_REFILL
            </span>
            <span aria-hidden="true">[+]</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
