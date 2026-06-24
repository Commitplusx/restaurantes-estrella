export default async function handler(req, res) {
  const { slug } = req.query;
  
  // URL base para hacer fetch del index.html real
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    // 1. Obtener la página SPA en blanco (la normal)
    const htmlRes = await fetch(`${baseUrl}/index.html`);
    let html = await htmlRes.text();

    // 2. Obtener info del restaurante desde Supabase usando REST directo
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && slug) {
      const restRes = await fetch(`${supabaseUrl}/rest/v1/restaurantes?slug=eq.${slug}&select=nombre,foto_fachada_url,descripcion_corta&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      const restaurantes = await restRes.json();
      
      if (restaurantes && restaurantes.length > 0) {
        const restaurante = restaurantes[0];
        
        // 3. Inyectar Meta Tags SEO
        const title = `${restaurante.nombre} | Pide en línea`;
        const description = restaurante.descripcion_corta || `Explora el menú de ${restaurante.nombre} y pide rápido y fácil en línea.`;
        const image = restaurante.foto_fachada_url || '';

        const metaTags = `
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/menu/${slug}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
        `;

        // Reemplazar el cierre del head
        html = html.replace('</head>', `${metaTags}\n</head>`);
      }
    }

    // 4. Servir la página con caché de 5 minutos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    // Si falla, redirigir al home de forma segura
    res.redirect('/');
  }
}
