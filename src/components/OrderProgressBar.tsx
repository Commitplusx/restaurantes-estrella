import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, ChefHat, Truck, Package, XCircle } from 'lucide-react';

export type OrderStatus = 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado' | 'rechazado' | 'asignado' | 'recibido';

interface StepDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface OrderProgressBarProps {
  currentStatus: OrderStatus;
  // Permite sobreescribir los pasos dependiendo del tipo de pedido (ej: domicilio vs local)
  customSteps?: StepDef[];
}

// Diccionario por defecto (Flujo típico de Domicilio)
// Mapeamos los estados de Supabase a los pasos visuales
const defaultSteps: StepDef[] = [
  { id: 'asignado', label: 'Aceptado', icon: <Clock size={20} /> },
  { id: 'recibido', label: 'Recibido', icon: <ChefHat size={20} /> },
  { id: 'en_camino', label: 'En Camino', icon: <Truck size={20} /> },
  { id: 'entregado', label: 'Entregado', icon: <Package size={20} /> }
];

export function OrderProgressBar({ currentStatus, customSteps }: OrderProgressBarProps) {
  const steps = customSteps || defaultSteps;
  
  // Normalizar el estado actual a los IDs visuales
  // Si Supabase dice 'pendiente' o 'pagado', lo pintamos en el primer paso ('asignado')
  let normalizedStatus = currentStatus as string;
  if (['pendiente', 'pagado'].includes(currentStatus)) {
    normalizedStatus = 'asignado';
  }

  const isException = ['cancelado', 'rechazado'].includes(currentStatus);

  // Encontrar el índice del estado actual en el flujo
  const currentIndex = steps.findIndex(s => s.id === normalizedStatus);
  
  // Si no se encuentra (ej. estado raro), asumimos que está en el paso 0
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Calculamos porcentaje de la línea
  let progressPercentage = 0;
  if (isException) {
    progressPercentage = (activeIndex / (steps.length - 1)) * 100;
  } else {
    progressPercentage = (activeIndex / (steps.length - 1)) * 100;
  }

  return (
    <div className="w-full py-6">
      {isException && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg flex items-center justify-center gap-2 font-semibold">
          <XCircle size={20} />
          <span>Pedido {currentStatus === 'rechazado' ? 'Rechazado' : 'Cancelado'}</span>
        </div>
      )}

      <div className="relative flex justify-between items-center mb-6 px-2">
        {/* Línea de fondo */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
        
        {/* Línea de progreso animada */}
        <div 
          className={`absolute top-1/2 left-[10%] h-1 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out ${isException ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${progressPercentage * 0.8}%` }} // 0.8 porque left y right son 10%
        />

        {/* Círculos de los pasos */}
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isPending = index > activeIndex;

          let bgColor = 'bg-white border-2 border-gray-200 text-gray-400';
          if (isCompleted) {
            bgColor = isException ? 'bg-red-500 text-white border-2 border-red-500' : 'bg-emerald-500 text-white border-2 border-emerald-500';
          } else if (isActive) {
            if (isException) {
              bgColor = 'bg-red-500 text-white border-2 border-red-500 ring-4 ring-red-100';
            } else {
              bgColor = 'bg-emerald-500 text-white border-2 border-emerald-500 ring-4 ring-emerald-100';
            }
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div 
                initial={false}
                animate={{ scale: isActive ? 1.2 : 1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${bgColor}`}
              >
                {isCompleted ? <Check size={20} /> : step.icon}
              </motion.div>
              <div className="absolute -bottom-6 whitespace-nowrap">
                <span className={`text-xs font-bold transition-colors duration-500 ${isActive ? (isException ? 'text-red-600' : 'text-emerald-600') : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
