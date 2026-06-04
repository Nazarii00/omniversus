"use client";

import { useState } from "react";

export type WalletWidgetProps = {
  cr: number;
  rp: number;
  username: string;
  rank: number;
  status: string;
  onOpenProfile: () => void;
  onTopUp?: () => void;
};

export default function ArenaBalancePanel({
  cr,
  rp,
  username,
  rank,
  status,
  onOpenProfile,
  onTopUp,
}: WalletWidgetProps) {
  const [isMax, setIsMax] = useState(false);

  const crDisplay = String(cr).padStart(4, "0");
  const rpDisplay = String(rp).padStart(8, "0");

  return (
    <aside
      className="wallet-widget"
      aria-label="Wallet display"
      data-state={isMax ? "max" : "min"}
    >
      {!isMax ? (
        <button
          type="button"
          className="wallet-widget__min"
          onClick={() => setIsMax(true)}
          aria-label="Expand wallet"
          aria-expanded="false"
        >
          <div className="wallet-widget__row">
            <span>CR</span>
            <span className="wallet-widget__value">{crDisplay}</span>
          </div>
          <div className="wallet-widget__row">
            <span>RP</span>
            <span className="wallet-widget__value">{rpDisplay}</span>
          </div>
        </button>
      ) : (
        <div className="wallet-widget__max">
          <div className="wallet-widget__header">
            <span className="wallet-widget__username">{username}</span>
            <span className="wallet-widget__rank">
              RANK #{String(rank).padStart(4, "0")}
            </span>
            <button
              type="button"
              className="wallet-widget__close-header"
              onClick={() => setIsMax(false)}
              aria-label="Collapse wallet"
              title="Close (MIN)"
            >
              [x]
            </button>
          </div>

          <div className="wallet-widget__divider" />

          <div className="wallet-widget__section">
            <div className="wallet-widget__asset">
              <div className="wallet-widget__asset-main">
                <span className="wallet-widget__label">CR</span>
                <span className="wallet-widget__dots">
                  .......................
                </span>
                <span className="wallet-widget__value">{crDisplay}</span>
              </div>
              <div className="wallet-widget__asset-info">
                <span className="wallet-widget__sublabel">
                  ARCADE / VOLATILE
                </span>
                <span className="wallet-widget__info-dots">...........</span>
                <span className="wallet-widget__meta">REFILLABLE_BP</span>
              </div>
              {onTopUp && (
                <button
                  type="button"
                  onClick={onTopUp}
                  className="mt-2 w-full border border-[var(--bet-accent)] bg-black px-2 py-1 text-center text-[0.6rem] font-bold tracking-widest text-[var(--bet-accent)] transition-colors hover:bg-[var(--bet-accent)] hover:text-black"
                >
                  [+] REFILL CREDITS
                </button>
              )}
            </div>

            <div className="wallet-widget__asset">
              <div className="wallet-widget__asset-main">
                <span className="wallet-widget__label">RP</span>
                <span className="wallet-widget__dots">
                  .......................
                </span>
                <span className="wallet-widget__value">{rpDisplay}</span>
              </div>
              <div className="wallet-widget__asset-info">
                <span className="wallet-widget__sublabel">RANKED / LOCK</span>
                <span className="wallet-widget__info-dots">...........</span>
                <span className="wallet-widget__meta">EARNED_ONLY</span>
              </div>
            </div>
          </div>

          <div className="wallet-widget__status">
            <span className="wallet-widget__status-label">STATUS</span>
            <span className="wallet-widget__status-value">{status}</span>
          </div>

          <div className="wallet-widget__divider" />

          <button
            type="button"
            className="wallet-widget__profile-button"
            onClick={onOpenProfile}
            aria-label="Open profile"
          >
            <span className="wallet-widget__profile-label">
              &gt; OPEN_PROFILE
            </span>
            <span className="wallet-widget__profile-action">[→]</span>
          </button>
        </div>
      )}
    </aside>
  );
}
