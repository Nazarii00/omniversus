"use client";

import { useState, type CSSProperties, type MouseEvent } from "react";

import {
  displayTitle,
  formatSide,
  idList,
  marginStrength,
  percentText,
  valueText,
  type FindingRecord,
  type ReportArgumentChain,
  type ReportComparisonRow,
  type ReportFighter,
} from "../../model";
import { FactIssueButton } from "./FactIssueButton";
import { claimTargetId } from "./fullReportAnchors";
import { SectionHeading } from "./FullBattleReportSectionHeading";
import styles from "../../styles/FullBattleReportPage.module.css";

const CHAIN_ROLE_LABELS: Record<string, string> = {
  ANTI_ARGUMENT: "Counter-route",
  ABILITY_INTERACTION: "Ability interaction",
  DATA_QUALITY: "Data quality",
  RESISTANCE_CHECK: "Resistance check",
  STAT_ADVANTAGE: "Stat advantage",
  SUBJECTIVE_REASONING: "Subjective reasoning",
  WIN_CONDITION: "Win route",
};
const CLAIM_JUMP_HIGHLIGHT_ATTR = "data-jump-highlight";
const CLAIM_JUMP_HIGHLIGHT_MS = 3200;

let claimJumpHighlightTimeoutId: number | null = null;

function highlightClaimTarget(target: HTMLElement) {
  document
    .querySelectorAll<HTMLElement>(`[${CLAIM_JUMP_HIGHLIGHT_ATTR}="true"]`)
    .forEach((highlightedTarget) => {
      highlightedTarget.removeAttribute(CLAIM_JUMP_HIGHLIGHT_ATTR);
    });

  target.setAttribute(CLAIM_JUMP_HIGHLIGHT_ATTR, "true");

  if (claimJumpHighlightTimeoutId !== null) {
    window.clearTimeout(claimJumpHighlightTimeoutId);
  }

  claimJumpHighlightTimeoutId = window.setTimeout(() => {
    target.removeAttribute(CLAIM_JUMP_HIGHLIGHT_ATTR);
    claimJumpHighlightTimeoutId = null;
  }, CLAIM_JUMP_HIGHLIGHT_MS);
}

export function VerdictBrief({
  primaryReason,
  findings,
  loserBestArgument,
  whyNotOtherSide,
  flipCondition,
}: {
  primaryReason: string;
  findings: FindingRecord[];
  loserBestArgument: string | undefined;
  whyNotOtherSide: string | undefined;
  flipCondition: string | undefined;
}) {
  return (
    <section className={styles.verdictBrief} id="verdict">
      <SectionHeading eyebrow="02" title="Verdict Reason" large />
      <div className={styles.verdictIntroGrid}>
        <div className={styles.conclusionSheet}>
          <div className={styles.determinationBlock}>
            <span>Primary reason</span>
            <p>{primaryReason}</p>
          </div>
          <div className={styles.factorStrip}>
            {findings.map((finding, index) => (
              <article
                key={`${finding.title}-${index}`}
                data-tone={finding.tone}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{finding.title}</b>
                  <p>{finding.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.routeGrid}>
            <BriefRoute title="Rejected Route" text={loserBestArgument} />
            <BriefRoute title="Failure Cause" text={whyNotOtherSide} />
            <BriefRoute
              title="Only Reversal Vector"
              text={flipCondition}
              warning
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ArgumentTimeline({
  chains,
  decisiveChain,
  fighters,
  reportId,
  reportTitle,
}: {
  chains: ReportArgumentChain[];
  decisiveChain: ReportArgumentChain | null;
  fighters: ReportFighter[];
  reportId: string;
  reportTitle: string;
}) {
  const orderedChains = decisiveChain
    ? [
        decisiveChain,
        ...chains.filter((chain) => chain.id !== decisiveChain.id),
      ]
    : chains;

  return (
    <section className={styles.argumentSection} id="chain">
      <SectionHeading
        eyebrow="03"
        title="Reasoning Chain"
        signal={`${orderedChains.length} chain${orderedChains.length === 1 ? "" : "s"}`}
      />
      <ol className={styles.decisionChain}>
        {orderedChains.map((chain, index) => (
          <ChainEvent
            key={chain.id}
            chain={chain}
            index={index}
            fighters={fighters}
            reportId={reportId}
            reportTitle={reportTitle}
          />
        ))}
      </ol>
    </section>
  );
}

export function VerdictStack({
  confidence,
  dataConfidence,
  robustnessConfidence,
  givenDataConfidence,
  confidenceExplanation,
  warnings,
  fighters,
  comparison,
}: {
  confidence: number;
  dataConfidence: number;
  robustnessConfidence: number;
  givenDataConfidence: number | undefined;
  confidenceExplanation: string | undefined;
  warnings: string[];
  fighters: ReportFighter[];
  comparison: ReportComparisonRow[];
}) {
  return (
    <aside className={styles.verdictStack} id="confidence">
      <SectionHeading
        eyebrow="04"
        title="Confidence and Comparison"
        signal="stability checks"
      />
      <ConfidencePanel
        confidence={confidence}
        dataConfidence={dataConfidence}
        robustnessConfidence={robustnessConfidence}
        givenDataConfidence={givenDataConfidence}
        explanation={confidenceExplanation}
        warnings={warnings}
      />
      <ComparisonPulse comparison={comparison} fighters={fighters} />
    </aside>
  );
}

function BriefRoute({
  title,
  text,
  warning = false,
}: {
  title: string;
  text: string | undefined;
  warning?: boolean;
}) {
  return (
    <article className={styles.briefRoute} data-warning={warning}>
      <span>{title}</span>
      <p>{valueText(text)}</p>
    </article>
  );
}

function ChainEvent({
  chain,
  index,
  fighters,
  reportId,
  reportTitle,
}: {
  chain: ReportArgumentChain;
  index: number;
  fighters: ReportFighter[];
  reportId: string;
  reportTitle: string;
}) {
  const chainNumber = String(index + 1).padStart(2, "0");

  return (
    <li className={styles.chainEvent} data-contested={chain.contested}>
      <div className={styles.chainIndex}>{chainNumber}</div>
      <article className={styles.chainCard}>
        <header className={styles.chainCardHeader}>
          <ChainMeta label="Argument" value={`Chain ${chainNumber}`} />
          <ChainMeta label="Role" value={displayChainRole(chain.chain_type)} />
          <ChainMeta
            label="Argues for"
            value={formatSide(chain.side, fighters)}
          />
          <ChainMeta label="Confidence" value={percentText(chain.confidence)} />
        </header>
        <h3>{displayTitle(chain.title)}</h3>
        <p>{chain.conclusion}</p>
        <div className={styles.premiseStack}>
          {(chain.premises ?? []).slice(0, 3).map((premise, premiseIndex) => (
            <PremiseRecord
              key={premise.id ?? premiseIndex}
              chain={chain}
              claimId={premise.claim_id}
              fighters={fighters}
              premiseIndex={premiseIndex}
              reportId={reportId}
              reportTitle={reportTitle}
              role={premise.role ?? "PREMISE"}
              text={premise.text}
            />
          ))}
        </div>
        {chain.inference || chain.inference_rule ? (
          <div className={styles.inferenceRecord}>
            <span>INFERENCE</span>
            <p>{valueText(chain.inference ?? chain.inference_rule)}</p>
          </div>
        ) : null}
        <footer>
          {chain.contested ? <em>CONTESTED</em> : null}
          <span>CLAIMS: {idList(chain.linked_claim_ids)}</span>
          <span>BREAKS IF: {valueText(chain.breaks_if)}</span>
        </footer>
      </article>
    </li>
  );
}

function ChainMeta({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <b>{value}</b>
    </span>
  );
}

function displayChainRole(chainType: string | undefined) {
  return chainType
    ? (CHAIN_ROLE_LABELS[chainType] ?? displayTitle(chainType))
    : "Argument";
}

function PremiseRecord({
  chain,
  claimId,
  fighters,
  premiseIndex,
  reportId,
  reportTitle,
  role,
  text,
}: {
  chain: ReportArgumentChain;
  claimId: string | undefined;
  fighters: ReportFighter[];
  premiseIndex: number;
  reportId: string;
  reportTitle: string;
  role: string;
  text: string;
}) {
  const [appealId, setAppealId] = useState<string | null>(null);
  const targetId = claimId && claimId !== "N_A" ? claimTargetId(claimId) : null;
  const appealSubject = appealSubjectForSide(chain.side, fighters, reportTitle);
  const premiseId = `${chain.id}_premise_${premiseIndex + 1}`;
  const handleJumpToClaim = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.history.replaceState(null, "", `#${targetId}`);
    highlightClaimTarget(target);
  };
  const content = (
    <>
      {role}: {text}
    </>
  );

  return (
    <div className={styles.premiseRecord} data-fact-issue={Boolean(appealId)}>
      {targetId ? (
        <a
          className={styles.premiseText}
          href={`#${targetId}`}
          onClick={handleJumpToClaim}
          title="Jump to evidence claim"
        >
          {content}
        </a>
      ) : (
        <span className={styles.premiseText}>{content}</span>
      )}
      <FactIssueButton
        active={Boolean(appealId)}
        onSubmitted={setAppealId}
        target={{
          reportId,
          reportTitle,
          targetType: "premise",
          targetId: premiseId,
          targetText: text,
          subjectName: appealSubject.name,
          subjectVersion: appealSubject.version,
          side: chain.side,
          category: role,
          claimId,
          chainId: chain.id,
          sourceRef: claimId ? `Linked claim ${claimId}` : undefined,
          confidence: chain.confidence,
        }}
      />
    </div>
  );
}

function appealSubjectForSide(
  side: string | undefined,
  fighters: ReportFighter[],
  reportTitle: string,
) {
  if (side === "A" || side === "B") {
    const fighter = fighters.find((item) => item.side === side);

    if (fighter) {
      return {
        name: fighter.name,
        version: fighter.version,
      };
    }
  }

  if (side === "BOTH") {
    return {
      name: fighters.map((fighter) => fighter.name).join(" vs ") || reportTitle,
      version: undefined,
    };
  }

  return {
    name: reportTitle,
    version: undefined,
  };
}

function ConfidencePanel({
  confidence,
  dataConfidence,
  robustnessConfidence,
  givenDataConfidence,
  explanation,
  warnings,
}: {
  confidence: number;
  dataConfidence: number;
  robustnessConfidence: number;
  givenDataConfidence: number | undefined;
  explanation: string | undefined;
  warnings: string[];
}) {
  return (
    <section className={styles.confidencePanel}>
      <span>Confidence</span>
      <strong>{confidence}%</strong>
      <Meter label="data" value={dataConfidence} />
      <Meter label="robust" value={robustnessConfidence} />
      <Meter label="given data" value={givenDataConfidence ?? 0} />
      <p>{valueText(explanation)}</p>
      {warnings.length ? (
        <div className={styles.warningRack}>
          {warnings.slice(0, 4).map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={styles.meter}>
      <span>{label}</span>
      <i style={{ "--meter-value": `${clampedValue}%` } as CSSProperties} />
      <b>{clampedValue}%</b>
    </div>
  );
}

function comparisonPowerSplit(
  row: ReportComparisonRow,
  fighters: ReportFighter[],
) {
  const normalizedMargin = row.margin?.toUpperCase() ?? "";
  const isEven =
    !row.winner ||
    row.winner === "TIE" ||
    row.winner === "SYSTEM" ||
    row.winner === "BOTH" ||
    row.winner === "DRAW" ||
    row.winner === "INCONCLUSIVE" ||
    normalizedMargin.includes("TIE") ||
    normalizedMargin.includes("NONE") ||
    normalizedMargin.includes("EVEN");

  if (isEven) {
    return {
      aShare: 50,
      bShare: 50,
      aLabel: formatSide("A", fighters),
      bLabel: formatSide("B", fighters),
    };
  }

  const advantagedShare = Math.min(
    88,
    Math.max(52, 50 + Math.round(marginStrength(row.margin) * 0.38)),
  );
  const trailingShare = 100 - advantagedShare;

  return {
    aShare: row.winner === "A" ? advantagedShare : trailingShare,
    bShare: row.winner === "B" ? advantagedShare : trailingShare,
    aLabel: formatSide("A", fighters),
    bLabel: formatSide("B", fighters),
  };
}

function ComparisonPulse({
  comparison,
  fighters,
}: {
  comparison: ReportComparisonRow[];
  fighters: ReportFighter[];
}) {
  return (
    <section className={styles.comparisonRegister}>
      <span>Category Advantages</span>
      <div>
        {comparison.slice(0, 5).map((row) => {
          const split = comparisonPowerSplit(row, fighters);
          const splitLabel = `${split.aLabel}: ${split.aShare}% / ${split.bLabel}: ${split.bShare}%`;

          return (
            <article key={row.category} data-contested={row.contested}>
              <header>
                <b>{row.category}</b>
                <em title={splitLabel}>
                  <span data-side="A">
                    {split.aLabel}: {split.aShare}%
                  </span>
                  <span data-side="B">
                    {split.bLabel}: {split.bShare}%
                  </span>
                </em>
              </header>
              <div
                className={styles.comparisonSplitBar}
                role="img"
                aria-label={splitLabel}
                style={
                  {
                    "--a-share": `${split.aShare}%`,
                    "--b-share": `${split.bShare}%`,
                  } as CSSProperties
                }
              >
                <span data-side="A" aria-hidden="true" />
                <span data-side="B" aria-hidden="true" />
              </div>
              <p>
                {row.margin ?? "EVEN"} / {row.reason}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
