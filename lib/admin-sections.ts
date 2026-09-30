// The management pages, opened straight from the account menu. The routes keep the former Admin tab.
export type AdminSection = "facturen" | "bedrijf" | "advertentie" | "webshop";

export const ADMIN_SECTIONS: { key: AdminSection; label: string; href: string }[] = [
  { key: "facturen", label: "Facturen", href: "/?tab=admin" },
  { key: "bedrijf", label: "Bedrijfsgegevens", href: "/?tab=admin&sectie=bedrijf" },
  { key: "advertentie", label: "Prompt instellen", href: "/?tab=admin&sectie=advertentie" },
  { key: "webshop", label: "Webshop", href: "/?tab=admin&sectie=webshop" },
];
