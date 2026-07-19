const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'PublicMenuView.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Reemplazar onClick del botón
content = content.replace(
  'onClick={() => setIsCartOpen(true)}',
  'onClick={() => navigate(`/menu/${id}/carrito`)}'
);

// 2. Borrar el Drawer (de {/* Drawer de Carrito y modal de opciones */} hasta antes de {/* MODAL DE OPCIONES — WIZARD PASO A PASO */})
const drawerStartRegex = /\{\/\* Drawer de Carrito y modal de opciones \*\/\}/;
const drawerEndRegex = /\{\/\* MODAL DE OPCIONES — WIZARD PASO A PASO \*\/\}/;

const drawerMatch1 = content.match(drawerStartRegex);
const drawerMatch2 = content.match(drawerEndRegex);

if (drawerMatch1 && drawerMatch2) {
  const startIdx = drawerMatch1.index;
  const endIdx = drawerMatch2.index;
  content = content.slice(0, startIdx) + content.slice(endIdx);
  console.log('Drawer eliminado');
}

// 3. Borrar Modal del Mapa y OTP (de {/* MODAL DEL MAPA (FULL SCREEN) ESTILO RAPPI */} hasta el penultimo cierre de div)
const mapStartRegex = /\{\/\* MODAL DEL MAPA \(FULL SCREEN\) ESTILO RAPPI \*\/\}/;
// El modal OTP termina antes del ultimo </div> de la página
// Busquemos el inicio del mapa, y cortamos hasta el penultimo </div>
const mapMatch = content.match(mapStartRegex);
if (mapMatch) {
  const startIdx = mapMatch.index;
  // Encontrar el último return de la funcion
  const endMarker = '    </div>\n  )\n}\n';
  const lastDivIdx = content.lastIndexOf(endMarker);
  
  if (lastDivIdx !== -1 && startIdx < lastDivIdx) {
    content = content.slice(0, startIdx) + '\n' + content.slice(lastDivIdx);
    console.log('Modales de Mapa y OTP eliminados');
  }
}

// 4. Escribir archivo final
fs.writeFileSync(file, content, 'utf8');
console.log('PublicMenuView.tsx actualizado exitosamente');
