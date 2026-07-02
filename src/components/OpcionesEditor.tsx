import { useState } from 'react'
import { Plus, Trash2, X, ChevronLeft, Settings2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Opcion {
  nombre: string
  precio_extra: number
}

interface GrupoOpciones {
  titulo: string
  requerido: boolean
  maximo_selecciones: number
  opciones: Opcion[]
}

interface OpcionesEditorProps {
  opciones: GrupoOpciones[]
  onChange: (opciones: GrupoOpciones[]) => void
  onClose: () => void
}

export function OpcionesEditor({ opciones, onChange, onClose }: OpcionesEditorProps) {
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | 'new' | null>(null)
  
  // Local state for the group currently being edited
  const [currentGroup, setCurrentGroup] = useState<GrupoOpciones>({
    titulo: '',
    requerido: false,
    maximo_selecciones: 1,
    opciones: []
  })

  const openNewGroup = () => {
    setCurrentGroup({
      titulo: '',
      requerido: false,
      maximo_selecciones: 1,
      opciones: []
    })
    setEditingGroupIndex('new')
  }

  const openEditGroup = (index: number) => {
    // Make a deep copy to avoid mutating the original until saved
    setCurrentGroup(JSON.parse(JSON.stringify(opciones[index])))
    setEditingGroupIndex(index)
  }

  const deleteGroup = (index: number) => {
    const newOps = [...opciones]
    newOps.splice(index, 1)
    onChange(newOps)
  }

  const saveCurrentGroup = () => {
    if (!currentGroup.titulo.trim()) return; // Validation: needs title
    
    // Filter out empty options
    const cleanedGroup = {
      ...currentGroup,
      opciones: currentGroup.opciones.filter(op => op.nombre.trim() !== '')
    }

    const newOps = [...opciones]
    if (editingGroupIndex === 'new') {
      newOps.push(cleanedGroup)
    } else if (typeof editingGroupIndex === 'number') {
      newOps[editingGroupIndex] = cleanedGroup
    }
    
    onChange(newOps)
    setEditingGroupIndex(null)
  }

  // --- RENDERING DETALLE DE GRUPO (STEP 2) ---
  if (editingGroupIndex !== null) {
    const isVariante = currentGroup.requerido && currentGroup.maximo_selecciones === 1;
    const isExtra = !currentGroup.requerido && currentGroup.maximo_selecciones > 1;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <button 
            type="button" 
            onClick={() => setEditingGroupIndex(null)}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {editingGroupIndex === 'new' ? 'Nuevo Grupo' : 'Editar Grupo'}
            </h3>
            <p className="text-sm text-slate-500">Configura las opciones que el cliente podrá elegir.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pb-20 px-1">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre del Grupo</label>
              <input 
                autoFocus
                type="text" 
                placeholder="Ej. Elige tu bebida, Extras, Sabores..." 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white" 
                value={currentGroup.titulo} 
                onChange={e => setCurrentGroup({ ...currentGroup, titulo: e.target.value })} 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Selección</label>
              <div className="flex flex-col sm:flex-row gap-2 bg-slate-100/80 p-1.5 rounded-xl w-full">
                <button
                  type="button"
                  onClick={() => setCurrentGroup({ ...currentGroup, requerido: true, maximo_selecciones: 1 })}
                  className={`flex-1 px-4 py-3 text-sm font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                    isVariante ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <span>◉ Obligatorio</span>
                  <span className="text-[10px] opacity-80 font-medium">Debe elegir 1 sola opción</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentGroup({ ...currentGroup, requerido: false, maximo_selecciones: 10 })}
                  className={`flex-1 px-4 py-3 text-sm font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                    isExtra ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <span>☑ Opcional</span>
                  <span className="text-[10px] opacity-80 font-medium">Puede elegir varias o ninguna</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Opciones disponibles</label>
              <button 
                type="button" 
                onClick={() => {
                  const newOps = [...currentGroup.opciones, { nombre: '', precio_extra: 0 }];
                  setCurrentGroup({ ...currentGroup, opciones: newOps });
                }} 
                className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Añadir fila
              </button>
            </div>

            <motion.div layout className="space-y-3">
              <AnimatePresence>
                {currentGroup.opciones.map((opc, oIndex) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={`opc-${oIndex}`} 
                    className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-colors"
                  >
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Ej. Mango Habanero" 
                        className="w-full px-3 py-2 border-none bg-transparent rounded-lg text-sm font-semibold outline-none focus:bg-slate-50 focus:ring-2 focus:ring-blue-100 transition-all" 
                        value={opc.nombre} 
                        onChange={e => {
                          const newOps = [...currentGroup.opciones];
                          newOps[oIndex].nombre = e.target.value;
                          setCurrentGroup({ ...currentGroup, opciones: newOps });
                        }} 
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                      <span className="text-slate-400 font-medium text-sm">+$</span>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder="0.00" 
                        className="w-16 border-none bg-transparent text-sm font-bold text-slate-800 outline-none text-right" 
                        value={opc.precio_extra || ''} 
                        onChange={e => {
                          const newOps = [...currentGroup.opciones];
                          newOps[oIndex].precio_extra = parseFloat(e.target.value) || 0;
                          setCurrentGroup({ ...currentGroup, opciones: newOps });
                        }} 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newOps = [...currentGroup.opciones];
                        newOps.splice(oIndex, 1);
                        setCurrentGroup({ ...currentGroup, opciones: newOps });
                      }} 
                      className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {currentGroup.opciones.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200"
                >
                  <p className="text-sm text-slate-500">Aún no hay opciones en este grupo.</p>
                  <button 
                    type="button" 
                    onClick={() => {
                      const newOps = [...currentGroup.opciones, { nombre: '', precio_extra: 0 }];
                      setCurrentGroup({ ...currentGroup, opciones: newOps });
                    }} 
                    className="text-xs font-bold text-blue-600 mt-2 hover:underline"
                  >
                    Agrega la primera opción
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-auto shrink-0 flex gap-3 bg-white">
          <button 
            type="button"
            onClick={() => setEditingGroupIndex(null)}
            className="flex-1 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={saveCurrentGroup}
            disabled={!currentGroup.titulo.trim()}
            className="flex-[2] py-4 font-black text-white bg-slate-900 hover:bg-blue-600 shadow-xl shadow-slate-900/20 hover:shadow-blue-600/30 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            Guardar Grupo
          </button>
        </div>
      </motion.div>
    )
  }

  // --- RENDERING RESUMEN DE GRUPOS (STEP 1) ---
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings2 className="text-blue-500" />
            Configurar Opciones
          </h3>
          <p className="text-sm text-slate-500 mt-1">Administra variantes y extras de este producto.</p>
        </div>
        <button 
          type="button" 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
        >
          <X size={20} className="stroke-[2.5px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20 px-1">
        <AnimatePresence>
          {opciones.map((grupo, gIndex) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: gIndex * 0.05 }}
              key={`grupo-${gIndex}`} 
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 flex flex-col sm:flex-row sm:items-center gap-4 group transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="font-bold text-slate-900 text-base truncate">{grupo.titulo}</h4>
                  {grupo.requerido && grupo.maximo_selecciones === 1 ? (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md border border-orange-100 shrink-0">Obligatorio</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">Opcional</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {grupo.opciones.slice(0, 3).map((opc, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {opc.nombre} {opc.precio_extra > 0 && <span className="text-emerald-600">(+${opc.precio_extra})</span>}
                    </span>
                  ))}
                  {grupo.opciones.length > 3 && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      +{grupo.opciones.length - 3} más
                    </span>
                  )}
                  {grupo.opciones.length === 0 && (
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                      Sin opciones configuradas
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0 border-slate-100 w-full sm:w-auto">
                <button 
                  type="button" 
                  onClick={() => openEditGroup(gIndex)}
                  className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-sm rounded-xl transition-all"
                >
                  Editar
                </button>
                <button 
                  type="button" 
                  onClick={() => deleteGroup(gIndex)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {opciones.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
          >
            <div className="w-16 h-16 mx-auto bg-white shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
              <Settings2 size={24} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Personaliza tu platillo</h4>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">Agrega variantes obligatorias (ej. tamaños) o ingredientes extras opcionales con costo adicional.</p>
            <button 
              type="button"
              onClick={openNewGroup}
              className="px-6 py-3.5 bg-white border border-slate-200 shadow-sm text-slate-800 font-bold rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <Plus size={18} /> Crear el primer grupo
            </button>
          </motion.div>
        )}
      </div>

      {opciones.length > 0 && (
        <div className="pt-4 border-t border-slate-100 mt-auto shrink-0 flex gap-3 bg-white">
          <button 
            type="button"
            onClick={openNewGroup}
            className="flex-1 py-4 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Añadir otro grupo
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 font-black text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 rounded-xl transition-all active:scale-[0.98]"
          >
            Terminar
          </button>
        </div>
      )}
    </motion.div>
  )
}
