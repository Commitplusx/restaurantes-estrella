import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
  console.log("Revisando los últimos pedidos...")
  const { data: pedidos } = await supabase.from('pedidos').select('id, ticket_id, total').order('created_at', { ascending: false }).limit(3)
  console.log(pedidos)

  console.log("Revisando los últimos pings...")
  const { data: pings } = await supabase.from('repartidores_ping').select('id, target_driver_id, pedido_id, created_at').order('created_at', { ascending: false }).limit(3)
  console.log(pings)
}

check()
