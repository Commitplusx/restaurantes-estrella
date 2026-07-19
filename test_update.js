import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jdrrkpvodnqoljycixbg.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'ey...'; // I will read it from .env

import fs from 'fs';
import path from 'path';

// read .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    // get a recent order
    const { data: order } = await supabase.from('pedidos').select('id, estado').order('created_at', { ascending: false }).limit(1).single();
    if (order) {
        console.log("Found order:", order.id, "current estado:", order.estado);
        const { error } = await supabase.from('pedidos').update({ estado: 'buscando_repartidor' }).eq('id', order.id);
        if (error) {
            console.error("ERROR UPDATING:", error);
        } else {
            console.log("UPDATE SUCCESSFUL! Restoring...");
            await supabase.from('pedidos').update({ estado: order.estado }).eq('id', order.id);
        }
    }
}

testUpdate();
