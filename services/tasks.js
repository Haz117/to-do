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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { loadTasks as loadLocal, saveTasks as saveLocal } from '../storage';

const COLLECTION_NAME = 'tasks';

/**
 * Suscribirse a cambios en tiempo real de todas las tareas
 * @param {Function} callback - Función que recibe el array de tareas actualizado
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeToTasks(callback) {
  try {
    const tasksQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    // Listener en tiempo real
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convertir Timestamps de Firebase a milisegundos
          createdAt: doc.data().createdAt?.toMillis() || Date.now(),
          updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
          dueAt: doc.data().dueAt?.toMillis() || Date.now()
        }));
        
        // Guardar copia local como backup
        saveLocal(tasks).catch(err => console.warn('Error guardando backup local:', err));
        
        callback(tasks);
      },
      (error) => {
        console.error('Error en subscripción de Firebase:', error);
        // Fallback: cargar desde AsyncStorage si Firebase falla
        loadLocal().then(tasks => callback(tasks));
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error configurando subscripción:', error);
    // Fallback: cargar desde AsyncStorage
    loadLocal().then(tasks => callback(tasks));
    return () => {}; // Retornar función vacía
  }
}

/**
 * Crear una nueva tarea en Firebase
 * @param {Object} task - Objeto con datos de la tarea
 * @returns {Promise<string>} ID de la tarea creada
 */
export async function createTask(task) {
  try {
    const taskData = {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dueAt: Timestamp.fromMillis(task.dueAt)
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), taskData);
    console.log('✅ Tarea creada en Firebase:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creando tarea en Firebase:', error);
    // Fallback: guardar localmente
    const allTasks = await loadLocal();
    const newTask = { ...task, id: String(Date.now()) };
    allTasks.unshift(newTask);
    await saveLocal(allTasks);
    return newTask.id;
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
    console.log('✅ Tarea actualizada en Firebase:', taskId);
  } catch (error) {
    console.error('❌ Error actualizando tarea en Firebase:', error);
    // Fallback: actualizar localmente
    const allTasks = await loadLocal();
    const index = allTasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      allTasks[index] = { ...allTasks[index], ...updates, updatedAt: Date.now() };
      await saveLocal(allTasks);
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
    console.log('✅ Tarea eliminada de Firebase:', taskId);
  } catch (error) {
    console.error('❌ Error eliminando tarea de Firebase:', error);
    // Fallback: eliminar localmente
    const allTasks = await loadLocal();
    const filtered = allTasks.filter(t => t.id !== taskId);
    await saveLocal(filtered);
  }
}

/**
 * Cargar tareas (fallback si Firebase no está disponible)
 * @returns {Promise<Array>} Array de tareas
 */
export async function loadTasks() {
  return await loadLocal();
}
