"use client";

import { useEffect, useRef, useState } from "react";

export type WalletWidgetProps = {
  cr: number;
  rp: number;
  username: string;
  rank: number;
  status: string;
  onOpenProfile: () => void;
  onTopUp?: () => void;
};

function useCountingValue(target: number, duration = 600) {
  const [displayed, setDisplayed] = useState(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    if (target === prevTargetRef.current) return;

    const from = prevTargetRef.current;
    const to = target;
    prevTargetRef.current = target;
    fromRef.current = from;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const startTime = performance.now();
    startRef.current = startTime;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);

      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(to);
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return displayed;
}

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

  const animatedCR = useCountingValue(cr);
  const animatedRP = useCountingValue(rp);

  const crDisplay = String(animatedCR).padStart(4, "0");
  const rpDisplay = String(animatedRP).padStart(8, "0");
  const isCountingCR = animatedCR !== cr;
  const isCountingRP = animatedRP !== rp;

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
