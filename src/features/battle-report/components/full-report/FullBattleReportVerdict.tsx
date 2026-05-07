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
import { SectionHeading } from "./FullBattleReportSectionHeading";
import styles from "./FullBattleReportPage.module.css";

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
}: {
  chains: ReportArgumentChain[];
  decisiveChain: ReportArgumentChain | null;
  fighters: ReportFighter[];
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
}: {
  chain: ReportArgumentChain;
  index: number;
  fighters: ReportFighter[];
}) {
  const chainNumber = String(index + 1).padStart(2, "0");

  return (
    <li className={styles.chainEvent} data-contested={chain.contested}>
      <div className={styles.chainIndex}>{chainNumber}</div>
      <article className={styles.chainCard}>
        <header className={styles.chainCardHeader}>
          <ChainMeta label="Argument" value={`Chain ${chainNumber}`} />
          <ChainMeta label="Role" value={displayChainRole(chain.chain_type)} />
          <ChainMeta label="Argues for" value={formatSide(chain.side, fighters)} />
          <ChainMeta label="Confidence" value={percentText(chain.confidence)} />
        </header>
        <h3>{displayTitle(chain.title)}</h3>
        <p>{chain.conclusion}</p>
        <div className={styles.premiseStack}>
          {(chain.premises ?? []).slice(0, 3).map((premise, premiseIndex) => (
            <PremiseRecord
              key={premise.id ?? premiseIndex}
              claimId={premise.claim_id}
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
  switch (chainType) {
    case "STAT_ADVANTAGE":
      return "Stat advantage";
    case "ABILITY_INTERACTION":
      return "Ability interaction";
    case "RESISTANCE_CHECK":
      return "Resistance check";
    case "WIN_CONDITION":
      return "Win route";
    case "ANTI_ARGUMENT":
      return "Counter-route";
    case "DATA_QUALITY":
      return "Data quality";
    case "SUBJECTIVE_REASONING":
      return "Subjective reasoning";
    default:
      return displayTitle(chainType ?? "Argument");
  }
}

function PremiseRecord({
  claimId,
  role,
  text,
}: {
  claimId: string | undefined;
  role: string;
  text: string;
}) {
  const [hasFactIssue, setHasFactIssue] = useState(false);
  const targetId = claimId && claimId !== "N_A" ? claimTargetId(claimId) : null;
  const handleJumpToClaim = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.history.replaceState(null, "", `#${targetId}`);
  };
  const content = (
    <>
      {role}: {text}
    </>
  );

  return (
    <div className={styles.premiseRecord} data-fact-issue={hasFactIssue}>
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
        active={hasFactIssue}
        onToggle={() => setHasFactIssue((current) => !current)}
      />
    </div>
  );
}

function claimTargetId(claimId: string) {
  return `claim-${claimId.replace(/[^\w-]/g, "_")}`;
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
        {comparison.slice(0, 5).map((row) => (
          <article key={row.category} data-contested={row.contested}>
            <header>
              <b>{row.category}</b>
              <em>{formatSide(row.winner, fighters)}</em>
            </header>
            <i
              data-winner={row.winner ?? "SYSTEM"}
              style={
                {
                  "--row-strength": `${marginStrength(row.margin)}%`,
                } as CSSProperties
              }
            />
            <p>
              {row.margin ?? "EVEN"} / {row.reason}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
