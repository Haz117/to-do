// services/auth.js
// Servicio de autenticación con Firebase Auth
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { app } from '../firebase';
import { createUserProfile } from './roles';

const auth = getAuth(app);

/**
 * Registrar nuevo usuario con email y contraseña
 * @param {string} email 
 * @param {string} password 
 * @param {string} displayName - Nombre del usuario
 * @param {string} department - Departamento opcional
 * @returns {Promise<Object>} Usuario creado
 */
export async function signUp(email, password, displayName, department = '') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar perfil con nombre
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Crear perfil en Firestore con rol y departamento
    await createUserProfile(userCredential.user.uid, {
      email,
      displayName,
      department
    });
    
    console.log('✅ Usuario registrado:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Error en registro:', error);
    throw handleAuthError(error);
  }
}

/**
 * Iniciar sesión con email y contraseña
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} Usuario autenticado
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Sesión iniciada:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Error en login:', error);
    throw handleAuthError(error);
  }
}

/**
 * Cerrar sesión
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem('@currentUser');
    console.log('✅ Sesión cerrada');
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error);
    throw error;
  }
}

/**
 * Obtener usuario actual
 * @returns {Object|null} Usuario actual o null
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Observar cambios en el estado de autenticación
 * @param {Function} callback - Función que recibe el usuario o null
 * @returns {Function} Función para cancelar la suscripción
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('👤 Usuario autenticado:', user.email);
      // Guardar info del usuario localmente
      AsyncStorage.setItem('@currentUser', user.displayName || user.email);
    } else {
      console.log('👤 Usuario no autenticado');
      AsyncStorage.removeItem('@currentUser');
    }
    callback(user);
  });
}

/**
 * Obtener UID del usuario actual
 * @returns {string|null}
 */
export function getCurrentUserUID() {
  return auth.currentUser?.uid || null;
}

/**
 * Obtener nombre del usuario actual
 * @returns {string}
 */
export function getCurrentUserName() {
  const user = auth.currentUser;
  return user?.displayName || user?.email || 'Usuario';
}

/**
 * Manejo de errores de Firebase Auth
 */
function handleAuthError(error) {
  const errorMessages = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Usuario deshabilitado',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión'
  };

  const message = errorMessages[error.code] || error.message;
  return new Error(message);
}

export { auth };
