// EJEMPLO DE USO EN HOMESCREEN.JS
// Agregar esto a tus imports existentes:

import { 
  scheduleHourlyReminders,
  schedulePersistentNotification,
  scheduleEscalatedNotifications,
  resetEscalationLevel,
  confirmNotificationViewed,
  checkUnconfirmedNotifications
} from '../services/notifications';

// ============================================
// EJEMPLO 1: Al crear una nueva tarea
// ============================================

const handleCreateTask = async (taskData) => {
  try {
    setIsLoading(true);
    
    // Crear la tarea en Firebase
    const newTask = await createTask(taskData);
    
    // 🔔 NOTIFICACIONES AGRESIVAS
    if (newTask.priority === 'alta' || isOverdue(newTask)) {
      // Para tareas urgentes: notificaciones cada hora
      await scheduleHourlyReminders(newTask);
      
      // Notificación persistente inmediata
      await schedulePersistentNotification(newTask);
    }
    
    // Para TODAS las tareas: sistema de escalado
    await scheduleEscalatedNotifications(newTask);
    
    Toast.show({
      type: 'success',
      text1: 'Tarea Creada',
      text2: newTask.priority === 'alta' 
        ? '🚨 Notificaciones horarias activadas'
        : 'Recordatorios configurados'
    });
    
    setIsLoading(false);
  } catch (error) {
    console.error('Error creando tarea:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'No se pudo crear la tarea'
    });
    setIsLoading(false);
  }
};

// ============================================
// EJEMPLO 2: Al marcar tarea como completa
// ============================================

const handleCompleteTask = async (taskId) => {
  try {
    // Actualizar estado en Firebase
    await updateTask(taskId, { status: 'cerrada', completedAt: Date.now() });
    
    // 🔔 RESETEAR NOTIFICACIONES
    await resetEscalationLevel(taskId);
    await confirmNotificationViewed(taskId);
    
    Toast.show({
      type: 'success',
      text1: '✅ Tarea Completada',
      text2: 'Notificaciones desactivadas'
    });
  } catch (error) {
    console.error('Error completando tarea:', error);
  }
};

// ============================================
// EJEMPLO 3: Verificación periódica de notificaciones no confirmadas
// ============================================

useEffect(() => {
  if (!tasks || tasks.length === 0) return;
  
  // Verificar cada 30 minutos si hay notificaciones no confirmadas
  const interval = setInterval(async () => {
    console.log('🔍 Verificando notificaciones no confirmadas...');
    await checkUnconfirmedNotifications(tasks);
  }, 30 * 60 * 1000); // 30 minutos
  
  // Verificación inmediata al cargar
  checkUnconfirmedNotifications(tasks);
  
  return () => clearInterval(interval);
}, [tasks]);

// ============================================
// EJEMPLO 4: Al abrir TaskDetailScreen desde notificación
// ============================================

// En TaskDetailScreen.js o donde manejes la navegación:

useEffect(() => {
  // Si la pantalla se abrió desde una notificación
  const { params } = route;
  
  if (params?.fromNotification && params?.taskId) {
    // Confirmar que el usuario vio la notificación
    confirmNotificationViewed(params.taskId);
    
    console.log(`✅ Notificación confirmada para tarea: ${params.taskId}`);
  }
}, [route.params]);

// ============================================
// EJEMPLO 5: Enviar notificación persistente manual
// ============================================

const handleSendUrgentReminder = async (task) => {
  try {
    await schedulePersistentNotification(task);
    
    Toast.show({
      type: 'info',
      text1: '🔔 Recordatorio Enviado',
      text2: 'Notificación persistente creada'
    });
  } catch (error) {
    console.error('Error enviando recordatorio:', error);
  }
};

// ============================================
// EJEMPLO 6: Botón para activar modo "Ultra Agresivo"
// ============================================

const handleActivateUltraMode = async (task) => {
  try {
    // Activar TODAS las notificaciones al mismo tiempo
    const [hourlyIds, persistentId, escalatedIds] = await Promise.all([
      scheduleHourlyReminders(task),
      schedulePersistentNotification(task),
      scheduleEscalatedNotifications(task)
    ]);
    
    console.log(`🚨 Modo Ultra Activado:
      - ${hourlyIds.length} notificaciones horarias
      - 1 notificación persistente: ${persistentId}
      - ${escalatedIds.length} notificaciones escaladas
    `);
    
    Toast.show({
      type: 'success',
      text1: '🚨 MODO ULTRA ACTIVADO',
      text2: 'No podrás ignorar esta tarea',
      visibilityTime: 4000
    });
  } catch (error) {
    console.error('Error activando modo ultra:', error);
  }
};

// ============================================
// EJEMPLO 7: Filtrar tareas urgentes al cargar pantalla
// ============================================

useEffect(() => {
  if (!tasks) return;
  
  const urgentTasks = tasks.filter(task => 
    (task.priority === 'alta' || isOverdue(task)) && 
    task.status !== 'cerrada'
  );
  
  if (urgentTasks.length > 0) {
    console.log(`⚠️ ${urgentTasks.length} tareas urgentes encontradas`);
    
    // Programar notificaciones para cada una
    urgentTasks.forEach(async (task) => {
      await scheduleHourlyReminders(task);
    });
  }
}, [tasks]);

// ============================================
// EJEMPLO 8: Badge/Indicador visual de notificaciones activas
// ============================================

const [activeNotifications, setActiveNotifications] = useState(0);

useEffect(() => {
  const loadActiveNotifications = async () => {
    const { getAllScheduledNotifications } = require('../services/notifications');
    const scheduled = await getAllScheduledNotifications();
    setActiveNotifications(scheduled.length);
  };
  
  loadActiveNotifications();
  
  // Actualizar cada minuto
  const interval = setInterval(loadActiveNotifications, 60000);
  return () => clearInterval(interval);
}, []);

// Mostrar en UI:
<View style={styles.notificationBadge}>
  <Text style={styles.badgeText}>
    🔔 {activeNotifications} notificaciones activas
  </Text>
</View>

// ============================================
// HELPER: Verificar si tarea está vencida
// ============================================

const isOverdue = (task) => {
  return task.dueAt && new Date(task.dueAt) < new Date();
};

// ============================================
// INTEGRACIÓN COMPLETA EN RENDER
// ============================================

return (
  <View style={styles.container}>
    {/* Badge de notificaciones activas */}
    {activeNotifications > 0 && (
      <View style={styles.notificationBanner}>
        <Ionicons name="notifications-active" size={16} color="#DC2626" />
        <Text style={styles.bannerText}>
          {activeNotifications} recordatorios activos
        </Text>
      </View>
    )}
    
    {/* Botón para crear tarea con notificaciones */}
    <TouchableOpacity 
      style={styles.createButton}
      onPress={() => {
        // Abrir modal de crear tarea
        // Cuando se confirme, llamar a handleCreateTask()
      }}
    >
      <Text style={styles.buttonText}>+ Nueva Tarea</Text>
    </TouchableOpacity>
    
    {/* Lista de tareas urgentes */}
    {urgentTasks.map(task => (
      <View key={task.id} style={styles.urgentTaskCard}>
        <View style={styles.urgentHeader}>
          <Text style={styles.urgentLabel}>🚨 URGENTE</Text>
          <TouchableOpacity onPress={() => handleActivateUltraMode(task)}>
            <Text style={styles.ultraButton}>Modo Ultra</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={() => handleCompleteTask(task.id)}
        >
          <Text style={styles.completeText}>✅ Completar</Text>
        </TouchableOpacity>
      </View>
    ))}
  </View>
);

// ============================================
// ESTILOS SUGERIDOS
// ============================================

const styles = StyleSheet.create({
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bannerText: {
    marginLeft: 8,
    color: '#DC2626',
    fontWeight: '600',
  },
  urgentTaskCard: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  urgentLabel: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  ultraButton: {
    color: '#7F1D1D',
    fontWeight: 'bold',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  completeButton: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  completeText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
