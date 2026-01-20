// services/offlineQueue.js
// Sistema robusto de cola para operaciones offline
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createTask, updateTask, deleteTask } from './tasks';

const QUEUE_KEY = '@offline_queue';
const SYNC_STATUS_KEY = '@sync_status';

// Tipos de operaciones
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

// Estado de sincronización
let isSyncing = false;
let syncListeners = [];

/**
 * Agregar operación a la cola offline
 */
export const queueOperation = async (type, data, tempId = null) => {
  try {
    const queue = await getQueue();
    const operation = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      data,
      tempId,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending', // pending, syncing, completed, failed
    };
    
    queue.push(operation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    console.log('📝 Operación agregada a cola offline:', operation);
    
    // Intentar sincronizar inmediatamente
    syncQueue();
    
    return operation.id;
  } catch (error) {
    console.error('❌ Error agregando a cola:', error);
    return null;
  }
};

/**
 * Obtener cola actual
 */
export const getQueue = async () => {
  try {
    const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  } catch (error) {
    console.error('❌ Error leyendo cola:', error);
    return [];
  }
};

/**
 * Limpiar cola
 */
export const clearQueue = async () => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    notifySyncListeners({ syncing: false, pendingCount: 0 });
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
  }
};

/**
 * Obtener cantidad de operaciones pendientes
 */
export const getPendingCount = async () => {
  const queue = await getQueue();
  return queue.filter(op => op.status === 'pending' || op.status === 'syncing').length;
};

/**
 * Sincronizar cola con el servidor
 */
export const syncQueue = async (force = false) => {
  // Evitar múltiples sincronizaciones simultáneas
  if (isSyncing && !force) {
    console.log('⏳ Ya hay una sincronización en progreso');
    return { success: false, reason: 'already_syncing' };
  }

  try {
    // Verificar conectividad
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📵 Sin conexión, sincronización pospuesta');
      return { success: false, reason: 'no_connection' };
    }

    isSyncing = true;
    notifySyncListeners({ syncing: true });

    const queue = await getQueue();
    const pendingOps = queue.filter(op => op.status === 'pending' || (op.status === 'syncing' && op.retries < 3));

    if (pendingOps.length === 0) {
      isSyncing = false;
      notifySyncListeners({ syncing: false, pendingCount: 0 });
      return { success: true, synced: 0 };
    }

    console.log(`🔄 Sincronizando ${pendingOps.length} operaciones...`);

    let syncedCount = 0;
    let failedOps = [];

    for (const operation of pendingOps) {
      try {
        // Marcar como sincronizando
        operation.status = 'syncing';
        operation.retries = (operation.retries || 0) + 1;
        await updateQueueItem(operation);

        // Ejecutar operación según tipo
        let result;
        switch (operation.type) {
          case OPERATION_TYPES.CREATE:
            result = await createTask(operation.data);
            break;
          case OPERATION_TYPES.UPDATE:
            result = await updateTask(operation.data.id, operation.data);
            break;
          case OPERATION_TYPES.DELETE:
            result = await deleteTask(operation.data.id);
            break;
          default:
            throw new Error(`Tipo de operación desconocido: ${operation.type}`);
        }

        if (result.success) {
          // Marcar como completada
          operation.status = 'completed';
          await updateQueueItem(operation);
          syncedCount++;
          console.log(`✅ Operación sincronizada: ${operation.type}`);
        } else {
          throw new Error(result.error || 'Error desconocido');
        }

      } catch (error) {
        console.error(`❌ Error sincronizando operación ${operation.type}:`, error);
        operation.status = 'failed';
        operation.error = error.message;
        await updateQueueItem(operation);
        failedOps.push(operation);
      }
    }

    // Limpiar operaciones completadas
    await cleanCompletedOperations();

    const remainingCount = await getPendingCount();
    
    isSyncing = false;
    notifySyncListeners({ 
      syncing: false, 
      pendingCount: remainingCount,
      synced: syncedCount,
      failed: failedOps.length 
    });

    console.log(`✅ Sincronización completada: ${syncedCount} exitosas, ${failedOps.length} fallidas`);

    return { 
      success: true, 
      synced: syncedCount, 
      failed: failedOps.length,
      remaining: remainingCount 
    };

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    isSyncing = false;
    notifySyncListeners({ syncing: false });
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar item en la cola
 */
const updateQueueItem = async (operation) => {
  try {
    const queue = await getQueue();
    const index = queue.findIndex(op => op.id === operation.id);
    if (index !== -1) {
      queue[index] = operation;
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('❌ Error actualizando item en cola:', error);
  }
};

/**
 * Limpiar operaciones completadas
 */
const cleanCompletedOperations = async () => {
  try {
    const queue = await getQueue();
    const activeOps = queue.filter(op => op.status !== 'completed');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(activeOps));
  } catch (error) {
    console.error('❌ Error limpiando operaciones:', error);
  }
};

/**
 * Suscribirse a cambios de sincronización
 */
export const subscribeSyncStatus = (callback) => {
  syncListeners.push(callback);
  
  // Retornar función para desuscribirse
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
};

/**
 * Notificar a listeners
 */
const notifySyncListeners = (status) => {
  syncListeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error en listener de sync:', error);
    }
  });
};

/**
 * Iniciar monitoreo de conectividad
 */
export const startConnectivityMonitoring = () => {
  return NetInfo.addEventListener(state => {
    console.log('📡 Estado de conexión:', state.isConnected);
    
    if (state.isConnected && !isSyncing) {
      console.log('🔄 Conexión restaurada, iniciando sincronización...');
      // Esperar 2 segundos antes de sincronizar
      setTimeout(() => syncQueue(), 2000);
    }
  });
};

/**
 * Obtener estado de sincronización
 */
export const getSyncStatus = async () => {
  const pendingCount = await getPendingCount();
  return {
    syncing: isSyncing,
    pendingCount,
  };
};
