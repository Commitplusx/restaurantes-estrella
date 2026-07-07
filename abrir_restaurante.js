import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: No se encontraron las variables de entorno de Supabase en el archivo .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function abrirRestaurante() {
  const restauranteId = 'c4039ae9-428a-4fec-aaec-ab8b64c47d57'
  
  console.log(`⏳ Actualizando restaurante ${restauranteId}...`)
  
  const { data, error } = await supabase
    .from('restaurantes')
    .update({ 
      hora_apertura: '00:00:00',
      hora_cierre: '23:59:59',
      horarios: null, // Borramos horarios específicos por día para que use el general
      activo: true
    })
    .eq('id', restauranteId)
    .select('nombre_comercial')

  if (error) {
    console.error("❌ Error al actualizar:", error.message)
    return
  }

  if (data && data.length > 0) {
    console.log(`✅ ¡Éxito! El restaurante "${data[0].nombre_comercial}" ahora está ABIERTO todo el día.`)
  } else {
    console.log("⚠️ No se encontró el restaurante o no tienes permisos para actualizarlo. (Puede requerir Service Role si el Row Level Security lo bloquea).")
  }
}

abrirRestaurante()
