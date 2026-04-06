require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking DB...");
  const { data, error } = await supabase.rpc("add_perfect_plus_column");
  if (error) {
    console.log("RPC add_perfect_plus_column not found. Please run this SQL in Supabase dashboard:");
    console.log("ALTER TABLE play_results ADD COLUMN perfect_plus INTEGER DEFAULT 0;");
  } else {
    console.log("Done");
  }
}

run();
