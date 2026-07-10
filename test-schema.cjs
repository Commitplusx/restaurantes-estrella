const url = "https://jdrrkpvodnqoljycixbg.supabase.co/rest/v1/pedidos";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ";

async function check() {
  const res = await fetch(url + "?select=*", {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Range': '0-0'
    }
  });
  const data = await res.json();
  console.log("Columns:", Object.keys(data[0] || {}));
}
check();
