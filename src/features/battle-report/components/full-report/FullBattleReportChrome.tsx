"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { displayTitle, displayVerdict } from "../../model";
import styles from "../../styles/FullBattleReportChrome.module.css";

const REPORT_SECTION_TABS = [
  { id: "subjects", label: "Subjects" },
  { id: "verdict", label: "Verdict" },
  { id: "chain", label: "Reasoning" },
  { id: "confidence", label: "Confidence" },
  { id: "claims", label: "Evidence" },
] as const;

type ReportSectionId = (typeof REPORT_SECTION_TABS)[number]["id"];

export function ReportHero({
  title,
  summary,
  winner,
  difficulty,
  confidence,
  status,
  caseId,
  tags,
  actions,
}: {
  title: string;
  summary: string;
  winner: string;
  difficulty: string;
  confidence: number;
  status: string;
  caseId: string;
  tags: string[];
  actions?: ReactNode;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.heroMetaBlock}>
          <span>CASE {caseId}</span>
          <b>{status}</b>
        </div>
        <div className={styles.heroActions}>
          {actions}
          <Link
            className={styles.backLink}
            href="/"
            aria-label="Back to arena"
            title="Back to arena"
          >
            Back to Arena
          </Link>
        </div>
      </div>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <h1>{displayTitle(title)}</h1>
          <p>{summary}</p>
          <div className={styles.metaChips}>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <aside className={styles.verdictModule}>
          <span className={styles.stampHeader}>Winner</span>
          <strong>{displayVerdict(winner)}</strong>
          <dl>
            <div>
              <dt>difficulty</dt>
              <dd>{displayVerdict(difficulty)}</dd>
            </div>
            <div>
              <dt>confidence</dt>
              <dd>{confidence}%</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

export function SectionTabs() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] =
    useState<ReportSectionId>("subjects");
  const [pinState, setPinState] = useState({
    height: 0,
    left: 0,
    stuck: false,
    width: 0,
  });

  useEffect(() => {
    const slot = slotRef.current;
    const tabs = slot?.firstElementChild;

    if (!slot || !(tabs instanceof HTMLElement)) return;

    let frame = 0;

    const measure = () => {
      frame = 0;

      const rect = slot.getBoundingClientRect();
      const nextState = {
        height: tabs.offsetHeight,
        left: rect.left,
        stuck: rect.top <= 0,
        width: rect.width,
      };

      setPinState((currentState) =>
        currentState.height === nextState.height &&
        currentState.left === nextState.left &&
        currentState.stuck === nextState.stuck &&
        currentState.width === nextState.width
          ? currentState
          : nextState,
      );
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);

    measure();
    resizeObserver?.observe(slot);
    resizeObserver?.observe(tabs);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const activeHashSection = (): ReportSectionId | null => {
      const hash = window.location.hash.replace(/^#/, "");
      return REPORT_SECTION_TABS.find((tab) => tab.id === hash)?.id ?? null;
    };

    const updateActiveSection = () => {
      frame = 0;

      const anchorY = 56;
      let nextSection: ReportSectionId = "subjects";

      for (const tab of REPORT_SECTION_TABS) {
        const section = document.getElementById(tab.id);
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        if (rect.top <= anchorY) nextSection = tab.id;
        if (rect.top <= anchorY && rect.bottom > anchorY) break;
      }

      setActiveSection(nextSection);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    const updateFromHash = () => {
      const hashSection = activeHashSection();
      if (hashSection) setActiveSection(hashSection);
      scheduleUpdate();
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", updateFromHash);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  const slotStyle = {
    "--tabs-height": `${pinState.height}px`,
    "--tabs-left": `${pinState.left}px`,
    "--tabs-width": `${pinState.width}px`,
  } as CSSProperties;

  return (
    <div
      ref={slotRef}
      className={styles.sectionTabsSlot}
      data-stuck={pinState.stuck ? "true" : undefined}
      style={slotStyle}
    >
      <nav className={styles.sectionTabs} aria-label="Report sections">
        {REPORT_SECTION_TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={activeSection === tab.id ? "true" : undefined}
            onClick={() => setActiveSection(tab.id)}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
