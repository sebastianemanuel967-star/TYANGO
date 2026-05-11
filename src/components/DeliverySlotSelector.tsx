import { motion } from "motion/react";
import { useDeliverySlots, SlotInfo } from "../hooks/useDeliverySlots";
import { CheckCircle2, X } from "lucide-react";

interface Props {
  selectedSlot: string | null;
  onSelect: (dia: "miercoles" | "viernes") => void;
}

export const DeliverySlotSelector = ({ selectedSlot, onSelect }: Props) => {
  const { slots, loading } = useDeliverySlots();

  if (loading) {
    return (
      <div className="space-y-3">
        {[0,1].map(i => (
          <div key={i} className="h-20 animate-pulse bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  const formatFecha = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-EC', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      timeZone: 'America/Guayaquil'
    });
  };

  return (
    <div className="space-y-3">
      {(["miercoles", "viernes"] as const).map((dia) => {
        const slot = slots[dia] as SlotInfo;
        if (!slot) return null;
        
        const isSelected = selectedSlot === dia;
        const pct = ((slot.cuposTotal - slot.cuposRestantes) / slot.cuposTotal) * 100;
        const urgente = slot.cuposRestantes <= 10 && !slot.soldOut;
        const muyUrgente = slot.cuposRestantes <= 5 && !slot.soldOut;

        return (
          <motion.button
            key={dia}
            whileHover={slot.soldOut ? {} : { scale: 1.01 }}
            whileTap={slot.soldOut ? {} : { scale: 0.99 }}
            onClick={() => !slot.soldOut && onSelect(dia)}
            disabled={slot.soldOut}
            className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
              slot.soldOut
                ? "bg-white/[0.02] border-white/5 opacity-60 cursor-not-allowed"
                : isSelected
                  ? "bg-purple-600/20 border-purple-500/60 shadow-lg shadow-purple-600/10"
                  : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            {/* SOLD OUT overlay */}
            {slot.soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-full">
                  <X size={12} className="text-red-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                    Sold Out — Próxima semana
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black uppercase tracking-tight text-white">
                    {slot.label}
                  </span>
                  {muyUrgente && (
                    <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-[8px] font-black uppercase tracking-widest text-red-400 animate-pulse">
                      ¡Últimos!
                    </span>
                  )}
                  {urgente && !muyUrgente && (
                    <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-[8px] font-black uppercase tracking-widest text-orange-400">
                      Pocos cupos
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-white/40 capitalize">
                  {formatFecha(slot.fecha)} · desde las 12:00pm
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {!slot.soldOut && (
                  <div className="text-right">
                    <div className={`text-lg font-black ${muyUrgente ? 'text-red-400' : urgente ? 'text-orange-400' : 'text-purple-400'}`}>
                      {slot.cuposRestantes}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-white/20">cupos</div>
                  </div>
                )}
                {isSelected && !slot.soldOut && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <CheckCircle2 size={20} className="text-purple-400" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Barra de progreso de cupos */}
            {!slot.soldOut && (
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    muyUrgente ? 'bg-red-500' : urgente ? 'bg-orange-500' : 'bg-purple-500'
                  }`}
                />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
