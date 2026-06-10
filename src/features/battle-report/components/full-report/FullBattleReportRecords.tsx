"use client";

import Link from "next/link";
import { useState } from "react";

import {
  displayTitle,
  displayVerdict,
  formatSide,
  groupClaims,
  hasSourceRisk,
  percentText,
  sourceSummary,
  valueText,
  type ReportArgumentChain,
  type ReportClaim,
  type ReportComparisonRow,
  type ReportFighter,
  type ReportVerdict,
} from "../../model";
import { FactIssueButton } from "./FactIssueButton";
import { claimTargetId } from "./fullReportAnchors";
import { SectionHeading } from "./FullBattleReportSectionHeading";
import styles from "../../styles/FullBattleReportPage.module.css";

type ClaimReviewState = "danger" | "caution" | "stable";

const CLAIM_REVIEW_STATUS: Record<
  ClaimReviewState,
  { label: string; title: string }
> = {
  caution: {
    label: "Source check",
    title: "Source or outlier risk; review before trusting it.",
  },
  danger: {
    label: "Contested claim",
    title: "This claim is contested and needs verification.",
  },
  stable: {
    label: "No review flag",
    title: "No special review flag on this claim.",
  },
};

export function SubjectFaceoff({
  fighterA,
  fighterB,
  chains,
  comparison,
  verdict,
}: {
  fighterA: ReportFighter | undefined;
  fighterB: ReportFighter | undefined;
  chains: ReportArgumentChain[];
  comparison: ReportComparisonRow[];
  verdict: ReportVerdict;
}) {
  return (
    <section className={styles.subjectSection} id="subjects">
      <SectionHeading
        eyebrow="01"
        title="Subjects"
        signal="related protocols"
      />
      <div className={styles.subjectOverviewGrid}>
        <div className={styles.subjectGrid}>
          <SubjectDossier
            fighter={fighterA}
            side="A"
            chains={chains}
            comparison={comparison}
            verdict={verdict}
          />
          <div className={styles.comparisonSeal}>
            <span>VS</span>
            <b>COMPARISON FILE</b>
          </div>
          <SubjectDossier
            fighter={fighterB}
            side="B"
            chains={chains}
            comparison={comparison}
            verdict={verdict}
          />
        </div>
        <RelatedDocumentPanel />
      </div>
      <div className={styles.subjectFindings}>
        {comparison.slice(0, 4).map((row, i) => (
          <article key={`${row.category}-${i}`} data-contested={row.contested}>
            <span>{row.category}</span>
            <b>{displayVerdict(row.winner ?? "SYSTEM")}</b>
            <p>{row.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedDocumentPanel() {
  const relatedDocuments = [
    {
      href: "/battle-report/subject-comparison",
      label: "Subject comparison index",
      code: "01",
    },
    {
      href: "/battle-report/reasoning-chain",
      label: "Reasoning chain record",
      code: "03",
    },
    {
      href: "/battle-report/evidence-annex",
      label: "Evidence annex",
      code: "05",
    },
  ];

  return (
    <aside className={styles.relatedDocumentPanel}>
      <nav className={styles.relatedDocuments} aria-label="Related documents">
        {relatedDocuments.map((document) => (
          <Link key={document.href} href={document.href}>
            <span>{document.label}</span>
            <b>{document.code}</b>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function ClaimsDeck({
  claims,
  fighters,
  reportId,
  reportTitle,
}: {
  claims: ReportClaim[];
  fighters: ReportFighter[];
  reportId: string;
  reportTitle: string;
}) {
  const groups = groupClaims(claims);

  return (
    <section className={styles.claimsSection} id="claims">
      <SectionHeading
        eyebrow="05"
        title="Evidence"
        signal={`${claims.length} claim packets`}
      />
      <div className={styles.claimFilterBar} aria-label="Claim groups">
        <span data-active="true">ALL</span>
        {groups.map(([category, categoryClaims]) => (
          <span key={category}>
            {category} / {categoryClaims.length}
          </span>
        ))}
      </div>
      <div className={styles.claimGroups}>
        {groups.map(([category, categoryClaims]) => (
          <article className={styles.claimGroup} key={category}>
            <header>
              <b>{category}</b>
              <span>{categoryClaims.length} records</span>
            </header>
            <div>
              {categoryClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  fighters={fighters}
                  reportId={reportId}
                  reportTitle={reportTitle}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SubjectDossier({
  fighter,
  side,
  chains,
  comparison,
  verdict,
}: {
  fighter: ReportFighter | undefined;
  side: "A" | "B";
  chains: ReportArgumentChain[];
  comparison: ReportComparisonRow[];
  verdict: ReportVerdict;
}) {
  const sideChain = chains.find((chain) => chain.side === side);
  const sideWins = verdict.winner_side === side;
  const route =
    sideChain?.conclusion ??
    (sideWins ? verdict.primary_reason : verdict.loser_best_argument);
  const weakness = sideWins
    ? verdict.flip_condition
    : verdict.why_not_other_side;
  const relevantRows = comparison.filter(
    (row) => row.winner === side || row.winner === "TIE",
  );
  const subjectFlags = comparison
    .filter(
      (row) =>
        row.contested ||
        (row.winner && row.winner !== side && row.winner !== "TIE"),
    )
    .slice(0, 3);

  return (
    <article
      className={styles.subjectDossier}
      data-side={side}
      data-winner={sideWins ? "true" : undefined}
    >
      <div className={styles.subjectIdentity}>
        <div className={styles.subjectPortrait} aria-hidden="true">
          {fighter?.portrait?.data_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Curated admin portrait data URLs are already approved assets.
            <img alt="" src={fighter.portrait.data_url} />
          ) : (
            <span>{portraitInitials(fighter?.name ?? side)}</span>
          )}
        </div>
        <div>
          <span>Subject {side}</span>
          <h3>{displayTitle(fighter?.name ?? `Subject ${side}`)}</h3>
          <dl>
            <div>
              <dt>version</dt>
              <dd>{valueText(fighter?.version)}</dd>
            </div>
            <div>
              <dt>verse</dt>
              <dd>{valueText(fighter?.verse)}</dd>
            </div>
            <div>
              <dt>tier</dt>
              <dd>{valueText(fighter?.tier?.rating)}</dd>
            </div>
            <div>
              <dt>basis</dt>
              <dd>{valueText(fighter?.tier?.basis)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div>
        <b>{sideWins ? "win route" : "best route"}</b>
        <p>{valueText(route)}</p>
      </div>
      <div data-muted="true">
        <b>failure condition</b>
        <p>{valueText(weakness)}</p>
      </div>
      <div className={styles.subjectFlags}>
        {subjectFlags.length ? (
          subjectFlags.map((row, i) => (
            <span
              key={`${row.category}-${i}`}
              data-risk={row.contested || row.winner !== side}
            >
              {row.category}: {row.contested ? "REVIEW" : "DISADVANTAGE"}
            </span>
          ))
        ) : (
          <span>NO OPEN EXCEPTION FLAGS</span>
        )}
      </div>
      <div>
        {(relevantRows.length ? relevantRows : comparison.slice(0, 3))
          .slice(0, 3)
          .map((row, i) => (
            <span key={`${row.category}-${i}`}>
              {row.category}: {row.margin ?? "EVEN"}
            </span>
          ))}
      </div>
    </article>
  );
}

function portraitInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ClaimCard({
  claim,
  fighters,
  reportId,
  reportTitle,
}: {
  claim: ReportClaim;
  fighters: ReportFighter[];
  reportId: string;
  reportTitle: string;
}) {
  const state: ClaimReviewState = claim.contested
    ? "danger"
    : claim.outlier || hasSourceRisk(claim.source)
      ? "caution"
      : "stable";
  const reviewStatus = claimReviewStatus(state);
  const [appealId, setAppealId] = useState<string | null>(null);
  const appealSubject = appealSubjectForSide(claim.side, fighters, reportTitle);

  return (
    <article
      id={claimTargetId(claim.id)}
      className={styles.claimRecord}
      data-contested={claim.contested}
      data-fact-issue={Boolean(appealId)}
      data-outlier={claim.outlier}
      data-state={state}
    >
      <div className={styles.claimRecordMeta}>
        <span>{claim.id}</span>
        <b>{formatSide(claim.side, fighters)}</b>
        <span>{claim.category ?? claim.kind ?? "CLAIM"}</span>
        <span>{valueText(claim.evidence_level)}</span>
        <strong>{percentText(claim.confidence)}</strong>
        <em title={reviewStatus.title}>{reviewStatus.label}</em>
      </div>
      <p className={styles.claimText}>{claim.text}</p>
      <footer>
        <span>{sourceSummary(claim.source)}</span>
        <FactIssueButton
          active={Boolean(appealId)}
          onSubmitted={setAppealId}
          target={{
            reportId,
            reportTitle,
            targetType: "claim",
            targetId: claim.id,
            targetText: claim.text,
            subjectName: appealSubject.name,
            subjectVersion: appealSubject.version,
            side: claim.side,
            category: claim.category ?? claim.kind ?? claim.tag,
            claimId: claim.id,
            sourceRef: sourceSummary(claim.source),
            confidence: claim.confidence,
          }}
        />
      </footer>
    </article>
  );
}

function claimReviewStatus(state: ClaimReviewState) {
  return CLAIM_REVIEW_STATUS[state];
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
