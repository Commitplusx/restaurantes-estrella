const url = "https://jdrrkpvodnqoljycixbg.supabase.co/rest/v1/";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ";

const query = `
  SELECT pg_get_constraintdef(c.oid) AS constraint_def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.conname = 'pedidos_estado_check';
`;

async function check() {
  const res = await fetch("https://jdrrkpvodnqoljycixbg.supabase.co/rest/v1/rpc/exec_sql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({ query })
  });
  
  const data = await res.text();
  console.log("Data:", data);
}

check();
