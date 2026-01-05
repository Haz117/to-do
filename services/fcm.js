// services/fcm.js
// Servicio para Firebase Cloud Messaging - Push Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { collection, doc, setDoc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';

const TOKENS_COLLECTION = 'fcmTokens';

/**
 * Configurar el handler de notificaciones
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Solicitar permisos de notificaciones push
 * @returns {Promise<boolean>} true si se otorgaron permisos
 */
export async function requestPushPermissions() {
  if (!Device.isDevice) {
    console.warn('⚠️ Push notifications solo funcionan en dispositivos físicos');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Permisos de notificaciones denegados');
      return false;
    }

    console.log('[FCM] Permisos de notificaciones otorgados');
    return true;
  } catch (error) {
    console.error('[FCM] Error solicitando permisos:', error);
    return false;
  }
}

/**
 * Obtener el token de Expo Push Notifications
 * @returns {Promise<string|null>} Token del dispositivo o null
 */
export async function getExpoPushToken() {
  if (!Device.isDevice) {
    console.warn('⚠️ No se puede obtener token en emulador/Expo Go');
    return null;
  }

  try {
    // Solicitar permisos primero
    const hasPermission = await requestPushPermissions();
    if (!hasPermission) {
      return null;
    }

    // Obtener el token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'infra-sublime-464215-m5' // Tu project ID de Firebase
    });

    console.log('[FCM] Token de Expo Push obtenido:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[FCM] Error obteniendo token de Expo Push:', error);
    return null;
  }
}

/**
 * Registrar el token del dispositivo en Firestore
 * Asociado al usuario actual
 * @param {string} token - Token de Expo Push
 * @returns {Promise<boolean>} true si se registró correctamente
 */
export async function registerDeviceToken(token) {
  if (!token) {
    console.warn('⚠️ No hay token para registrar');
    return false;
  }

  const sessionResult = await getCurrentSession();
  if (!sessionResult.success) {
    console.warn('⚠️ No hay usuario autenticado');
    return false;
  }
  
  const userUID = sessionResult.session.userId;

  try {
    const tokenDoc = doc(db, TOKENS_COLLECTION, token);
    
    await setDoc(tokenDoc, {
      token: token,
      userId: userUID,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device',
      createdAt: new Date(),
      lastUsed: new Date()
    });

    console.log('[FCM] Token registrado en Firestore:', token.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('[FCM] Error registrando token:', error);
    return false;
  }
}

/**
 * Eliminar el token del dispositivo al cerrar sesión
 * @param {string} token - Token a eliminar
 * @returns {Promise<boolean>}
 */
export async function unregisterDeviceToken(token) {
  if (!token) return false;

  try {
    const tokenDoc = doc(db, TOKENS_COLLECTION, token);
    await deleteDoc(tokenDoc);
    console.log('[FCM] Token eliminado de Firestore');
    return true;
  } catch (error) {
    console.error('[FCM] Error eliminando token:', error);
    return false;
  }
}

/**
 * Obtener todos los tokens de un usuario específico
 * @param {string} userId - UID del usuario
 * @returns {Promise<string[]>} Array de tokens
 */
export async function getUserTokens(userId) {
  if (!userId) return [];

  try {
    const tokensQuery = query(
      collection(db, TOKENS_COLLECTION),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(tokensQuery);
    const tokens = snapshot.docs.map(doc => doc.data().token);
    
    console.log(`[FCM] Se encontraron ${tokens.length} tokens para usuario:`, userId.substring(0, 8) + '...');
    return tokens;
  } catch (error) {
    console.error('[FCM] Error obteniendo tokens del usuario:', error);
    return [];
  }
}

/**
 * Enviar notificación push a tokens específicos
 * Usa la API de Expo Push Notifications
 * @param {string[]} tokens - Array de tokens de destino
 * @param {Object} notification - Objeto de notificación
 * @returns {Promise<boolean>}
 */
export async function sendPushNotification(tokens, notification) {
  if (!tokens || tokens.length === 0) {
    console.warn('⚠️ No hay tokens para enviar notificación');
    return false;
  }

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    priority: 'high',
    badge: 1
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('[FCM] Notificaciones enviadas:', result);
    return true;
  } catch (error) {
    console.error('[FCM] Error enviando notificaciones push:', error);
    return false;
  }
}

/**
 * Notificar a un usuario específico
 * @param {string} userId - UID del usuario a notificar
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales
 * @returns {Promise<boolean>}
 */
export async function notifyUser(userId, title, body, data = {}) {
  try {
    const tokens = await getUserTokens(userId);
    
    if (tokens.length === 0) {
      console.warn('⚠️ Usuario no tiene tokens registrados');
      return false;
    }

    return await sendPushNotification(tokens, {
      title,
      body,
      data
    });
  } catch (error) {
    console.error('[FCM] Error notificando usuario:', error);
    return false;
  }
}

/**
 * Notificar sobre una tarea asignada
 * @param {string} userId - UID del usuario asignado
 * @param {Object} task - Objeto de la tarea
 * @returns {Promise<boolean>}
 */
export async function notifyTaskAssigned(userId, task) {
  return await notifyUser(
    userId,
    '📋 Nueva Tarea Asignada',
    `Se te asignó: "${task.title}"`,
    {
      type: 'task_assigned',
      taskId: task.id,
      screen: 'TaskDetail'
    }
  );
}

/**
 * Notificar sobre un nuevo comentario en una tarea
 * @param {string} userId - UID del usuario a notificar
 * @param {Object} task - Objeto de la tarea
 * @param {string} author - Nombre del autor del comentario
 * @returns {Promise<boolean>}
 */
export async function notifyNewComment(userId, task, author) {
  return await notifyUser(
    userId,
    '💬 Nuevo Comentario',
    `${author} comentó en "${task.title}"`,
    {
      type: 'new_comment',
      taskId: task.id,
      screen: 'TaskChat'
    }
  );
}

/**
 * Notificar sobre una tarea próxima a vencer
 * @param {string} userId - UID del usuario a notificar
 * @param {Object} task - Objeto de la tarea
 * @returns {Promise<boolean>}
 */
export async function notifyDeadlineApproaching(userId, task) {
  return await notifyUser(
    userId,
    '⏰ Fecha Límite Próxima',
    `La tarea "${task.title}" vence pronto`,
    {
      type: 'deadline_approaching',
      taskId: task.id,
      screen: 'TaskDetail'
    }
  );
}
