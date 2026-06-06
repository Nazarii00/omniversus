import type { CSSProperties } from "react";

import {
  buildRadarMetrics,
  terminalLabel,
  type ReportRadarMetric,
  type ReportViewModel,
} from "../../model";

type ReportSignalDeckProps = {
  view: ReportViewModel;
  style: CSSProperties;
};

export default function ReportSignalDeck({
  view,
  style,
}: ReportSignalDeckProps) {
  const fighterA = view.fighters.find((fighter) => fighter.side === "A");
  const fighterB = view.fighters.find((fighter) => fighter.side === "B");
  const radarMetrics = buildRadarMetrics(view);

  return (
    <div
      className="home-battle-result-panel__section home-report-signal-deck"
      style={style}
    >
      <div className="home-report-panel-heading">
        <span>&gt; STAT_GRID</span>
        <span>SPIDER_TRACE</span>
      </div>

      <div className="home-report-signal-radar" aria-label="Stat grid diagrams">
        <div className="home-report-radar__split">
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
      </div>
    </div>
  );
}

type RadarMetrics = ReportRadarMetric[];

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
    <div className="home-report-radar__card">
      <span className="home-report-radar__side">{label}</span>
      <RadarPlot metrics={metrics} side={side} />
    </div>
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
  const sideClass = side === "A" ? "alpha" : "omega";

  return (
    <svg
      className="home-report-radar__plot"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-label={`${side} public stat radar`}
    >
      {[0.38, 0.68, 1].map((scale) => (
        <polygon
          key={scale}
          className="home-report-radar__ring"
          points={radarRing(metrics.length, scale)}
        />
      ))}
      {metrics.map((metric, index) => {
        const edge = radarCoordinate(index, metrics.length);

        return (
          <line
            key={metric.key}
            className="home-report-radar__axis"
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={edge.x}
            y2={edge.y}
          />
        );
      })}
      <polygon
        className={`home-report-radar__area home-report-radar__area--${sideClass}`}
        points={points}
      />
      <polyline
        className={`home-report-radar__line home-report-radar__line--${sideClass}`}
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
            className="home-report-radar__label"
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

const RADAR_CENTER = 50;
const RADAR_RADIUS = 32;
const RADAR_LABEL_RADIUS = 43;

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
