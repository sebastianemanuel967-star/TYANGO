import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Función para resetear los contadores de slots de entrega.
 * Se puede ejecutar con: npx tsx resetSlots.ts
 */
async function resetDeliverySlots() {
  console.log('--- Iniciando reseteo de slots de entrega ---');
  
  const batch = writeBatch(db);

  const miercolesRef = doc(db, 'delivery_slots', 'miercoles');
  const viernesRef = doc(db, 'delivery_slots', 'viernes');

  // Datos para Miércoles - Establecemos 22 cupos disponibles (50 - 28 = 22)
  batch.set(miercolesRef, {
    cuposTotal: 50,
    cuposUsados: 28,
    soldOut: false,
    activo: true
  });

  // Datos para Viernes - Establecemos 33 disponibles (50 - 17 = 33)
  batch.set(viernesRef, {
    cuposTotal: 50,
    cuposUsados: 17,
    soldOut: false,
    activo: true
  });

  try {
    await batch.commit();
    console.log('✅ ÉXITO: Los slots han sido reseteados.');
    console.log('Miércoles: 50 total, 28 usados -> 22 disponibles.');
    console.log('Viernes: 50 total, 17 usados -> 33 disponibles.');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR al resetear slots:', error);
    process.exit(1);
  }
}

resetDeliverySlots();
