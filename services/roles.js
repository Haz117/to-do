import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUserUID } from './auth';

// Roles disponibles en el sistema
export const ROLES = {
  ADMIN: 'admin',           // Alcalde, Secretario
  JEFE: 'jefe',             // Director de área
  OPERATIVO: 'operativo'    // Personal operativo
};

// Departamentos del municipio
export const DEPARTMENTS = {
  PRESIDENCIA: 'presidencia',
  JURIDICA: 'juridica',
  OBRAS: 'obras',
  TESORERIA: 'tesoreria',
  RRHH: 'rrhh',
  ADMINISTRACION: 'administracion'
};

// Obtener perfil completo del usuario
export const getUserProfile = async (userId = null) => {
  try {
    const uid = userId || getCurrentUserUID();
    if (!uid) return null;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return null;
  }
};

// Crear perfil de usuario al registrarse
export const createUserProfile = async (userId, data) => {
  try {
    const userProfile = {
      email: data.email,
      displayName: data.displayName || '',
      role: ROLES.OPERATIVO, // Por defecto operativo
      department: data.department || '',
      createdAt: new Date().toISOString(),
      active: true
    };

    await setDoc(doc(db, 'users', userId), userProfile);
    return userProfile;
  } catch (error) {
    console.error('Error creando perfil:', error);
    throw error;
  }
};

// Actualizar perfil de usuario
export const updateUserProfile = async (userId, updates) => {
  try {
    // No permitir cambio de rol desde aquí (solo admin)
    const { role, ...safeUpdates } = updates;
    await updateDoc(doc(db, 'users', userId), {
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    throw error;
  }
};

// Actualizar rol de usuario (solo admin)
export const updateUserRole = async (userId, newRole) => {
  try {
    const currentUser = await getUserProfile();
    if (!currentUser || currentUser.role !== ROLES.ADMIN) {
      throw new Error('No tienes permisos para cambiar roles');
    }

    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    throw error;
  }
};

// Verificar si el usuario es admin
export const isAdmin = async () => {
  try {
    const profile = await getUserProfile();
    return profile?.role === ROLES.ADMIN;
  } catch (error) {
    return false;
  }
};

// Verificar si el usuario es jefe o admin
export const isJefeOrAdmin = async () => {
  try {
    const profile = await getUserProfile();
    return profile?.role === ROLES.ADMIN || profile?.role === ROLES.JEFE;
  } catch (error) {
    return false;
  }
};

// Obtener usuarios por departamento
export const getUsersByDepartment = async (department) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('department', '==', department),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo usuarios por departamento:', error);
    return [];
  }
};

// Obtener usuarios por rol
export const getUsersByRole = async (role) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', role),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo usuarios por rol:', error);
    return [];
  }
};

// Obtener todos los usuarios activos (solo admin)
export const getAllUsers = async () => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error('No tienes permisos para ver todos los usuarios');
    }

    const q = query(collection(db, 'users'), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
};

// Desactivar usuario (soft delete - solo admin)
export const deactivateUser = async (userId) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error('No tienes permisos para desactivar usuarios');
    }

    await updateDoc(doc(db, 'users', userId), {
      active: false,
      deactivatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    throw error;
  }
};

// Obtener nombres de todos los usuarios activos para asignación de tareas
export const getAllUsersNames = async () => {
  try {
    const q = query(collection(db, 'users'), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => doc.data().displayName || doc.data().email)
      .filter(name => name) // Filtrar nulls/undefined
      .sort();
  } catch (error) {
    console.error('Error obteniendo nombres de usuarios:', error);
    return [];
  }
};
