const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'CartPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Añadir getSmartDenominations
const totalCalcIndex = content.indexOf('const rawTotal =');
if (totalCalcIndex !== -1 && !content.includes('getSmartDenominations')) {
  const insertIndex = content.lastIndexOf('\n', totalCalcIndex);
  const insertCode = `
  const getSmartDenominations = (totalAmount: number) => {
    const exact = Math.ceil(totalAmount);
    let options = [exact];
    const next50 = Math.ceil(totalAmount / 50) * 50;
    if (next50 > exact) options.push(next50);
    const next100 = Math.ceil(totalAmount / 100) * 100;
    if (next100 > exact && !options.includes(next100)) options.push(next100);
    for (let bill of [200, 500, 1000]) {
      if (bill > totalAmount && !options.includes(bill) && options.length < 3) {
        options.push(bill);
      }
    }
    while (options.length < 3) {
       options.push(options[options.length - 1] + 100);
    }
    return options.slice(0, 3);
  };
  const smartDenominations = getSmartDenominations(total);
`;
  content = content.slice(0, insertIndex) + insertCode + content.slice(insertIndex);
}

// 2. Stepper a 3 pasos
content = content.replace('{[1, 2, 3, 4, 5].map(step => (', '{[1, 2, 3].map(step => (');
content = content.replace('style={{ width: `${((checkoutStep - 1) / 4) * 100}%` }}', 'style={{ width: `${((checkoutStep - 1) / 2) * 100}%` }}');
content = content.replace('checkoutStep === 5 ?', 'checkoutStep === 4 ?'); // para ocultar el caso especial si existiera, aunque lo quitaremos
content = content.replace('const isStepValid = () => {', 'const isStepValid = () => {\\n    if (checkoutStep === 3) return (tipoEntrega === \\'tienda\\' || (tipoEntrega === \\'domicilio\\' && ubicacionGPS && !fueraDeCobertura && !calculandoEnvio)) && metodoPago !== null && (metodoPago !== \\'efectivo\\' || parseFloat(montoEfectivo || \\'0\\') >= total);');

// 3. Modificar getBotonText
content = content.replace(
  "if (checkoutStep === 2) return 'Continuar a Entrega';",
  "if (checkoutStep === 2) return 'Continuar a Entrega y Pago';"
);
content = content.replace(
  "if (checkoutStep === 3) return 'Ir a Método de Pago';",
  ""
);

// 4. Integrar Pago (Step 4) y Totales (Step 5) dentro del Step 3
// Primero borramos el cierre del step 3 y la apertura del 4
content = content.replace(
  '            </motion.div>\n          )}\n\n          {/* PASO 4: MÉTODO DE PAGO */}\n          {checkoutStep === 4 && (\n            <motion.div key="step4" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">',
  '                {/* SECCIÓN DE PAGO (Antes Paso 4) */}'
);

// Borramos el cierre del step 4 y la apertura del 5
content = content.replace(
  '            </motion.div>\n          )}\n          {/* PASO 5: REVISIÓN FINAL */}\n          {checkoutStep === 5 && (\n            <motion.div key="step5" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">',
  '                {/* SECCIÓN DE REVISIÓN FINAL (Antes Paso 5) */}'
);

// 5. Reemplazar UI de Efectivo con Botones Inteligentes
const inputEfectivoHtml = `<div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                           <label className="text-xs font-bold text-green-800 mb-2 block uppercase tracking-wide">¿Con qué billete pagas?</label>
                           <input type="number" placeholder={\`Ej. \${Math.ceil(total / 100) * 100}\`} value={montoEfectivo} onChange={e => setMontoEfectivo(e.target.value)} className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-black text-lg shadow-sm transition-all" />
                           <p className="text-[10px] text-green-600 mt-2">Para llevarte el cambio exacto.</p>
                         </div>`;

const smartButtonsHtml = `<div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                           <label className="text-xs font-bold text-green-800 mb-2 block uppercase tracking-wide">¿Con cuánto pagas?</label>
                           <div className="flex gap-2">
                             {smartDenominations.map((denom, idx) => (
                               <button 
                                 key={idx}
                                 onClick={() => setMontoEfectivo(denom.toString())}
                                 className={\`flex-1 py-3 rounded-xl border-2 font-black transition-all \${montoEfectivo === denom.toString() ? 'bg-green-500 text-white border-green-600 shadow-md scale-[1.02]' : 'bg-white text-green-700 border-green-200 hover:border-green-300'}\`}
                               >
                                 \${denom.toFixed(2)}
                                 {idx === 0 && <span className="block text-[9px] font-bold opacity-80 uppercase leading-none mt-0.5">Exacto</span>}
                               </button>
                             ))}
                           </div>
                           <p className="text-[10px] text-green-600 mt-2">Para llevarte el cambio exacto.</p>
                         </div>`;
content = content.replace(inputEfectivoHtml, smartButtonsHtml);

// 6. Botón Fijo Inferior: Si es paso 3, mostrar Pagar
content = content.replace(
  '{checkoutStep < 5 ? (',
  '{checkoutStep < 3 ? ('
);

content = content.replace(
  "if (checkoutStep === 3 && (!tipoEntrega || (tipoEntrega === 'domicilio' && (!direccionEntrega || fueraDeCobertura)))) {\n                  showToast('Error', 'Completa los datos de entrega', 'error');\n                  return;\n                }\n                if (checkoutStep === 4 && metodoPago === 'efectivo') {\n                  const montoInt = parseFloat(montoEfectivo || '0');\n                  if (montoInt < total) {\n                    showToast('Error', `El monto debe ser mayor o igual al total ($${total.toFixed(2)})`, 'error');\n                    return;\n                  }\n                }\n                setCheckoutStep(checkoutStep + 1);",
  "setCheckoutStep(checkoutStep + 1);"
);

// Guardar
fs.writeFileSync(file, content, 'utf8');
console.log('CartPage.tsx actualizado exitosamente para 3 pasos');
