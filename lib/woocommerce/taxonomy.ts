import { wooRequest, type getWooCommerceConfig } from "./client";

// Server-only. Resolves the shop's global attributes, their terms and product categories.

type Config = NonNullable<ReturnType<typeof getWooCommerceConfig>>;
type Attribute = { id: number; slug: string };
type Term = { id: number; name: string };
type Category = { id: number; slug: string };

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

// "6,5 kw", "6.5kW" and "6,5 kW" are the same term; so are "BK" and "Bk".
function normalise(name: string) {
  return name.toLowerCase().replace(/\s+/g, "").replace(",", ".");
}

async function listAll<T>(config: Config, path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const batch = await wooRequest<T[]>(config, "GET", `${path}${separator}per_page=${PAGE_SIZE}&page=${page}`);
    items.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return items;
}

/** Looks up shop attributes and categories once per sync. */
export class ShopTaxonomy {
  private attributes: Promise<Attribute[]> | null = null;
  private terms = new Map<number, Promise<Term[]>>();

  constructor(private readonly config: Config) {}

  // Id of a global attribute such as "pa_merk"; null when the shop does not have it.
  async attributeId(slug: string): Promise<number | null> {
    this.attributes ??= wooRequest<Attribute[]>(this.config, "GET", "/products/attributes");
    return (await this.attributes).find((attribute) => attribute.slug === slug)?.id ?? null;
  }

  // The shop's spelling of a term, created when the shop does not have it yet.
  async termName(attributeId: number, name: string): Promise<string> {
    if (!this.terms.has(attributeId)) this.terms.set(attributeId, listAll<Term>(this.config, `/products/attributes/${attributeId}/terms`));
    const terms = await this.terms.get(attributeId)!;
    const existing = terms.find((term) => normalise(term.name) === normalise(name));
    if (existing) return existing.name;

    const created = await wooRequest<Term>(this.config, "POST", `/products/attributes/${attributeId}/terms`, { name });
    terms.push(created);
    return created.name;
  }

  // Id of a product category by slug; null when the shop does not have it.
  async categoryId(slug: string): Promise<number | null> {
    const categories = await wooRequest<Category[]>(this.config, "GET", `/products/categories?slug=${encodeURIComponent(slug)}`);
    return categories[0]?.id ?? null;
  }
}
