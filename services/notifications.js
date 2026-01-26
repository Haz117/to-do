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
  // En web no hay notificaciones nativas
  if (Platform.OS === 'web') {
    console.log('Las notificaciones no están disponibles en web');
    return false;
  }
  
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

// Programa una notificación antes de la fecha límite (optimizado)
// Devuelve el id de la notificación programada o null si no se programó.
export async function scheduleNotificationForTask(task, options = { minutesBefore: 10 }) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    const due = typeof task.dueAt === 'number' ? new Date(task.dueAt) : new Date(task.dueAt);
    const triggerDate = new Date(due.getTime() - options.minutesBefore * 60 * 1000);

    // Si el trigger ya pasó, no programamos
    if (triggerDate <= new Date()) {
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
        color: '#9F2241',
      },
      trigger: triggerDate
    });

    return id;
  } catch (e) {
    console.error('Error programando notificación:', e);
    return null;
  }
}

// Programa recordatorios diarios cada 24 horas para tareas no cerradas
// Devuelve array de IDs de notificaciones programadas
export async function scheduleDailyReminders(task, maxReminders = 3) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
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

// Notificación al asignar tarea (Local optimizada)
export async function notifyAssignment(task) {
  // En web no enviar notificaciones
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    const localNotifId = await Notifications.scheduleNotificationAsync({
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
        color: '#9F2241',
      },
      trigger: null // Notificación inmediata
    });

    return localNotifId;
  } catch (e) {
    console.error('Error enviando notificación de asignación:', e);
    return null;
  }
}

// Notificación diaria de tareas vencidas (se programa cada 24 horas)
export async function scheduleOverdueTasksNotification(overdueTasks) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return null;
  }
  
  // No notificar si no hay tareas vencidas
  if (!overdueTasks || overdueTasks.length === 0) {
    return null;
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return null;
    }

    // Cancelar notificaciones previas de este tipo
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of allScheduled) {
      if (notif.content.data?.type === 'overdue_daily') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const count = overdueTasks.length;
    const taskTitles = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
    const moreText = count > 3 ? `\n... y ${count - 3} más` : '';

    // Programar notificación para mañana a las 9:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ${count} ${count === 1 ? 'Tarea Vencida' : 'Tareas Vencidas'}`,
        body: `Tienes ${count} ${count === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}:\n${taskTitles}${moreText}`,
        data: { 
          type: 'overdue_daily',
          taskCount: count,
          taskIds: overdueTasks.map(t => t.id)
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#DC2626',
        badge: count
      },
      trigger: tomorrow
    });

    console.log(`Notificación de tareas vencidas programada para ${tomorrow.toLocaleString()}`);
    return id;
  } catch (e) {
    console.error('Error programando notificación de tareas vencidas:', e);
    return null;
  }
}

/**
 * Programa notificaciones múltiples al día para tareas vencidas
 * Horarios: 9 AM, 2 PM, 6 PM
 * OPTIMIZADO: Solo programa 3 notificaciones máximo por día
 */
export async function scheduleMultipleDailyOverdueNotifications(overdueTasks) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
  if (!overdueTasks || overdueTasks.length === 0) {
    return [];
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return [];
    }

    // NO cancelar todas las notificaciones, solo limpiar las viejas de tipo overdue
    // Esto es más eficiente que iterar todas
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const overduesToCancel = allScheduled
      .filter(n => n.content.data?.type === 'overdue_daily' || n.content.data?.type === 'overdue_multiple')
      .slice(0, 20); // Limitar a 20 para evitar lag
    
    for (const notif of overduesToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    const count = overdueTasks.length;
    const taskTitles = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\\n');
    const moreText = count > 3 ? `\\n... y ${count - 3} más` : '';

    const ids = [];
    const hours = [9, 14, 18]; // 9 AM, 2 PM, 6 PM
    const now = new Date();

    for (const hour of hours) {
      const triggerTime = new Date();
      triggerTime.setHours(hour, 0, 0, 0);
      
      // Si ya pasó la hora de hoy, programar para mañana
      if (triggerTime <= now) {
        triggerTime.setDate(triggerTime.getDate() + 1);
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 ${count} ${count === 1 ? 'Tarea Vencida' : 'Tareas Vencidas'}`,
          body: `Tienes ${count} ${count === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}:\\n${taskTitles}${moreText}`,
          data: { 
            type: 'overdue_multiple',
            taskCount: count,
            taskIds: overdueTasks.map(t => t.id),
            hour
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: '#DC2626',
          badge: count,
          vibrate: [0, 250, 250, 250], // Vibración más insistente
        },
        trigger: triggerTime
      });

      ids.push(id);
      console.log(`Notificación de vencidas programada para ${triggerTime.toLocaleString()}`);
    }

    return ids;
  } catch (e) {
    console.error('Error programando notificaciones múltiples de vencidas:', e);
    return [];
  }
}

export async function cancelNotification(notificationId) {
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
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
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
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
  // En web no hay notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
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
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Todas las notificaciones canceladas');
  } catch (e) {
    console.error('Error cancelando todas las notificaciones:', e);
  }
}
