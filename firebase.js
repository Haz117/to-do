// firebase.js
// Configuración mínima para Firebase v9 modular + helper para Firestore
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configuración de Firebase - USAR SOLO VARIABLES DE ENTORNO
// NO colocar credenciales aquí por seguridad
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || extra.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || extra.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || extra.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || extra.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || extra.FIREBASE_MEASUREMENT_ID
};

// Intentamos obtener valores inyectados por app.config.js (expo) o desde process.env
const extra = Constants.expoConfig?.extra || {};

if (!firebaseConfig.apiKey) {
  throw new Error('❌ FIREBASE_API_KEY no configurada. Agrega las variables de entorno.');
}

const firebaseConfigResolved = firebaseConfig;

// Inicializar Firebase App (solo si no existe)
const app = getApps().length === 0 ? initializeApp(firebaseConfigResolved) : getApps()[0];

// Inicializar Firestore
const db = getFirestore(app);

// Exportar solo app y db (auth se crea bajo demanda en services/auth.js)
export { app, db };

// Helper: timestamp de servidor (útil para mensajes)
export const getServerTimestamp = () => serverTimestamp();
