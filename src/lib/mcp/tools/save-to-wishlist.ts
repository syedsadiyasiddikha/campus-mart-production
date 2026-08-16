import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "save_to_wishlist",
  title: "Save to wishlist",
  description: "Add a Campus Mart listing to the signed-in student's wishlist.",
  inputSchema: { productId: z.string().describe("Listing id to save.") },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ productId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("wishlists")
      .upsert({ user_id: ctx.getUserId()!, product_id: productId }, { onConflict: "user_id,product_id" });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Saved to wishlist." }] };
  },
});
