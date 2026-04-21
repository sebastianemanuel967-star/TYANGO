import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";

export interface SlotInfo {
  dia: "miercoles" | "viernes";
  label: string;
  fecha: Date;
  cuposRestantes: number;
  cuposTotal: number;
  activo: boolean;
  estaAbierto: boolean;
  soldOut: boolean;
}

const getNextDeliveryDays = (): { miercoles: Date; viernes: Date } => {
  const now = new Date();
  const quitoStr = now.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
  const quito = new Date(quitoStr);
  
  const getNext = (targetDay: number): Date => {
    const d = new Date(quito);
    const currentDay = d.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    // If it's already the day but past 10pm, move to next week
    if (daysUntil === 0 && quito.getHours() >= 22) daysUntil = 7;
    d.setDate(d.getDate() + daysUntil);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  return {
    miercoles: getNext(3),
    viernes: getNext(5)
  };
};

const isSlotOpen = (fechaSlot: Date): boolean => {
  const now = new Date();
  const quitoStr = now.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
  const quito = new Date(quitoStr);
  const slotDay = fechaSlot.getDay();
  const currentDay = quito.getDay();
  const currentHour = quito.getHours();
  // Open if it's the delivery day and hour is >= 12pm
  return currentDay === slotDay && currentHour >= 12;
};

export const useDeliverySlots = () => {
  const [slots, setSlots] = useState<Record<string, SlotInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = getNextDeliveryDays();
    
    const unsubMiercoles = onSnapshot(doc(db, "delivery_slots", "miercoles"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fecha = days.miercoles;
        setSlots(prev => ({
          ...prev,
          miercoles: {
            dia: "miercoles",
            label: "Miércoles",
            fecha,
            cuposRestantes: Math.max(0, (data.cuposTotal || 50) - (data.cuposUsados || 0)),
            cuposTotal: data.cuposTotal || 50,
            activo: data.activo !== undefined ? data.activo : true,
            estaAbierto: isSlotOpen(fecha),
            soldOut: (data.cuposUsados || 0) >= (data.cuposTotal || 50)
          }
        }));
      }
      setLoading(false);
    });

    const unsubViernes = onSnapshot(doc(db, "delivery_slots", "viernes"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fecha = days.viernes;
        setSlots(prev => ({
          ...prev,
          viernes: {
            dia: "viernes",
            label: "Viernes",
            fecha,
            cuposRestantes: Math.max(0, (data.cuposTotal || 50) - (data.cuposUsados || 0)),
            cuposTotal: data.cuposTotal || 50,
            activo: data.activo !== undefined ? data.activo : true,
            estaAbierto: isSlotOpen(fecha),
            soldOut: (data.cuposUsados || 0) >= (data.cuposTotal || 50)
          }
        }));
      }
    });

    return () => {
      unsubMiercoles();
      unsubViernes();
    };
  }, []);

  const reservarCupo = async (dia: "miercoles" | "viernes"): Promise<boolean> => {
    try {
      const slotRef = doc(db, "delivery_slots", dia);
      let exito = false;
      
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        // If it doesn't exist, we can't reserve. Admin needs to reset first.
        if (!slotDoc.exists()) throw new Error("Slot no existe");
        
        const data = slotDoc.data();
        if ((data.cuposUsados || 0) >= (data.cuposTotal || 50)) {
          throw new Error("SOLD_OUT");
        }
        
        transaction.update(slotRef, {
          cuposUsados: (data.cuposUsados || 0) + 1
        });
        exito = true;
      });
      
      return exito;
    } catch (e: any) {
      console.error("Error reservando cupo:", e);
      return false;
    }
  };

  const nextAvailable = (): SlotInfo | null => {
    const available = Object.values(slots).filter((s: SlotInfo) => !s.soldOut && s.activo);
    if (available.length === 0) return null;
    return available.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())[0] as SlotInfo;
  };

  return { slots, loading, reservarCupo, nextAvailable };
};
