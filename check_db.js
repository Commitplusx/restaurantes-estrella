const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.log('No supabase creds found');
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const { data: restaurantes, error: err1 } = await supabase.from('restaurantes').select('*');
  if (err1) console.error(err1);
  else {
    let found = false;
    for (const r of restaurantes) {
      if (JSON.stringify(r).includes('vercel.app')) {
        console.log('FOUND IN RESTAURANTES TABLE:', r.nombre);
        found = true;
      }
    }
    if (!found) console.log('Not in restaurantes table.');
  }

  const { data: appConfig, error: err2 } = await supabase.from('app_config').select('*');
  if (err2) console.error(err2);
  else {
    let found = false;
    for (const c of appConfig) {
      if (JSON.stringify(c).includes('vercel.app')) {
        console.log('FOUND IN APP_CONFIG TABLE:', c.id);
        found = true;
      }
    }
    if (!found) console.log('Not in app_config table.');
  }
}

check();
