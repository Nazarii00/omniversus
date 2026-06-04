"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";

import { findCompletion, findMatches } from "../../logic";
import type { ArenaCardSide, CombatantOption } from "../../model";

type CombatantDrafts = Record<ArenaCardSide, string>;
type CaretPositions = Record<ArenaCardSide, number>;

type CombatantLoadoutConsoleProps = {
  initialFocusSide: ArenaCardSide;
  initialLeftName?: string;
  initialRightName?: string;
  options: CombatantOption[];
  onClose: () => void;
  onSubmit: (drafts: CombatantDrafts) => void;
};

function sideLabel(side: ArenaCardSide) {
  return side === "left" ? "FIGHTER_A" : "FIGHTER_B";
}

function clampCaret(value: string, position: number) {
  return Math.max(0, Math.min(value.length, position));
}

export default function CombatantLoadoutConsole({
  initialFocusSide,
  initialLeftName = "",
  initialRightName = "",
  options,
  onClose,
  onSubmit,
}: CombatantLoadoutConsoleProps) {
  const [activeSide, setActiveSide] = useState<ArenaCardSide>(initialFocusSide);
  const [drafts, setDrafts] = useState<CombatantDrafts>({
    left: initialLeftName,
    right: initialRightName,
  });
  const [caretPositions, setCaretPositions] = useState<CaretPositions>({
    left: initialLeftName.length,
    right: initialRightName.length,
  });
  const [highlightedMatchIndex, setHighlightedMatchIndex] = useState<
    number | null
  >(null);
  const leftInputRef = useRef<HTMLInputElement | null>(null);
  const rightInputRef = useRef<HTMLInputElement | null>(null);
  const activeMatches = useMemo(
    () => findMatches(options, drafts[activeSide]),
    [activeSide, drafts, options],
  );
  const completions = useMemo(
    () => ({
      left: findCompletion(options, drafts.left),
      right: findCompletion(options, drafts.right),
    }),
    [drafts.left, drafts.right, options],
  );
  const activeHighlightedMatchIndex =
    highlightedMatchIndex !== null &&
    highlightedMatchIndex < activeMatches.length
      ? highlightedMatchIndex
      : null;
  const canSubmit = Boolean(drafts.left.trim() && drafts.right.trim());

  useEffect(() => {
    const inputRef = initialFocusSide === "left" ? leftInputRef : rightInputRef;
    const initialValue =
      initialFocusSide === "left" ? initialLeftName : initialRightName;
    const caretPosition = initialValue.length;

    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(caretPosition, caretPosition);
  }, [initialFocusSide, initialLeftName, initialRightName]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateDraft(side: ArenaCardSide, value: string) {
    setDrafts((current) => ({ ...current, [side]: value }));
  }

  function focusInput(side: ArenaCardSide, caretPosition: number) {
    const inputRef = side === "left" ? leftInputRef : rightInputRef;

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caretPosition, caretPosition);
      setCaretPositions((current) => ({
        ...current,
        [side]: caretPosition,
      }));
    });
  }

  function focusDraftSide(side: ArenaCardSide) {
    setActiveSide(side);
    setHighlightedMatchIndex(null);
    focusInput(side, drafts[side].length);
  }

  function readCaretPosition(
    side: ArenaCardSide,
    input: HTMLInputElement | null,
  ) {
    if (!input) return;

    const nextPosition = clampCaret(input.value, input.selectionStart ?? 0);
    setCaretPositions((current) => ({
      ...current,
      [side]: nextPosition,
    }));
  }

  function updateDraftFromInput(side: ArenaCardSide, input: HTMLInputElement) {
    setHighlightedMatchIndex(null);
    updateDraft(side, input.value);
    readCaretPosition(side, input);
  }

  function selectMatch(side: ArenaCardSide, option: CombatantOption) {
    updateDraft(side, option.name);
    setActiveSide(side);
    setHighlightedMatchIndex(null);
    focusInput(side, option.name.length);
  }

  function completeDraft(side: ArenaCardSide) {
    if (caretPositions[side] !== drafts[side].length) return false;

    const completion = completions[side];

    if (!completion) return false;

    updateDraft(side, completion.option.name);
    focusInput(side, completion.option.name.length);
    return true;
  }

  function handleInputKeyDown(
    side: ArenaCardSide,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    const sideMatches =
      side === activeSide ? activeMatches : findMatches(options, drafts[side]);
    const sideHighlightedMatchIndex =
      highlightedMatchIndex !== null &&
      highlightedMatchIndex < sideMatches.length
        ? highlightedMatchIndex
        : null;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (
        event.key === "ArrowDown" &&
        side === "left" &&
        sideHighlightedMatchIndex === null
      ) {
        focusDraftSide("right");
        return;
      }

      if (
        event.key === "ArrowUp" &&
        side === "right" &&
        sideHighlightedMatchIndex === null
      ) {
        focusDraftSide("left");
        return;
      }

      if (!sideMatches.length) return;

      setActiveSide(side);
      setHighlightedMatchIndex((currentIndex) => {
        const safeCurrentIndex =
          currentIndex !== null && currentIndex < sideMatches.length
            ? currentIndex
            : null;

        if (event.key === "ArrowDown") {
          return safeCurrentIndex === null
            ? 0
            : (safeCurrentIndex + 1) % sideMatches.length;
        }

        if (safeCurrentIndex === 0) return null;

        return safeCurrentIndex === null
          ? sideMatches.length - 1
          : (safeCurrentIndex - 1 + sideMatches.length) % sideMatches.length;
      });
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    const highlightedMatch =
      sideHighlightedMatchIndex === null
        ? null
        : sideMatches[sideHighlightedMatchIndex];

    if (highlightedMatch) {
      event.preventDefault();
      selectMatch(side, highlightedMatch);
      return;
    }

    if (completeDraft(side)) {
      event.preventDefault();
      return;
    }

    if (side === "left" && !drafts.right.trim()) {
      event.preventDefault();
      setActiveSide("right");
      focusInput("right", drafts.right.length);
    }
  }

  function resetDrafts() {
    setDrafts({ left: "", right: "" });
    setCaretPositions({ left: 0, right: 0 });
    setActiveSide("left");
    focusInput("left", 0);
  }

  function submitLoadout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!drafts.left.trim()) {
      setActiveSide("left");
      focusInput("left", drafts.left.length);
      return;
    }

    if (!drafts.right.trim()) {
      setActiveSide("right");
      focusInput("right", drafts.right.length);
      return;
    }

    onSubmit({
      left: drafts.left.trim(),
      right: drafts.right.trim(),
    });
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function renderPromptInput(
    side: ArenaCardSide,
    inputRef: typeof leftInputRef,
    placeholder: string,
  ) {
    const value = drafts[side];
    const isActive = activeSide === side;
    const caretPosition = clampCaret(value, caretPositions[side]);
    const showCompletion = caretPosition === value.length;
    const completion = showCompletion ? completions[side] : null;
    const caretOverlayIndex = value.length
      ? Math.min(caretPosition, value.length - 1)
      : 0;
    const caretCharacter = value[caretOverlayIndex] ?? "\u00a0";
    const inputId = `combatant-${side}-input`;
    const matchesId = `combatant-${side}-matches`;
    const highlightedMatchId =
      isActive && activeHighlightedMatchIndex !== null
        ? `${matchesId}-${activeHighlightedMatchIndex}`
        : undefined;

    return (
      <span className="home-loadout-console__input-wrap">
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={matchesId}
          aria-expanded={isActive && activeMatches.length > 0}
          aria-activedescendant={highlightedMatchId}
          onChange={(event) => updateDraftFromInput(side, event.currentTarget)}
          onClick={(event) => readCaretPosition(side, event.currentTarget)}
          onFocus={(event) => {
            if (activeSide !== side) {
              setHighlightedMatchIndex(null);
            }
            setActiveSide(side);
            readCaretPosition(side, event.currentTarget);
          }}
          onKeyDown={(event) => handleInputKeyDown(side, event)}
          onKeyUp={(event) => readCaretPosition(side, event.currentTarget)}
          onSelect={(event) => readCaretPosition(side, event.currentTarget)}
        />
        <span
          className="home-loadout-console__input-visual"
          aria-hidden="true"
          style={{ "--caret-left": `${caretOverlayIndex}ch` } as CSSProperties}
        >
          <span>{value}</span>
          {completion ? (
            <span className="home-loadout-console__ghost">
              {completion.suffix}
            </span>
          ) : null}
          {isActive ? (
            <span className="home-loadout-console__caret">
              {caretCharacter}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <div
      className="home-loadout-console-backdrop"
      onMouseDown={closeFromBackdrop}
    >
      <form
        className="home-loadout-console"
        aria-label="Combatant loadout console"
        onSubmit={submitLoadout}
      >
        <div className="home-loadout-console__titlebar">
          <span className="home-loadout-console__title">
            C:\Omniversus\omniversus.cmd
          </span>
          <button
            type="button"
            aria-label="Close combatant console"
            className="home-loadout-console__close"
            onClick={onClose}
          >
            [X]
          </button>
        </div>

        <div className="home-loadout-console__screen">
          <p>C:\Omniversus&gt;arena-loadout.cmd</p>
          <p>Directory of C:\Omniversus\Combatants</p>
          <p>&nbsp;</p>

          <label
            className="home-loadout-console__prompt"
            data-active={activeSide === "left"}
          >
            <span>C:\Omniversus&gt;set {sideLabel("left")}=</span>
            {renderPromptInput("left", leftInputRef, "Search DB")}
          </label>

          <label
            className="home-loadout-console__prompt"
            data-active={activeSide === "right"}
          >
            <span>C:\Omniversus&gt;set {sideLabel("right")}=</span>
            {renderPromptInput("right", rightInputRef, "Search DB")}
          </label>

          <div
            id={`combatant-${activeSide}-matches`}
            className="home-loadout-console__matches"
            role="listbox"
            aria-live="polite"
          >
            <p>&nbsp;</p>
            <p>C:\Omniversus&gt;dir /b matches\{sideLabel(activeSide)}</p>
            {activeMatches.length ? (
              activeMatches.map((option, index) => (
                <button
                  id={`combatant-${activeSide}-matches-${index}`}
                  key={option.id}
                  type="button"
                  className="home-loadout-console__match"
                  role="option"
                  aria-selected={activeHighlightedMatchIndex === index}
                  data-highlighted={
                    activeHighlightedMatchIndex === index ? "true" : undefined
                  }
                  onMouseEnter={() => setHighlightedMatchIndex(index)}
                  onClick={() => selectMatch(activeSide, option)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{option.name}</span>
                  <span>{option.universe}</span>
                </button>
              ))
            ) : (
              <p>No DB matches - text input allowed</p>
            )}
          </div>

          <div className="home-loadout-console__actions">
            <span>C:\Omniversus&gt;</span>
            <button type="submit" disabled={!canSubmit}>
              load
            </button>
            <button type="button" onClick={resetDrafts}>
              reset
            </button>
            <button type="button" onClick={onClose}>
              exit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
