import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import createListing from "./tools/create-listing";
import deleteListing from "./tools/delete-listing";
import myListings from "./tools/my-listings";
import myWishlist from "./tools/my-wishlist";
import saveToWishlist from "./tools/save-to-wishlist";
import myOrders from "./tools/my-orders";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// Supabase value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "campus-mart-connect",
  title: "Campus Mart Connect",
  version: "0.1.0",
  instructions:
    "Tools for Campus Mart, a student marketplace for pre-owned campus items. Search or read listings, create and delete your own listings, manage your wishlist, and review your orders. All actions run as the signed-in student.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchListings,
    getListing,
    createListing,
    deleteListing,
    myListings,
    myWishlist,
    saveToWishlist,
    myOrders,
  ],
});
