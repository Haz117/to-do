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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { notifyTaskAssigned } from './emailNotifications';

const COLLECTION_NAME = 'tasks';

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
    console.log('📊 Suscripciones activas:', activeSubscriptions);

    // Obtener sesión del usuario actual
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) {
      console.warn('Usuario no autenticado, no se pueden cargar tareas');
      activeSubscriptions--;
      callback([]);
      return () => {};
    }

    const userRole = sessionResult.session.role;
    const userEmail = sessionResult.session.email;
    const userDepartment = sessionResult.session.department;

    console.log('🔑 Usuario:', userEmail, '| Rol:', userRole);

    let tasksQuery;

    // Construir query según el rol del usuario
    if (userRole === 'admin') {
      // Admin: Ver todas las tareas
      console.log('✅ ADMIN - Mostrando todas las tareas');
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'jefe') {
      // Jefe: Solo tareas de su departamento/área
      console.log('\ud83d\udcc1 JEFE - Filtrando por departamento:', userDepartment);
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        where('area', '==', userDepartment),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'operativo') {
      // Operativo: Solo tareas asignadas a él (comparación exacta con email)
      console.log('🔒 Filtro OPERATIVO - Email:', userEmail);
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        where('assignedTo', '==', userEmail),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Sin rol definido: sin acceso
      console.warn('Usuario sin rol definido');
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
        
        console.log(`📋 Tareas cargadas para ${userRole}:`, tasks.length);
        console.log(`📥 Recibidas ${tasks.length} tareas en tiempo real`);
        callback(tasks);
      },
      (error) => {
        console.error('❌ Error en suscripción:', error);
        callback([]);
      }
    );

    // Retornar función de limpieza mejorada
    return () => {
      console.log('🧹 Limpiando suscripción');
      activeSubscriptions--;
      if (unsubscribe) unsubscribe();
    };
  } catch (error) {
    console.error('❌ Error configurando subscripción:', error);
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
  const tempId = `temp_${Date.now()}`;
  
  try {
    // Obtener información del usuario actual
    const sessionResult = await getCurrentSession();
    const currentUserUID = sessionResult.success ? sessionResult.session.userId : 'anonymous';
    const currentUserName = sessionResult.success ? sessionResult.session.displayName : 'Usuario Anónimo';

    // OPTIMISTIC UPDATE: Actualizar cache inmediatamente
    const optimisticTask = {
      ...task,
      id: tempId,
      createdBy: currentUserUID,
      createdByName: currentUserName,
      department: task.department || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueAt: task.dueAt,
      _optimistic: true
    };
    
    cachedTasks = [optimisticTask, ...cachedTasks];

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
    console.log('[Firebase] Tarea creada:', docRef.id);
    
    // Reemplazar tarea optimista con la real
    cachedTasks = cachedTasks.filter(t => t.id !== tempId);
    
    // Enviar notificación por email al asignado
    if (task.assignedTo) {
      notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
        .catch(err => console.warn('Error enviando email:', err));
    }
    
    return docRef.id;
  } catch (error) {
    console.error('[Firebase] Error creando tarea:', error);
    // Remover tarea optimista en caso de error
    cachedTasks = cachedTasks.filter(t => t.id !== tempId);
    
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
    console.log('[Firebase] Tarea actualizada:', taskId);
  } catch (error) {
    console.error('[Firebase] Error actualizando tarea:', error);
    
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
 * Eliminar una tarea
 * @param {string} taskId - ID de la tarea a eliminar
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
    console.log('[Firebase] Tarea eliminada:', taskId);
  } catch (error) {
    console.error('[Firebase] Error eliminando tarea:', error);
    
    // Lanzar error con mensaje específico
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para eliminar esta tarea');
    } else if (error.code === 'not-found') {
      throw new Error('La tarea no existe o ya fue eliminada');
    } else if (error.code === 'unavailable') {
      throw new Error('Sin conexión. Verifica tu red e intenta nuevamente');
    } else {
      throw new Error(`Error al eliminar: ${error.message}`);
    }
  }
}

/**
 * Cargar tareas (fallback si Firebase no está disponible)
 * @returns {Promise<Array>} Array de tareas
 */
export async function loadTasks() {
  console.warn('loadTasks: Usa subscribeToTasks para tiempo real');
  return [];
}
