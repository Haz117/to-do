// createAdminUser.js - Crear usuarios de prueba en Firestore
// Ejecuta: node createAdminUser.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc } from 'firebase/firestore';

// CONFIGURACIÓN FIREBASE - Usar variables de entorno en producción
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "infra-sublime-464215-m5.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "infra-sublime-464215-m5",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "205062729291",
  appId: process.env.FIREBASE_APP_ID || "1:205062729291:web:da314180f361bf2a3367ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// CREDENCIALES ENCRIPTADAS - NO MODIFICAR
// Para ver las credenciales originales, ejecuta: node utils/encryptCredentials.js
const ENCRYPTED_CREDS = {
  admin: {
    email: "ZmI2ZjI3NzA1NzM1NjlkZTBlYjM4ZGYwYTU3OTM3Zjk6MmEyNWEyZWU4ODM5ZGVlYWNlZGVhYTM1MzU2NzgwMTM=",
    password: "MGUwNGY3NmY3Y2NmOTMxNTU5NzRmODAzZTRjZjcxYTY6YmQwNDA0ZGIwMDAwNzk0ZGU2ZjFiNGM0Y2MyZTBmZmE=",
    displayName: 'Administrador',
    role: 'admin',
    department: null
  },
  operativo: {
    email: "N2U1OThlMTI4OWI3ZTk2MGZlZTVhOGJlMjgxYzVhYWM6ZTEzZmFiZTc5NDU3ODhlYTdmN2RlOWY5ODZiNTE1NWMxZGVmODlkNWY5OGM1NTUwZTc1Y2Y1MjhjMTFlYjI5NQ==",
    password: "ODQ4NzhhZjlkZDhmYzE5ZDg5Y2Y5NjRkNDM0YzUxMmI6ZGFjNzZiZjBiOWMyMjQ4ZWM4ZWI5ZWI0MmUwMzkxZTM=",
    displayName: 'Juan Pérez',
    role: 'operativo',
    department: 'juridica'
  }
};

// Función de desencriptación
const decryptCred = (encrypted) => {
  const crypto = await import('crypto');
  const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
  const [ivHex, encryptedData] = decoded.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.createHash('sha256').update(process.env.CREDENTIALS_KEY || 'T0D0_4PP_M4ST3R_K3Y_2026_S3CUR3_V3RS10N').digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const users = Object.keys(ENCRYPTED_CREDS).map(key => ({
  email: ENCRYPTED_CREDS[key].email,
  password: ENCRYPTED_CREDS[key].password,
  displayName: ENCRYPTED_CREDS[key].displayName,
  role: ENCRYPTED_CREDS[key].role,
  department: ENCRYPTED_CREDS[key].department,
  _encrypted: true
}));

async function createUsers() {
  console.log('\n🔥 Creando usuarios en Firestore...\n');
  
  for (const user of users) {
    try {
      // Verificar si ya existe
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      const hash = simpleHash(user.password + user.email);
      
      if (!querySnapshot.empty) {
        console.log(`⚠️  ${user.email} ya existe. Actualizando...`);
        const docRef = querySnapshot.docs[0].ref;
        await setDoc(docRef, {
          email: user.email,
          password: hash,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          active: true,
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✅ ${user.email} actualizado`);
      } else {
        // Crear nuevo
        await addDoc(usersRef, {
          email: user.email,
          password: hash,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          active: true,
          createdAt: new Date()
        });
        console.log(`✅ ${user.email} creado`);
      }
      
      console.log(`   Password: ${user.password}`);
      console.log(`   Hash: ${hash}\n`);
      
    } catch (error) {
      console.error(`❌ Error con ${user.email}:`, error.message);
    }
  }
  
  console.log('[COMPLETE] Proceso completado\n');
  process.exit(0);
}

createUsers();
