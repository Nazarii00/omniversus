"use client";

import type { CSSProperties } from "react";
import { BattleFeedbackValue } from "@/generated/prisma/enums";
import { useBattleFeedback } from "../../hooks/useBattleFeedback";
import type { BattleFeedbackStats } from "../../actions/battleFeedbackActions";
import styles from "../../styles/VerdictFeedback.module.css";

// ---------------------------------------------------------------------------
// Quality Badge
// ---------------------------------------------------------------------------

type QualityBand = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "UNRELIABLE";

const QUALITY_BAND_LABELS: Record<QualityBand, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  UNRELIABLE: "Unreliable",
};

const QUALITY_BAND_TONES: Record<QualityBand, string> = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
  UNRELIABLE: "unreliable",
};

export function QualityBadge({
  score,
  band,
}: {
  score: number | null | undefined;
  band: string | null | undefined;
}) {
  if (score == null) return null;

  const resolvedBand = (band?.toUpperCase() ??
    resolveBandFromScore(score)) as QualityBand;
  const displayLabel = QUALITY_BAND_LABELS[resolvedBand] ?? resolvedBand;
  const tone = QUALITY_BAND_TONES[resolvedBand] ?? "fair";

  return (
    <span
      className={styles.qualityBadge}
      data-quality-tone={tone}
      title={`Battle quality: ${score}/100 — ${displayLabel}`}
    >
      <span className={styles.qualityScore}>{score}</span>
      <span className={styles.qualityLabel}>{displayLabel}</span>
    </span>
  );
}

function resolveBandFromScore(score: number): string {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "POOR";
  return "UNRELIABLE";
}

// ---------------------------------------------------------------------------
// Verdict Feedback
// ---------------------------------------------------------------------------

type VerdictFeedbackProps = {
  battleRunId: string;
  variant?: "arena" | "full";
};

export function VerdictFeedback({
  battleRunId,
  variant = "full",
}: VerdictFeedbackProps) {
  const { value, stats, isSubmitting, error, submit } =
    useBattleFeedback(battleRunId);

  const isArena = variant === "arena";

  return (
    <section
      className={`${styles.feedbackPanel} ${isArena ? styles.arena : styles.full}`}
    >
      {isArena ? (
        <span className={styles.arenaTitle}>VERDICT ACCURATE?</span>
      ) : (
        <>
          <h4 className={styles.feedbackTitle}>Was this verdict accurate?</h4>
          <p className={styles.feedbackPrompt}>
            Your feedback helps improve the Omniversus AI. Select your judgment
            below.
          </p>
        </>
      )}

      <div className={styles.feedbackActions}>
        <FeedbackButton
          value={BattleFeedbackValue.AGREE}
          label="Agree"
          icon={isArena ? "👍" : "✓"}
          showLabel={!isArena}
          selectedValue={value}
          disabled={isSubmitting}
          onClick={() => submit(BattleFeedbackValue.AGREE)}
        />
        <FeedbackButton
          value={BattleFeedbackValue.DISAGREE}
          label="Disagree"
          icon={isArena ? "👎" : "✗"}
          showLabel={!isArena}
          selectedValue={value}
          disabled={isSubmitting}
          onClick={() => submit(BattleFeedbackValue.DISAGREE)}
        />
        <FeedbackButton
          value={BattleFeedbackValue.UNCERTAIN}
          label="Uncertain"
          icon={isArena ? "😕" : "?"}
          showLabel={!isArena}
          selectedValue={value}
          disabled={isSubmitting}
          onClick={() => submit(BattleFeedbackValue.UNCERTAIN)}
        />
      </div>

      {isSubmitting && (
        <span className={styles.submittingHint}>Submitting…</span>
      )}

      {error && (
        <span className={styles.feedbackError} role="alert">
          {error}
        </span>
      )}

      {stats && stats.total > 0 && <FeedbackStatsBar stats={stats} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feedback Button
// ---------------------------------------------------------------------------

function FeedbackButton({
  value,
  label,
  icon,
  showLabel = true,
  selectedValue,
  disabled,
  onClick,
}: {
  value: BattleFeedbackValue;
  label: string;
  icon: string;
  showLabel?: boolean;
  selectedValue: BattleFeedbackValue | null;
  disabled: boolean;
  onClick: () => void;
}) {
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      className={styles.feedbackButton}
      data-selected={isSelected}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${label} — ${isSelected ? "your current vote" : "click to vote"}`}
    >
      <span className={styles.feedbackIcon} aria-hidden="true">
        {icon}
      </span>
      {showLabel && <span className={styles.feedbackLabel}>{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function FeedbackStatsBar({ stats }: { stats: BattleFeedbackStats }) {
  return (
    <div
      className={styles.statsBar}
      role="status"
      aria-label="Feedback summary"
    >
      <span className={styles.statsTotal}>
        {stats.total} vote{stats.total !== 1 ? "s" : ""}
      </span>
      <div className={styles.statsSegments}>
        {stats.agree > 0 && (
          <SegmentBar
            value={stats.agreePercent}
            label="Agree"
            count={stats.agree}
            tone="agree"
          />
        )}
        {stats.disagree > 0 && (
          <SegmentBar
            value={stats.disagreePercent}
            label="Disagree"
            count={stats.disagree}
            tone="disagree"
          />
        )}
        {stats.uncertain > 0 && (
          <SegmentBar
            value={stats.uncertainPercent}
            label="Uncertain"
            count={stats.uncertain}
            tone="uncertain"
          />
        )}
      </div>
    </div>
  );
}

function SegmentBar({
  value,
  label,
  count,
  tone,
}: {
  value: number;
  label: string;
  count: number;
  tone: "agree" | "disagree" | "uncertain";
}) {
  return (
    <div
      className={styles.segment}
      data-tone={tone}
      style={{ "--segment-value": `${value}%` } as CSSProperties}
      title={`${label}: ${count} vote${count !== 1 ? "s" : ""} (${value}%)`}
    >
      <span className={styles.segmentFill} />
      <span className={styles.segmentLabel}>
        {label} {value}%
      </span>
    </div>
  );
}
