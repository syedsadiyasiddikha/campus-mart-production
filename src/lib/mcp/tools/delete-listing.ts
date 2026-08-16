import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_listing",
  title: "Delete listing",
  description: "Delete one of the signed-in student's own Campus Mart listings.",
  inputSchema: { id: z.string().describe("Listing id to delete.") },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("seller_id", ctx.getUserId()!)
      .select("id, name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No matching listing owned by you." }], isError: true };
    }
    return { content: [{ type: "text", text: `Deleted "${data[0].name}".` }] };
  },
});
