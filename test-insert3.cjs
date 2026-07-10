const url = "https://jdrrkpvodnqoljycixbg.supabase.co/rest/v1/pedidos";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJrcHZvZG5xb2xqeWNpeGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTEsImV4cCI6MjA5MDYyNTI5MX0.WEKqdL2p99cy8XvyqY31EP8-KbdOnhx2-fx9qz_iQtQ";

const payload = {
  "cliente_tel": "9631539156",
  "cliente_nombre": "juan perez",
  "restaurante": "RESTAURANTE",
  "restaurante_id": "b5d6dcde-a46a-49a1-8e01-b146cf2dda5e",
  "descripcion": "1x Hamburguesa Doble Queso ($120.00)\n\n🛵 *Tipo de entrega:* A domicilio\n📍 *Dirección:* Adolfo López Mateos 18, Belisario Domínguez Primera Secc, 30040 Comitán de Domínguez, Chis., México\n🚚 *Costo Envío:* $45\n\n💳 *Método de Pago:* Efectivo al recibir",
  "direccion": "Adolfo López Mateos 18, Belisario Domínguez Primera Secc, 30040 Comitán de Domínguez, Chis., México",
  "referencias_entrega": null,
  "lat": 16.232402286374896,
  "lng": -92.12847158065198,
  "estado": "pendiente",
  "wb_message_id": "KRZ7HP", // NEW ID
  "metodo_pago": "efectivo",
  "total": 165,
  "tipo_pedido": "domicilio",
  "pin_seguridad": null,
  "idempotency_key": "873a59db-a3f7-403a-9cc9-4bc8fd6f4d1p" // NEW ID
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
