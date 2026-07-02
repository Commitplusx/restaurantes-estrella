import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdrrkpvodnqoljycixbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: combos } = await supabase.from('menu_combos').select('*').ilike('nombre', '%Hamburguesa Doble Smash%');
  const { data: promos } = await supabase.from('menu_promociones').select('*').ilike('titulo', '%Hamburguesa Doble Smash%');
  console.log("Combos:", JSON.stringify(combos));
  console.log("Promos:", JSON.stringify(promos));
}

check();
