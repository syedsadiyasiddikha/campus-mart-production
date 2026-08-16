import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_listing",
  title: "Create listing",
  description: "List a new item for sale on Campus Mart as the signed-in student.",
  inputSchema: {
    name: z.string().describe("Item title."),
    price: z.number().describe("Price in INR."),
    category: z.string().describe("Category, e.g. Books, Electronics, Cycles."),
    condition: z.string().describe("Condition, e.g. Like New, Good, Fair."),
    description: z.string().optional().describe("Item description."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, price, category, condition, description }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .insert({
        seller_id: ctx.getUserId(),
        name,
        price,
        category,
        condition,
        description: description ?? "",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Listed "${data.name}" for ₹${data.price}.` }],
      structuredContent: { listing: data },
    };
  },
});
