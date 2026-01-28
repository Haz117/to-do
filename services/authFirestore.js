// services/authFirestore.js
// Sistema de autenticación usando solo Firestore (sin Firebase Auth)
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hash simple (en producción usar bcrypt o similar)
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Registrar nuevo usuario
export const registerUser = async (email, password, displayName, role = 'operativo') => {
  try {
    // Verificar si el usuario ya existe
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: false, error: 'El usuario ya existe' };
    }
    
    // Crear nuevo usuario
    const hashedPassword = simpleHash(password + email);
    const docRef = await addDoc(usersRef, {
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName,
      role: role, // 'admin' o 'operativo'
      active: true,
      createdAt: new Date()
    });
    
    return { 
      success: true, 
      userId: docRef.id,
      userData: { email, displayName, role }
    };
  } catch (error) {
    console.error('Error en registerUser:', error);
    return { success: false, error: error.message };
  }
};

// Iniciar sesión
export const loginUser = async (email, password) => {
  try {
    const normalizedEmail = email.toLowerCase();
    console.log('[AUTH] Intentando login con:', normalizedEmail);
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('[ERROR] Usuario no encontrado:', normalizedEmail);
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    console.log('[SUCCESS] Usuario encontrado:', userData.email, '- Rol:', userData.role);
    
    // Verificar contraseña - El hash debe usar el email normalizado
    const hashedPassword = simpleHash(password + normalizedEmail);
    console.log('[HASH] Hash calculado:', hashedPassword);
    console.log('[HASH] Hash en BD:', userData.password);
    
    if (userData.password !== hashedPassword) {
      console.log('[ERROR] Contraseña incorrecta');
      return { success: false, error: 'Contraseña incorrecta' };
    }
    
    console.log('[SUCCESS] Contraseña correcta');
    
    // Verificar si está activo
    if (!userData.active) {
      return { success: false, error: 'Usuario desactivado' };
    }
    
    // Guardar sesión en AsyncStorage
    const session = {
      userId: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department || '',
      area: userData.area || userData.department || ''
    };
    
    await AsyncStorage.setItem('userSession', JSON.stringify(session));
    
    return { success: true, user: session };
  } catch (error) {
    console.error('Error en loginUser:', error);
    return { success: false, error: error.message };
  }
};

// Cerrar sesión
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('userSession');
    return { success: true };
  } catch (error) {
    console.error('Error en logoutUser:', error);
    return { success: false, error: error.message };
  }
};

// Obtener sesión actual
export const getCurrentSession = async () => {
  try {
    const sessionData = await AsyncStorage.getItem('userSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      console.log('[SESSION] Sesión encontrada:', session.email);
      return { success: true, session };
    }
    console.log('ℹ️ No hay sesión activa');
    return { success: false, error: 'No hay sesión activa' };
  } catch (error) {
    console.error('[ERROR] Error en getCurrentSession:', error);
    // Si hay un error al parsear o leer, limpiamos la sesión corrupta
    try {
      await AsyncStorage.removeItem('userSession');
    } catch (cleanupError) {
      console.error('Error limpiando sesión corrupta:', cleanupError);
    }
    return { success: false, error: error.message };
  }
};

// Verificar si el usuario es admin
export const isAdmin = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return result.session.role === 'admin';
  }
  return false;
};

// Obtener datos del usuario actual
export const getCurrentUserData = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return { success: true, data: result.session };
  }
  return { success: false, error: 'No hay sesión activa' };
};

// Refrescar sesión desde Firestore (útil cuando el perfil se actualiza)
export const refreshSession = async () => {
  try {
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) {
      return { success: false, error: 'No hay sesión activa' };
    }

    const userId = sessionResult.session.userId;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', sessionResult.session.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Actualizar sesión con datos frescos de Firestore
    const updatedSession = {
      userId: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department || '',
      area: userData.area || userData.department || ''
    };

    await AsyncStorage.setItem('userSession', JSON.stringify(updatedSession));
    
    console.log('[SESSION] Sesión refrescada:', updatedSession);
    return { success: true, session: updatedSession };
  } catch (error) {
    console.error('Error refrescando sesión:', error);
    return { success: false, error: error.message };
  }
};
