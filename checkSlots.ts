import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkSlots() {
  const m = await getDoc(doc(db, 'delivery_slots', 'miercoles'));
  const v = await getDoc(doc(db, 'delivery_slots', 'viernes'));
  
  console.log('Miércoles:', m.data());
  console.log('Viernes:', v.data());
  
  process.exit(0);
}

checkSlots();
