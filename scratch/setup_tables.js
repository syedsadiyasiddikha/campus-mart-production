import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lfroaqcpbdrmwghretut.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmcm9hcWNwYmRybXdnaHJldHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYwOTkxOSwiZXhwIjoyMTAyMTg1OTE5fQ.TbUXNLHTgXuCQPGKuAwanDmBGYG3NjDAB203DgjKGr0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log("Checking if we can query public.products...");
  const res = await supabase.from("products").select("*");
  console.log("Query result:", res);
}

run();
