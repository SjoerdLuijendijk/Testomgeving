import type { Stove } from "./stoves";

export type SortKey = "number" | "brand" | "condition" | "priceCents" | "status" | "createdAt";
export type SortState = { key: SortKey; direction: "asc" | "desc" };

export const DEFAULT_SORT: SortState = { key: "number", direction: "desc" };

function sortValue(stove: Stove, key: SortKey): string | number | null {
  if (key === "status") return stove.soldAt ? 1 : 0;
  return stove[key];
}

// Sorts a copy; missing values always go last, whatever the direction.
export function sortStoves(stoves: Stove[], { key, direction }: SortState) {
  const factor = direction === "asc" ? 1 : -1;
  return [...stoves].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === right) return b.number - a.number;
    if (left === null) return 1;
    if (right === null) return -1;
    const order = typeof left === "string" && typeof right === "string" ? left.localeCompare(right, "nl") : left < right ? -1 : 1;
    return order * factor;
  });
}

// Clicking the active column flips the direction; a new column starts ascending (numbers: descending).
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: key === "number" || key === "createdAt" || key === "priceCents" ? "desc" : "asc" };
}
