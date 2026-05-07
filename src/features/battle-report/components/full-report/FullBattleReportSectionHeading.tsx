import styles from "./FullBattleReportPage.module.css";

export function SectionHeading({
  eyebrow,
  title,
  signal,
  large = false,
}: {
  eyebrow: string;
  title: string;
  signal?: string;
  large?: boolean;
}) {
  return (
    <div className={styles.sectionHeading} data-large={large}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {signal ? <b>{signal}</b> : null}
    </div>
  );
}
