import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const payload = {
      cliente_tel: '9631367971',
      cliente_nombre: 'Prueba',
      restaurante: 'Burger King',
      restaurante_id: '123e4567-e89b-12d3-a456-426614174000',
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
      idempotency_key: 'test-123'
  };

  const { data, error } = await supabase.from('pedidos').insert([payload]).select();
  console.log("Error:", error);
}

testInsert();
