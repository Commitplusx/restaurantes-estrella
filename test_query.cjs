const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdrrkpvodnqoljycixbg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ'
);

async function checkRestaurantes() {
  console.log('Fetching restaurantes...');
  
  const { data, error } = await supabase
    .from('restaurantes')
    .select('id, nombre, categorias, perfil_completo')
    .eq('activo', true)
    .limit(5);

  if (error) {
    console.error('Error in select:', error);
  } else {
    console.log('Success! Found', data.length, 'restaurants.');
    console.log(data);
  }
}

checkRestaurantes();
