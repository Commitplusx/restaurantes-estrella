const url = "https://jdrrkpvodnqoljycixbg.supabase.co/rest/v1/pedidos";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ";

const payload = {
      cliente_tel: '9631367971',
      cliente_nombre: 'Prueba',
      restaurante: 'Burger King',
      restaurante_id: '811451e0-716b-472d-88b1-38cb4bfab195', // valid uuid
      descripcion: 'Prueba de pedido',
      direccion: 'Centro',
      referencias_entrega: '',
      lat: 16.25,
      lng: -92.13,
      estado: 'pendiente',
      wb_message_id: '123456',
      metodo_pago: 'efectivo',
      total: 100,
      tipo_pedido: 'domicilio',
      pin_seguridad: '1234',
      idempotency_key: '811451e0-716b-472d-88b1-38cb4bfab195'
};

async function check() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Data:", data);
}

check();
