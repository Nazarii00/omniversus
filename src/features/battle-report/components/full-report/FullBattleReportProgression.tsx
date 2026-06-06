"use client";

import type { CSSProperties } from "react";

import {
  buildRadarMetrics,
  displayTitle,
  formatSide,
  idList,
  terminalLabel,
  valueText,
  type ReportFighter,
  type ReportRadarMetric,
  type ReportTimelineStep,
  type ReportViewModel,
} from "../../model";
import { SectionHeading } from "./FullBattleReportSectionHeading";
import styles from "../../styles/FullBattleReportProgression.module.css";

type BattleProgressionProps = {
  view: ReportViewModel;
};

type RadarMetrics = ReportRadarMetric[];

const RADAR_CENTER = 50;
const RADAR_RADIUS = 31;
const RADAR_LABEL_RADIUS = 43;

export function BattleProgression({ view }: BattleProgressionProps) {
  const radarMetrics = buildRadarMetrics(view);
  const fighterA = view.fighters.find((fighter) => fighter.side === "A");
  const fighterB = view.fighters.find((fighter) => fighter.side === "B");

  return (
    <section className={styles.progressionSection} id="progression">
      <SectionHeading
        eyebrow="06"
        title="Battle Progression"
        signal={`${view.steps.length} states + stat diagrams`}
      />
      <div className={styles.progressionGrid}>
        <div
          className={styles.progressionTimeline}
          aria-label="Battle event timeline"
        >
          {view.steps.map((step, index) => (
            <ProgressionStep
              key={step.id}
              step={step}
              index={index}
              fighters={view.fighters}
            />
          ))}
        </div>

        <aside
          className={styles.progressionDiagrams}
          aria-label="Battle stat diagrams"
        >
          <div className={styles.progressionDiagramHeader}>
            <span>Stat Diagrams</span>
            <b>Full report calibration</b>
          </div>
          <div className={styles.progressionRadarGrid}>
            <RadarCard
              label={`A_STAT: ${terminalLabel(fighterA?.name ?? "Alpha")}`}
              metrics={radarMetrics}
              side="A"
            />
            <RadarCard
              label={`B_STAT: ${terminalLabel(fighterB?.name ?? "Omega")}`}
              metrics={radarMetrics}
              side="B"
            />
          </div>
          <div className={styles.progressionLegend}>
            {radarMetrics.map((metric) => (
              <span key={metric.key}>
                <b>{metric.label}</b>
                {metric.aScore}/{metric.bScore}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProgressionStep({
  step,
  index,
  fighters,
}: {
  step: ReportTimelineStep;
  index: number;
  fighters: ReportFighter[];
}) {
  return (
    <article className={styles.progressionStep} data-contested={step.contested}>
      <header className={styles.progressionStepHeader}>
        <span>{battleStateLabel(index)}</span>
        <b>{step.contested ? "Review vector" : "Filed state"}</b>
      </header>
      <h3>{displayTitle(step.title)}</h3>
      <p className={styles.progressionLog}>{step.log}</p>
      <div className={styles.progressionReason}>
        <span>Why</span>
        <p>{valueText(step.why)}</p>
      </div>
      <div className={styles.progressionMeters}>
        <ProgressionMeter
          side="A"
          label={formatSide("A", fighters)}
          value={step.aHp}
        />
        <ProgressionMeter
          side="B"
          label={formatSide("B", fighters)}
          value={step.bHp}
        />
      </div>
      <footer className={styles.progressionStepFooter}>
        <span>Claims: {idList(step.claimIds)}</span>
        <span>Chains: {idList(step.chainIds)}</span>
      </footer>
    </article>
  );
}

function ProgressionMeter({
  side,
  label,
  value,
}: {
  side: "A" | "B";
  label: string;
  value: number | null;
}) {
  const clampedValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : 0;

  return (
    <div className={styles.progressionMeter} data-side={side}>
      <span>{label}</span>
      <i
        aria-label={`${label} state ${clampedValue}%`}
        style={{ "--progression-meter": `${clampedValue}%` } as CSSProperties}
      />
      <b>{value === null ? "N/A" : `${clampedValue}%`}</b>
    </div>
  );
}

function RadarCard({
  label,
  metrics,
  side,
}: {
  label: string;
  metrics: RadarMetrics;
  side: "A" | "B";
}) {
  return (
    <article className={styles.progressionRadarCard} data-side={side}>
      <span>{label}</span>
      <RadarPlot metrics={metrics} side={side} />
    </article>
  );
}

function RadarPlot({
  metrics,
  side,
}: {
  metrics: RadarMetrics;
  side: "A" | "B";
}) {
  const points = radarPolygon(metrics, side);

  return (
    <svg
      className={styles.progressionRadarPlot}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-label={`${side} stat diagram`}
    >
      {[0.38, 0.68, 1].map((scale) => (
        <polygon
          key={scale}
          className={styles.progressionRadarRing}
          points={radarRing(metrics.length, scale)}
        />
      ))}
      {metrics.map((metric, index) => {
        const edge = radarCoordinate(index, metrics.length);

        return (
          <line
            key={metric.key}
            className={styles.progressionRadarAxis}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={edge.x}
            y2={edge.y}
          />
        );
      })}
      <polygon
        className={`${styles.progressionRadarArea} ${
          side === "A"
            ? styles.progressionRadarAreaAlpha
            : styles.progressionRadarAreaOmega
        }`}
        points={points}
      />
      <polyline
        className={`${styles.progressionRadarLine} ${
          side === "A"
            ? styles.progressionRadarLineAlpha
            : styles.progressionRadarLineOmega
        }`}
        points={closeRadarPoints(points)}
      />
      {metrics.map((metric, index) => {
        const label = radarCoordinate(
          index,
          metrics.length,
          RADAR_LABEL_RADIUS,
        );

        return (
          <text
            key={metric.key}
            className={styles.progressionRadarLabel}
            x={label.x}
            y={label.y}
            dominantBaseline="middle"
            textAnchor={radarTextAnchor(label.x)}
          >
            {metric.label}
          </text>
        );
      })}
    </svg>
  );
}

function battleStateLabel(index: number) {
  return (
    ["Opening", "Pressure", "Pivot", "Breakpoint", "Finish"][index] ??
    `State ${String(index + 1).padStart(2, "0")}`
  );
}

function radarCoordinate(index: number, total: number, radius = RADAR_RADIUS) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;

  return {
    x: Number((RADAR_CENTER + Math.cos(angle) * radius).toFixed(2)),
    y: Number((RADAR_CENTER + Math.sin(angle) * radius).toFixed(2)),
  };
}

function radarRing(total: number, scale: number) {
  return Array.from({ length: total }, (_, index) => {
    const point = radarCoordinate(index, total, RADAR_RADIUS * scale);

    return `${point.x},${point.y}`;
  }).join(" ");
}

function radarPolygon(metrics: RadarMetrics, side: "A" | "B") {
  return metrics
    .map((metric, index) => {
      const score = side === "A" ? metric.aScore : metric.bScore;
      const point = radarCoordinate(
        index,
        metrics.length,
        (score / 100) * RADAR_RADIUS,
      );

      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function closeRadarPoints(points: string) {
  const [firstPoint] = points.split(" ");

  return firstPoint ? `${points} ${firstPoint}` : points;
}

function radarTextAnchor(x: number) {
  if (Math.abs(x - RADAR_CENTER) < 4) return "middle";

  return x < RADAR_CENTER ? "end" : "start";
}
