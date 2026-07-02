import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdrrkpvodnqoljycixbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, nombre, aplica_subsidio, restaurante_id')
    .ilike('nombre', '%Hamburguesa Doble Smash%');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
