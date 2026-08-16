import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_wishlist",
  title: "My wishlist",
  description: "Show the items the signed-in student saved to their Campus Mart wishlist.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("wishlists")
      .select("product_id, products:product_id(id, name, price, category, condition)")
      .eq("user_id", ctx.getUserId()!);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const items = (data ?? []).map((r: { products: unknown }) => r.products).filter(Boolean);
    return {
      content: [{ type: "text", text: JSON.stringify(items) }],
      structuredContent: { wishlist: items },
    };
  },
});
