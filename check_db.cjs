require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, nombre, aplica_subsidio')
    .ilike('nombre', '%Hamburguesa Doble Smash%');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
