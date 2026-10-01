"use client";

import { useId, useRef } from "react";

export type StatusTone = "available" | "negotiating" | "sold" | "done" | "cancelled";

export type StatusOption = {
  key: string;
  label: string;
  tone: StatusTone;
  /** The status the item is in now: marked, and never chosen again. */
  current?: boolean;
  /** Omitted: the option is shown but cannot be chosen. */
  onSelect?: () => void;
};

type StatusMenuProps = {
  label: string;
  tone: StatusTone;
  options: StatusOption[];
  ariaLabel: string;
  disabled?: boolean;
  /** Smaller pill, for labels next to other controls. */
  compact?: boolean;
  /** Adds "Gegevens bewerken" below the statuses, for an item with a note. */
  onEditDetails?: () => void;
};

// A status pill that opens the statuses below it to choose from. The list is a popover in the top
// layer, so the table's scroll container does not clip it.
export default function StatusMenu({ label, tone, options, ariaLabel, disabled, compact, onEditDetails }: StatusMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function open() {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 228))}px`;
    menu.showPopover();
    // The list is placed once; close it rather than leave it behind when the page scrolls.
    window.addEventListener("scroll", () => menu.hidePopover(), { once: true, capture: true });
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }

  function choose(action: (() => void) | undefined) {
    menuRef.current?.hidePopover();
    action?.();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`status-pill status-pill--${tone}${compact ? " status-pill--compact" : ""}`}
        onClick={open}
        disabled={disabled}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={`${ariaLabel}: ${label}. Status wijzigen`}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        className="status-menu"
        onToggle={(event) => {
          // Back to the pill when the list closes with Escape or a click elsewhere.
          if ((event as unknown as ToggleEvent).newState === "closed" && menuRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
        }}
      >
        <ul>
          {options.map((option) => (
            <li key={option.key}>
              <button type="button" onClick={() => choose(option.onSelect)} disabled={option.current || !option.onSelect} aria-current={option.current || undefined}>
                <span className={`status-dot status-dot--${option.tone}`} aria-hidden="true" />
                {option.label}
                {option.current && <span className="status-menu-hint">huidige status</span>}
              </button>
            </li>
          ))}
          {onEditDetails && (
            <li className="status-menu-extra">
              <button type="button" onClick={() => choose(onEditDetails)}>
                Gegevens bewerken
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
