import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUserUID, getCurrentUserName } from './auth';

/**
 * Registrar firma digital al completar una tarea
 * @param {string} taskId - ID de la tarea completada
 * @param {Object} signatureData - Datos adicionales de la firma
 * @returns {Promise<string>} ID de la firma registrada
 */
export async function createSignature(taskId, signatureData = {}) {
  try {
    const userId = getCurrentUserUID();
    const userName = getCurrentUserName();

    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const signature = {
      taskId,
      userId,
      userName,
      signedAt: serverTimestamp(),
      deviceInfo: {
        platform: signatureData.platform || 'unknown',
        version: signatureData.appVersion || '1.0.0'
      },
      location: signatureData.location || null, // Opcional: coordenadas GPS
      notes: signatureData.notes || '', // Opcional: notas del firmante
      ipAddress: signatureData.ipAddress || null, // Opcional: IP
      verified: true,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'signatures'), signature);
    console.log('✅ Firma digital registrada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error registrando firma:', error);
    throw error;
  }
}

/**
 * Verificar si una tarea tiene firma digital
 * @param {string} taskId - ID de la tarea
 * @returns {Promise<Object|null>} Firma encontrada o null
 */
export async function getSignature(taskId) {
  try {
    const q = query(
      collection(db, 'signatures'),
      where('taskId', '==', taskId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      signedAt: doc.data().signedAt?.toDate?.() || new Date()
    };
  } catch (error) {
    console.error('Error obteniendo firma:', error);
    return null;
  }
}

/**
 * Obtener todas las firmas de un usuario
 * @param {string} userId - ID del usuario (opcional, usa el actual si no se provee)
 * @returns {Promise<Array>} Array de firmas
 */
export async function getUserSignatures(userId = null) {
  try {
    const uid = userId || getCurrentUserUID();
    if (!uid) return [];

    const q = query(
      collection(db, 'signatures'),
      where('userId', '==', uid)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      signedAt: doc.data().signedAt?.toDate?.() || new Date()
    }));
  } catch (error) {
    console.error('Error obteniendo firmas del usuario:', error);
    return [];
  }
}

/**
 * Verificar integridad de firma
 * @param {string} signatureId - ID de la firma
 * @returns {Promise<boolean>} true si es válida
 */
export async function verifySignature(signatureId) {
  try {
    // Por ahora solo verificamos que existe
    // En el futuro se puede agregar verificación criptográfica
    const q = query(
      collection(db, 'signatures'),
      where('__name__', '==', signatureId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty && snapshot.docs[0].data().verified === true;
  } catch (error) {
    console.error('Error verificando firma:', error);
    return false;
  }
}

/**
 * Crear log de auditoría para cambios importantes
 * @param {string} action - Acción realizada
 * @param {Object} details - Detalles de la acción
 */
export async function createAuditLog(action, details) {
  try {
    const userId = getCurrentUserUID();
    const userName = getCurrentUserName();

    const log = {
      userId,
      userName,
      action,
      details,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'auditLogs'), log);
    console.log('📝 Log de auditoría creado:', action);
  } catch (error) {
    console.error('Error creando log de auditoría:', error);
    // No lanzar error para no bloquear operaciones principales
  }
}
