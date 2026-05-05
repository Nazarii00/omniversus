type BattleReportButtonProps = {
  onViewReport: () => void;
};

export default function BattleReportButton({
  onViewReport,
}: BattleReportButtonProps) {
  return (
    <button
      type="button"
      aria-label="View full battle report"
      onClick={onViewReport}
      className="home-report-button grid h-11 w-[min(58vw,13.5rem)] place-items-center overflow-hidden border border-[#68b768] px-4 text-[0.64rem] font-bold uppercase leading-none tracking-[0.12em] text-[#c9ffc8] outline-none sm:h-12 sm:w-56 sm:text-[0.7rem]"
    >
      <span className="home-report-button__line" aria-hidden="true" />
      <span className="home-report-button__label">VIEW_FULL_REPORT</span>
    </button>
  );
}
