import { useState, useEffect } from 'react'
import { Plus, Store, MapPin, Phone, Trash2, Loader2, AlertCircle, Pencil, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { Autocomplete, useLoadScript } from '@react-google-maps/api'

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export function SucursalesView({ restaurante }: { restaurante: Restaurante }) {
  const [sucursales, setSucursales] = useState<Restaurante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Formulario modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autocompleteRef, setAutocompleteRef] = useState<google.maps.places.Autocomplete | null>(null);

  // Edición de coordenadas y nombre de sucursal
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCoords, setEditCoords] = useState('')
  const [editNombreSucursal, setEditNombreSucursal] = useState('')
  const [savingCoords, setSavingCoords] = useState(false)

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const onPlaceChanged = () => {
    if (autocompleteRef !== null) {
      const place = autocompleteRef.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setFormData(prev => ({
          ...prev,
          direccion: place.formatted_address || place.name || prev.direccion,
          coordenadas: `${lat}, ${lng}`
        }));
      }
    }
  };
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    coordenadas: ''
  })

  useEffect(() => {
    loadSucursales()
  }, [])

  useEffect(() => {
    if (isLoaded && formData.coordenadas && window.google) {
      const parts = formData.coordenadas.split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          // Solo autocompletar si no han puesto dirección o si dice "GPS:"
          if (!formData.direccion || formData.direccion.startsWith('GPS:')) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                // Tratar de buscar el componente de barrio o ruta corta si prefieren
                let shortAddress = results[0].formatted_address;
                const components = results[0].address_components;
                
                // Intentar buscar colonia, barrio, o calle
                const sublocality = components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
                const route = components.find(c => c.types.includes('route'));
                
                if (sublocality) {
                   shortAddress = sublocality.long_name;
                   if (route) {
                     shortAddress = `${route.long_name}, ${sublocality.long_name}`;
                   }
                } else if (route) {
                   shortAddress = route.long_name;
                }
                
                setFormData(prev => ({
                  ...prev,
                  direccion: shortAddress
                }));
              }
            });
          }
        }
      }
    }
  }, [formData.coordenadas, isLoaded]);

  const loadSucursales = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('matriz_id', restaurante.id)
        .order('creado_en', { ascending: true })

      if (error) throw error
      setSucursales(data || [])
    } catch (e: any) {
      console.error(e)
      setError('No se pudieron cargar las sucursales.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Extraer lat y lng del string de coordenadas (separado por coma)
    let parsedLat = null;
    let parsedLng = null;
    if (formData.coordenadas) {
      const parts = formData.coordenadas.split(',');
      if (parts.length >= 2) {
        parsedLat = parseFloat(parts[0].trim());
        parsedLng = parseFloat(parts[1].trim());
      } else {
        parsedLat = parseFloat(formData.coordenadas.trim());
      }
    }

    try {
      const nuevaSucursal: any = {
        admin_id: (restaurante as any).admin_id,
        nombre: formData.nombre,
        telefono: formData.telefono,
        direccion: formData.direccion,
        lat: parsedLat || null,
        lng: parsedLng || null,
        matriz_id: restaurante.id,
        es_matriz: false,
        foto_fachada_url: restaurante.foto_fachada_url,
        logo_url: restaurante.logo_url,
        descripcion_corta: restaurante.descripcion_corta,
        categorias: restaurante.categorias,
        perfil_completo: true,
        activo: true
      }

      const { error } = await supabase
        .from('restaurantes')
        .insert([nuevaSucursal])

      if (error) throw error
      
      // Asegurarse de que el padre esté marcado como matriz
      if (!restaurante.es_matriz) {
        await supabase
          .from('restaurantes')
          .update({ es_matriz: true })
          .eq('id', restaurante.id)
      }

      await loadSucursales()
      setIsModalOpen(false)
      setFormData({ nombre: '', telefono: '', direccion: '', coordenadas: '' })
    } catch (e: any) {
      console.error(e)
      setError('Error al crear la sucursal.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta sucursal?')) return
    
    try {
      const { error } = await supabase
        .from('restaurantes')
        .delete()
        .eq('id', id)
        
      if (error) throw error
      await loadSucursales()
    } catch (e) {
      console.error(e)
      alert('Error al eliminar')
    }
  }

  const handleUpdateCoords = async () => {
    if (!editingId) return;
    setSavingCoords(true);
    
    let lat: number | null = null;
    let lng: number | null = null;
    
    if (editCoords.trim()) {
      const parts = editCoords.split(',');
      if (parts.length >= 2) {
        lat = parseFloat(parts[0].trim());
        lng = parseFloat(parts[1].trim());
      }
      if (lat === null || Number.isNaN(lat) || lng === null || Number.isNaN(lng)) {
        alert('Las coordenadas no tienen el formato correcto (lat, lng)');
        setSavingCoords(false);
        return;
      }
    }
    
    try {
      const { error } = await supabase
        .from('restaurantes')
        .update({ lat, lng, nombre_sucursal: editNombreSucursal.trim() || null })
        .eq('id', editingId);
      if (error) throw error;
      await loadSucursales();
      setEditingId(null);
      setEditCoords('');
      setEditNombreSucursal('');
    } catch (e) {
      console.error(e);
      alert('Error al actualizar sucursal');
    } finally {
      setSavingCoords(false);
    }
  };

  // Componente interno: muestra colonia/calle si tiene coordenadas, si no la dirección escrita
  const DireccionDisplay = ({ sucursal }: { sucursal: Restaurante }) => {
    const [label, setLabel] = useState<string | null>(null);

    useEffect(() => {
      if (sucursal.lat && sucursal.lng && isLoaded && window.google) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: sucursal.lat, lng: sucursal.lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const components = results[0].address_components;
            const sublocality = components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
            const route = components.find(c => c.types.includes('route'));
            if (sublocality) {
              setLabel(route ? `${route.long_name}, ${sublocality.long_name}` : sublocality.long_name);
            } else if (route) {
              setLabel(route.long_name);
            } else {
              setLabel(sucursal.direccion || 'Sin dirección registrada');
            }
          } else {
            setLabel(sucursal.direccion || 'Sin dirección registrada');
          }
        });
      } else {
        setLabel(sucursal.direccion || 'Sin dirección registrada');
      }
    }, [sucursal.lat, sucursal.lng]);

    return <span>{label ?? '...'}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Tus Ubicaciones</h3>
          <p className="text-slate-500 text-sm mt-1">
            Gestiona las sucursales vinculadas a {restaurante.nombre}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30"
        >
          <Plus size={18} />
          <span>Nueva Sucursal</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : sucursales.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-slate-100">
            <Store size={32} className="text-slate-400" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">No tienes sucursales aún</h4>
          <p className="text-slate-500 max-w-sm mx-auto">
            Todas tus sucursales compartirán el mismo menú y configuraciones de la matriz, pero podrán recibir pedidos independientemente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">

          {/* ── Tarjeta de la Sucursal Principal (la cuenta misma) ── */}
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-800">{restaurante.nombre_sucursal || restaurante.nombre}</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">⭐ Principal</span>
                </div>
                {restaurante.nombre_sucursal && (
                  <p className="text-xs text-slate-400 mt-0.5">Marca: {restaurante.nombre}</p>
                )}
              </div>
              <button
                onClick={() => { setEditingId(restaurante.id); setEditCoords(restaurante.lat && restaurante.lng ? `${restaurante.lat}, ${restaurante.lng}` : ''); setEditNombreSucursal(restaurante.nombre_sucursal || ''); }}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Pencil size={15} />
              </button>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <DireccionDisplay sucursal={restaurante} />
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <span>{restaurante.telefono || 'Sin teléfono'}</span>
              </div>
            </div>
          </div>

          {sucursales.map(sucursal => (
            <div key={sucursal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{sucursal.nombre_sucursal || sucursal.nombre}</h4>
                  {sucursal.nombre_sucursal && (
                    <p className="text-xs text-slate-400 mt-0.5">Marca: {sucursal.nombre}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(sucursal.id); setEditCoords(sucursal.lat && sucursal.lng ? `${sucursal.lat}, ${sucursal.lng}` : ''); setEditNombreSucursal(sucursal.nombre_sucursal || ''); }}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(sucursal.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <DireccionDisplay sucursal={sucursal} />
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span>{sucursal.telefono || 'Sin teléfono'}</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sucursal.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {sucursal.activo ? 'Abierto' : 'Cerrado'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {sucursal.id.split('-')[0]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Nueva Sucursal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Agregar Sucursal</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="sucursal-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial de la Sucursal</label>
                  <input
                    required
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej: Tacos El Rey (Sucursal Sur)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono Fijo / Celular</label>
                  <input
                    required
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                    placeholder="Para atención a clientes"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Dirección Completa</label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={setAutocompleteRef}
                      onPlaceChanged={onPlaceChanged}
                      options={{ componentRestrictions: { country: "mx" } }}
                    >
                      <input
                        required
                        value={formData.direccion}
                        onChange={e => setFormData({...formData, direccion: e.target.value})}
                        placeholder="Busca tu dirección..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </Autocomplete>
                  ) : (
                    <textarea
                      required
                      value={formData.direccion}
                      onChange={e => setFormData({...formData, direccion: e.target.value})}
                      placeholder="Calle, Número, Colonia..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Coordenadas (Latitud, Longitud)</label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={formData.coordenadas}
                    onChange={e => setFormData({ ...formData, coordenadas: e.target.value })}
                    placeholder="Ej: 16.2514, -92.1332"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 ml-1">Pega aquí el enlace de coordenadas directamente de Google Maps.</p>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="sucursal-form"
                disabled={saving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Guardar Sucursal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal editar sucursal ── */}
      {editingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-slate-800">Editar Sucursal</h3>
              <button onClick={() => setEditingId(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre de esta sucursal</label>
                <input
                  type="text"
                  value={editNombreSucursal}
                  onChange={e => setEditNombreSucursal(e.target.value)}
                  placeholder="Ej: Belisario, Itaes, Centro..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Solo aparece en el selector de sucursal, no en el listado público.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Coordenadas <span className="font-mono text-slate-400">(lat, lng)</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editCoords}
                  onChange={e => setEditCoords(e.target.value)}
                  placeholder="Ej: 16.2429, -92.1401"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={handleUpdateCoords}
                disabled={savingCoords}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {savingCoords && <Loader2 size={14} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
