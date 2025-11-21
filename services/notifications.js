// services/notifications.js
// Helpers para programar y cancelar notificaciones locales usando expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notifyTaskAssigned, notifyNewComment, notifyDeadlineApproaching } from './fcm';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Configurar handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Pide permisos si es necesario. Devuelve true si se concedieron.
export async function ensurePermissions() {
  if (!Device.isDevice) {
    console.log('Las notificaciones solo funcionan en dispositivos físicos');
    return false;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permisos de notificación denegados');
      return false;
    }

    // Configurar canal de notificaciones para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Tareas y Recordatorios',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
        sound: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error solicitando permisos de notificación:', error);
    return false;
  }
}

// Programa una notificación antes de la fecha límite
// Devuelve el id de la notificación programada o null si no se programó.
export async function scheduleNotificationForTask(task, options = { minutesBefore: 10 }) {
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      console.log('No se pueden programar notificaciones sin permisos');
      return null;
    }

    const due = typeof task.dueAt === 'number' ? new Date(task.dueAt) : new Date(task.dueAt);
    const triggerDate = new Date(due.getTime() - options.minutesBefore * 60 * 1000);

    // Si el trigger ya pasó, no programamos
    if (triggerDate <= new Date()) {
      console.log('La fecha de notificación ya pasó, no se programa');
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Recordatorio de Tarea',
        body: `"${task.title}" vence en ${options.minutesBefore} minutos`,
        data: { 
          taskId: task.id,
          type: 'reminder',
          taskTitle: task.title
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#667eea',
      },
      trigger: triggerDate
    });

    console.log(`Notificación programada con ID: ${id} para ${triggerDate.toLocaleString()}`);
    return id;
  } catch (e) {
    console.error('Error programando notificación:', e);
    return null;
  }
}

// Programa recordatorios diarios cada 24 horas para tareas no cerradas
// Devuelve array de IDs de notificaciones programadas
export async function scheduleDailyReminders(task, maxReminders = 3) {
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      console.log('No se pueden programar recordatorios sin permisos');
      return [];
    }

    // Solo programar para tareas que no están cerradas
    if (task.status === 'cerrada') {
      console.log('No se programan recordatorios para tareas cerradas');
      return [];
    }

    const ids = [];
    const now = new Date();
    const due = typeof task.dueAt === 'number' ? new Date(task.dueAt) : new Date(task.dueAt);
    
    // Programar recordatorios cada 24 horas hasta la fecha de vencimiento (máximo 3)
    let reminderDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 día
    let count = 0;
    
    while (reminderDate < due && count < maxReminders) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Recordatorio Diario',
          body: `Tarea pendiente: "${task.title}" (Vence: ${due.toLocaleDateString()})`,
          data: { 
            taskId: task.id, 
            type: 'daily_reminder',
            taskTitle: task.title
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#667eea',
        },
        trigger: reminderDate
      });
      
      console.log(`Recordatorio diario programado: ${reminderDate.toLocaleString()}`);
      ids.push(id);
      reminderDate = new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000); // +1 día más
      count++;
    }

    console.log(`Se programaron ${ids.length} recordatorios diarios`);
    return ids;
  } catch (e) {
    console.error('Error programando recordatorios diarios:', e);
    return [];
  }
}

// Notificación al asignar tarea (Local + Push)
export async function notifyAssignment(task) {
  try {
    // 1. Enviar notificación local (inmediata)
    const granted = await ensurePermissions();
    let localNotifId = null;
    
    if (granted) {
      localNotifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Nueva Tarea Asignada',
          body: `Te asignaron: "${task.title}" - Vence: ${new Date(task.dueAt).toLocaleDateString()}`,
          data: { 
            taskId: task.id, 
            type: 'assignment',
            taskTitle: task.title,
            assignedTo: task.assignedTo
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#007AFF',
        },
        trigger: null // Notificación inmediata
      });

      console.log(`✅ Notificación local de asignación enviada con ID: ${localNotifId}`);
    }

    // 2. Buscar UID del usuario asignado y enviar push notification
    if (task.assignedTo) {
      try {
        // Buscar usuario por nombre en la colección de usuarios (si usas nombres)
        // O si assignedTo ya es un UID, usarlo directamente
        
        // Por ahora, si assignedTo contiene el UID del usuario, enviar push
        // En tu caso actual assignedTo es un string con nombres, necesitarás adaptar esto
        
        // Ejemplo: si tuvieras una función para convertir nombre a UID
        // const userUID = await getUserUIDByName(task.assignedTo);
        // if (userUID) {
        //   await notifyTaskAssigned(userUID, task);
        // }
        
        console.log('ℹ️ Push notification pendiente de configurar: necesitas mapear nombres a UIDs');
      } catch (error) {
        console.error('❌ Error enviando push notification:', error);
      }
    }

    return localNotifId;
  } catch (e) {
    console.error('Error enviando notificación de asignación:', e);
    return null;
  }
}

export async function cancelNotification(notificationId) {
  try {
    if (!notificationId) {
      console.log('No se proporcionó ID de notificación para cancelar');
      return;
    }
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Notificación ${notificationId} cancelada`);
  } catch (e) {
    console.error('Error cancelando notificación:', e);
  }
}

// Cancelar múltiples notificaciones
export async function cancelNotifications(notificationIds = []) {
  try {
    if (!notificationIds || notificationIds.length === 0) {
      console.log('No hay notificaciones para cancelar');
      return;
    }
    await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    console.log(`${notificationIds.length} notificaciones canceladas`);
  } catch (e) {
    console.error('Error cancelando notificaciones:', e);
  }
}

// Obtener todas las notificaciones programadas (útil para debugging)
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Notificaciones programadas: ${notifications.length}`);
    notifications.forEach(notif => {
      console.log(`- ID: ${notif.identifier}, Trigger: ${JSON.stringify(notif.trigger)}`);
    });
    return notifications;
  } catch (e) {
    console.error('Error obteniendo notificaciones:', e);
    return [];
  }
}

// Cancelar TODAS las notificaciones programadas
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Todas las notificaciones canceladas');
  } catch (e) {
    console.error('Error cancelando todas las notificaciones:', e);
  }
}
