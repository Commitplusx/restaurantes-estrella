require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('pedidos').select('*').limit(1);
  if (error) {
    console.error("Error fetching pedidos:", error);
  } else {
    console.log("Columns:", Object.keys(data[0] || {}));
  }
}
check();
