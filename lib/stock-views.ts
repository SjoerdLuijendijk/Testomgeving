// The stock page shows the current stock by default; the sold archive is opened from the account menu.
export type StockView = "available" | "sold";

export const STOCK_VIEW_HREFS: Record<StockView, string> = {
  available: "/?tab=voorraad",
  sold: "/?tab=voorraad&weergave=verkocht",
};
