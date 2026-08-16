import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description: "Search the Campus Mart marketplace for items listed by students.",
  inputSchema: {
    query: z.string().optional().describe("Free-text search over item name and description."),
    category: z.string().optional().describe("Category filter, e.g. Books, Electronics."),
    maxPrice: z.number().optional().describe("Maximum price in INR."),
    limit: z.number().int().optional().describe("Max results to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, maxPrice, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id, name, price, category, condition, description, created_at, seller_id")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 50));
    if (category) q = q.eq("category", category);
    if (typeof maxPrice === "number") q = q.lte("price", maxPrice);
    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
