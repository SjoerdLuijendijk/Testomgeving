import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTICLE_COLUMNS, toArticle, type Article, type ArticleRow } from "./articles";

// All articles, by category and name.
export async function listArticles(supabase: SupabaseClient): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .order("diameter_mm", { ascending: true, nullsFirst: true })
    .order("length_mm", { ascending: true, nullsFirst: true })
    .limit(10000);
  if (error) throw error;
  return (data as ArticleRow[]).map(toArticle);
}
