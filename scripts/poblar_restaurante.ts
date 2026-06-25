import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const args = process.argv.slice(2);
  const restId = args[0];

  if (!restId) {
    console.log("Primero necesitamos ver tus restaurantes. Aquí están:");
    const { data } = await supabase.from('restaurantes').select('id, nombre, slug');
    data?.forEach((r, i) => console.log(`👉 ID: ${r.id} | Nombre: ${r.nombre}`));
    console.log("\nPara poblar uno, corre este comando copiando el ID:");
    console.log("npx tsx scripts/poblar_restaurante.ts <AQUI_EL_ID_DEL_RESTAURANTE>");
    return;
  }

  console.log(`⏳ Poblando restaurante: ${restId}...`);

  // 1. Crear Categorías
  const categorias = [
    { restaurante_id: restId, nombre: '🔥 Populares', orden: 1 },
    { restaurante_id: restId, nombre: '🍔 Principales', orden: 2 },
    { restaurante_id: restId, nombre: '🍟 Complementos', orden: 3 },
    { restaurante_id: restId, nombre: '🥤 Bebidas', orden: 4 }
  ];

  const { data: catData, error: catErr } = await supabase
    .from('menu_categorias')
    .insert(categorias)
    .select();

  if (catErr || !catData) {
    console.error("Error creando categorías:", catErr);
    return;
  }
  
  console.log("✅ Categorías creadas.");

  // 2. Crear Productos Falsos Realistas
  const findCatId = (nombre: string) => catData.find(c => c.nombre === nombre)?.id;

  const items = [
    {
      restaurante_id: restId,
      categoria_id: findCatId('🔥 Populares'),
      nombre: 'Hamburguesa Doble Smash',
      descripcion: 'Doble carne de res smash, queso cheddar derretido, tocino crujiente, cebolla caramelizada y aderezo secreto de la casa en pan brioche.',
      precio: 145.00,
      foto_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 1
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🍔 Principales'),
      nombre: 'Hamburguesa Clásica',
      descripcion: 'Carne 100% de res, lechuga fresca, tomate, cebolla morada, pepinillos y queso americano.',
      precio: 110.00,
      foto_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 2
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🍔 Principales'),
      nombre: 'Pollo Crispy Spicy',
      descripcion: 'Pechuga de pollo empanizada extra crujiente bañada en salsa buffalo suave, con ensalada de col (coleslaw).',
      precio: 135.00,
      foto_url: 'https://images.unsplash.com/photo-1626082895617-2c6ad36c2e71?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 3
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🍟 Complementos'),
      nombre: 'Papas a la Francesa Grandes',
      descripcion: 'Crujientes por fuera, suaves por dentro. Sazonadas con nuestra mezcla especial de sal de ajo y paprika.',
      precio: 65.00,
      foto_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 4
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🍟 Complementos'),
      nombre: 'Aros de Cebolla',
      descripcion: '10 aros de cebolla empanizados con aderezo ranch para acompañar.',
      precio: 75.00,
      foto_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 5
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🥤 Bebidas'),
      nombre: 'Refresco Coca-Cola Regular',
      descripcion: 'Lata 355ml bien fría.',
      precio: 30.00,
      foto_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 6
    },
    {
      restaurante_id: restId,
      categoria_id: findCatId('🥤 Bebidas'),
      nombre: 'Malteada de Vainilla',
      descripcion: 'Malteada espesa hecha con helado artesanal de vainilla y coronada con crema batida.',
      precio: 85.00,
      foto_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1000&auto=format&fit=crop',
      disponible: true,
      orden: 7
    }
  ];

  const { error: itemsErr } = await supabase.from('menu_items').insert(items);
  
  if (itemsErr) {
    console.error("Error creando productos:", itemsErr);
    return;
  }

  console.log("✅ 7 Productos súper antojables creados.");

  // 3. Crear una Promoción Atractiva
  const promo = {
    restaurante_id: restId,
    titulo: 'Combo Pareja: 2 Smash + Papas + 2 Refrescos',
    descripcion: 'El combo perfecto para compartir. Incluye 2 hamburguesas dobles, 1 orden de papas grande y 2 bebidas a elegir.',
    precio_especial: 299.00,
    foto_url: 'https://images.unsplash.com/photo-1594212691516-436f54c330f5?q=80&w=1000&auto=format&fit=crop',
    activa: true
  };

  await supabase.from('menu_promociones').insert([promo]);
  console.log("✅ 1 Mega Promoción creada.");

  console.log("\n🎉 ¡Listo! El restaurante está LLENO de vida.");
  console.log("Entra a ver el menú público para maravillarte con la velocidad y las fotos.");
}

run();
