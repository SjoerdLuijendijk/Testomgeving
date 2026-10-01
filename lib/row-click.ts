/**
 * Runs `open` for a click on a table row, except when the click was on a control inside it (a
 * button, link or form field, or the status list), which handles the click itself.
 */
export function onRowClick(open: () => void) {
  return (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label, [popover]")) return;
    open();
  };
}
