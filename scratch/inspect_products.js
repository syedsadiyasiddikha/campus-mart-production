import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lfroaqcpbdrmwghretut.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmcm9hcWNwYmRybXdnaHJldHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYwOTkxOSwiZXhwIjoyMTAyMTg1OTE5fQ.TbUXNLHTgXuCQPGKuAwanDmBGYG3NjDAB203DgjKGr0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspect() {
  console.log("=== INSPECTING SUPABASE DATABASE PRODUCTS TABLE ===");
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }
  console.log(`Total rows in database 'products' table: ${data.length}\n`);
  data.forEach((p, idx) => {
    console.log(`Row #${idx + 1}:`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Price: ₹${p.price}`);
    console.log(`  Category: ${p.category}`);
    console.log(`  Seller ID: ${p.seller_id}`);
    console.log(`  Created At: ${p.created_at}`);
    console.log("---");
  });
}

inspect();
