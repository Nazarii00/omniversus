export type BattleStartButtonState = "idle" | "loading" | "armed";

type BattleStartButtonProps = {
  state: BattleStartButtonState;
  disabled?: boolean;
  disabledLabel?: string;
  onStart: () => void;
};

export default function BattleStartButton({
  state,
  disabled = false,
  disabledLabel = "LOCKED",
  onStart,
}: BattleStartButtonProps) {
  const isLoading = state === "loading";
  const isDisabled = disabled || isLoading;
  const label =
    disabled && !isLoading
      ? disabledLabel
      : state === "armed"
        ? "EXECUTED"
        : isLoading
          ? "EXECUTING"
          : "EXECUTE_BATTLE";

  return (
    <button
      type="button"
      aria-busy={isLoading}
      disabled={isDisabled}
      onClick={onStart}
      className="home-battle-button relative grid h-[3.3rem] max-h-[3.3rem] min-h-[3.3rem] w-[min(82vw,16rem)] flex-none basis-[3.3rem] place-items-center overflow-hidden border border-[#1a3a1a] bg-black/84 px-6 py-0 text-center text-[0.8rem] font-bold uppercase leading-none tracking-[0.12em] text-[#68b768] outline-none transition-colors duration-150 disabled:cursor-not-allowed sm:h-[3.6rem] sm:max-h-[3.6rem] sm:min-h-[3.6rem] sm:basis-[3.6rem] sm:w-72 sm:text-[0.86rem]"
      data-state={state}
      data-disabled={disabled && !isLoading}
    >
      <span className="home-battle-button__load" aria-hidden="true" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}
