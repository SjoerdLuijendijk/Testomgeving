"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ADMIN_SECTIONS, type AdminSection } from "../lib/admin-sections";
import { STOCK_VIEW_HREFS } from "../lib/stock-views";
import type { OpenNoteCounts } from "../lib/stove-note-queries";
import { signOut } from "./auth/actions";

type MenuItemKey = "agenda" | "afleveren" | "notities" | "verkocht" | AdminSection;

type MenuItem = { key: MenuItemKey; label: string; href: string };

const MENU_ITEMS: MenuItem[] = [
  { key: "agenda", label: "Agenda", href: "/?tab=agenda" },
  { key: "afleveren", label: "Af te leveren", href: "/?tab=afleveren" },
  { key: "notities", label: "In onderhandeling", href: "/?tab=notities" },
  { key: "verkocht", label: "Verkocht archief", href: STOCK_VIEW_HREFS.sold },
  ...ADMIN_SECTIONS.filter(({ setting }) => !setting),
];
// Settings pages sit one level deeper, under "Instellingen".
const SETTINGS_ITEMS: MenuItem[] = ADMIN_SECTIONS.filter(({ setting }) => setting);

type AccountMenuProps = {
  email: string | undefined;
  /** Team members get the sold archive and management pages; others only sign out. */
  showSections: boolean;
  activeItem: MenuItemKey | null;
  /** Open sales notes and sold stoves to deliver; the counts show on the button and the menu items. */
  noteCounts: OpenNoteCounts;
};

// Profile button top right; its dropdown opens the sold archive and management pages directly and signs out.
export default function AccountMenu({ email, showSections, activeItem, noteCounts }: AccountMenuProps) {
  const openNotes = noteCounts.open;
  const itemCounts: Partial<Record<MenuItemKey, number>> = { agenda: noteCounts.today, afleveren: noteCounts.toDeliver, notities: noteCounts.open - noteCounts.toDeliver };
  const [open, setOpen] = useState(false);
  const settingsActive = SETTINGS_ITEMS.some(({ key }) => key === activeItem);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const settingsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on a click or tap outside the menu.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="account-menu" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="account-button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={openNotes > 0 ? `Account en beheer, ${openNotes} open ${openNotes === 1 ? "notitie" : "notities"}` : "Account en beheer"}
        onClick={() => setOpen((value) => !value)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        {openNotes > 0 && <span className="count-badge" aria-hidden="true">{openNotes}</span>}
        <svg aria-hidden="true" className="account-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={menuId} className="account-dropdown" hidden={!open}>
        {email && <p className="account-email" title={email}>{email}</p>}
        {showSections && (
          <nav aria-label="Beheer">
            <ul>
              {MENU_ITEMS.map(({ key, label, href }) => (
                <li key={key}>
                  <Link href={href} aria-current={activeItem === key ? "page" : undefined} onClick={() => setOpen(false)}>
                    {label}
                    {(itemCounts[key] ?? 0) > 0 && <span className="count-badge">{itemCounts[key]}</span>}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="account-submenu-toggle"
                  aria-expanded={settingsOpen}
                  aria-controls={settingsId}
                  onClick={() => setSettingsOpen((value) => !value)}
                >
                  Instellingen
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                <ul id={settingsId} className="account-submenu" hidden={!settingsOpen}>
                  {SETTINGS_ITEMS.map(({ key, label, href }) => (
                    <li key={key}>
                      <Link href={href} aria-current={activeItem === key ? "page" : undefined} onClick={() => setOpen(false)}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        )}
        <form action={signOut} className="account-signout">
          <button type="submit">Uitloggen</button>
        </form>
      </div>
    </div>
  );
}
