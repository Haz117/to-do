// firebase.js
// Configuración mínima para Firebase v9 modular + helper para Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configuración de Firebase (fallback si las variables de entorno no están disponibles)
const firebaseConfig = {
  apiKey: "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "205062729291",
  appId: "1:205062729291:web:da314180f361bf2a3367ce",
  measurementId: "G-T987W215LH"
};

// Intentamos obtener valores inyectados por app.config.js (expo) o desde process.env
const extra = Constants.expoConfig?.extra || {};

const firebaseConfigResolved = {
  apiKey: extra.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: extra.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: extra.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: extra.FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: extra.FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

const app = initializeApp(firebaseConfigResolved);
export const db = getFirestore(app);

// Exportar app para uso en otros servicios (auth, storage, etc.)
export { app };

// Helper: timestamp de servidor (útil para mensajes)
export const getServerTimestamp = () => serverTimestamp();
