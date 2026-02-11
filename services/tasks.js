// services/tasks.js
// Servicio para gestionar tareas con Firebase Firestore en tiempo real
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { notifyTaskAssigned } from './emailNotifications';

const COLLECTION_NAME = 'tasks';

// 🔍 DIAGNÓSTICO: Detectar si emulador está activo
function detectEmulator() {
  try {
    // En Firestore modular, si se usa connectFirestoreEmulator(), la conexión se hace en firebase.js
    // No hay forma directa de detectarlo, pero podemos chequear si hay configuración en localStorage o envs
    const emuHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST;
    const emuPort = process.env.REACT_APP_FIRESTORE_EMULATOR_PORT;
    
    if (emuHost || emuPort) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

const isEmulatorActive = detectEmulator();

// Cache eliminado para tiempo real verdadero
let activeSubscriptions = 0;
const MAX_SUBSCRIPTIONS = 3; // Aumentar suscripciones permitidas

/**
 * Suscribirse a cambios en tiempo real de las tareas del usuario autenticado
 * @param {Function} callback - Función que recibe el array de tareas actualizado
 * @returns {Function} Función para cancelar la suscripción
 */
export async function subscribeToTasks(callback) {
  try {
    activeSubscriptions++;

    // Obtener sesión del usuario actual
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) {
      activeSubscriptions--;
      callback([]);
      return () => {};
    }

    const userRole = sessionResult.session.role;
    const userEmail = sessionResult.session.email;
    const userDepartment = sessionResult.session.department;

    let tasksQuery;

    // Construir query según el rol del usuario
    if (userRole === 'admin') {
      // Admin: Ver todas las tareas
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'jefe') {
      // Jefe: Solo tareas de su departamento/área
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        where('area', '==', userDepartment),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'operativo') {
      // Operativo: Solo tareas asignadas a él (comparación exacta con email)
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        where('assignedTo', '==', userEmail),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Sin rol definido: sin acceso
      callback([]);
      return () => {};
    }

    // Listener en tiempo real
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convertir Timestamps de Firebase a milisegundos solo si son Timestamps
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
            dueAt: data.dueAt?.toMillis ? data.dueAt.toMillis() : data.dueAt || Date.now()
          };
        });
        
        // 🛡️ DEDUPLICACIÓN: Asegurar que no haya tareas duplicadas por ID
        const seenIds = new Set();
        const uniqueTasks = [];
        for (const task of tasks) {
          if (!seenIds.has(task.id)) {
            seenIds.add(task.id);
            uniqueTasks.push(task);
          }
        }
        
        callback(uniqueTasks);
      },
      (error) => {
        callback([]);
      }
    );

    // Retornar función de limpieza mejorada
    return () => {
      activeSubscriptions--;
      if (unsubscribe) unsubscribe();
    };
  } catch (error) {
    activeSubscriptions--;
    callback([]);
    return () => {};
  }
}

/**
 * Crear una nueva tarea en Firebase con información del usuario
 * @param {Object} task - Objeto con datos de la tarea
 * @returns {Promise<string>} ID de la tarea creada
 */
export async function createTask(task) {
  try {
    // Obtener información del usuario actual
    const sessionResult = await getCurrentSession();
    const currentUserUID = sessionResult.success ? sessionResult.session.userId : 'anonymous';
    const currentUserName = sessionResult.success ? sessionResult.session.displayName : 'Usuario Anónimo';

    const taskData = {
      ...task,
      createdBy: currentUserUID,
      createdByName: currentUserName,
      department: task.department || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dueAt: Timestamp.fromMillis(task.dueAt),
      tags: task.tags || [],
      estimatedHours: task.estimatedHours || null
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), taskData);
    
    // Enviar notificación por email al asignado
    if (task.assignedTo) {
      notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
        .catch(err => {});
    }
    
    return docRef.id;
  } catch (error) {
    
    // Lanzar error con mensaje específico
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para crear tareas');
    } else if (error.code === 'unavailable') {
      throw new Error('Sin conexión. Verifica tu red e intenta nuevamente');
    } else if (error.code === 'resource-exhausted') {
      throw new Error('Límite de operaciones excedido. Intenta más tarde');
    } else {
      throw new Error(`Error al crear tarea: ${error.message}`);
    }
  }
}

/**
 * Actualizar una tarea existente
 * @param {string} taskId - ID de la tarea
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<void>}
 */
export async function updateTask(taskId, updates) {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // Convertir dueAt a Timestamp si existe
    if (updates.dueAt) {
      updateData.dueAt = Timestamp.fromMillis(updates.dueAt);
    }

    await updateDoc(taskRef, updateData);

  } catch (error) {
    
    // Lanzar error con mensaje específico
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para modificar esta tarea');
    } else if (error.code === 'not-found') {
      throw new Error('La tarea no existe o fue eliminada');
    } else if (error.code === 'unavailable') {
      throw new Error('Sin conexión. Verifica tu red e intenta nuevamente');
    } else {
      throw new Error(`Error al actualizar: ${error.message}`);
    }
  }
}

/**
 * DIAGNÓSTICO: Función para verificar el estado completo de un documento
 * @param {string} taskId 
 */
export async function diagnoseTaskDelete(taskId) {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const docBefore = await getDoc(taskRef);
    
    const deleteStart = Date.now();
    await deleteDoc(taskRef);
    const deleteDuration = Date.now() - deleteStart;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const docAfter = await getDoc(taskRef);
    
    if (docAfter.exists()) {
      return {
        success: false,
        message: 'Documento NO fue eliminado de Firestore',
        details: {
          beforeDelete: docBefore.exists(),
          afterDelete: docAfter.exists(),
          deleteDuration: deleteDuration
        }
      };
    } else {
      return {
        success: true,
        message: 'Documento eliminado correctamente',
        details: {
          beforeDelete: docBefore.exists(),
          afterDelete: docAfter.exists(),
          deleteDuration: deleteDuration
        }
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Error durante diagnóstico',
      error: error.message,
      errorCode: error?.code
    };
  }
}

/**
 * Eliminar una tarea
 * @param {string} taskId - ID de la tarea a eliminar
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  if (!taskId) {
    throw new Error('taskId es requerido para eliminar');
  }
  
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
    await new Promise(resolve => setTimeout(resolve, 200));
    return;
    
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error('No tienes permiso para eliminar.');
    } else if (error?.code === 'not-found') {
      return;
    } else if (error?.code === 'unavailable') {
      throw new Error('Sin conexión a Firestore.');
    } else if (error?.code === 'unauthenticated') {
      throw new Error('No autenticado. Inicia sesión.');
    } else {
      throw error;
    }
  }
}

/**
 * Cargar tareas (fallback si Firebase no está disponible)
 * @returns {Promise<Array>} Array de tareas
 */
export async function loadTasks() {
  return [];
}
