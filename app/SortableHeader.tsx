import type { SortKey, SortState } from "../lib/stove-sort";

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
};

export default function SortableHeader({ label, sortKey, sort, onSort, className }: SortableHeaderProps) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" className={className} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label}
        <span aria-hidden="true" className="sort-indicator">{active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
