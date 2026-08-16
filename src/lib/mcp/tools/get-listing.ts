import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_listing",
  title: "Get listing",
  description: "Get full details for one Campus Mart listing, including seller name and department.",
  inputSchema: { id: z.string().describe("Listing id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Listing not found" }], isError: true };
    const { data: seller } = await supabase
      .from("profiles")
      .select("name, department, year")
      .eq("id", data.seller_id)
      .maybeSingle();
    const listing = { ...data, profiles: seller ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(listing) }],
      structuredContent: { listing },
    };

  },
});
