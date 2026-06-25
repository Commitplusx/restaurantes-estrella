import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const { data, error } = await supabase.from('restaurantes').select('id, nombre, slug');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  console.log('Restaurantes actuales:');
  data.forEach((r, i) => console.log(`${i + 1}. [${r.id}] ${r.nombre} (Slug: ${r.slug})`));
}

run();
