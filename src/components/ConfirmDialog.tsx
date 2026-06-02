import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Eliminar",
  isDanger = true,
  showCancel = true
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDanger?: boolean;
  showCancel?: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
      />
      
      {/* Drawer / Modal */}
      <div 
        className={`relative w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl transition-transform duration-300 transform sm:mx-auto
          ${isOpen ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:scale-95'}
        `}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        
        <div className="flex items-start gap-5 mb-8">
          <div className={`p-4 rounded-[1.5rem] shrink-0 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
            {isDanger ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className="flex-1 mt-1">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {showCancel && (
            <button 
              onClick={onCancel}
              className="w-full px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-[0.98]"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={() => { onConfirm(); onCancel(); }}
            className={`w-full px-6 py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-[0.98]
              ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
