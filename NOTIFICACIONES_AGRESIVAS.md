# 🚨 Sistema de Notificaciones Agresivas

## Descripción

Sistema completo de notificaciones diseñado para **NUNCA perder una tarea importante**. Incluye 4 mecanismos principales:

## 📋 Funcionalidades Implementadas

### 1️⃣ Notificaciones Recurrentes Cada Hora para Tareas Urgentes
**Función:** `scheduleHourlyReminders(task)`

- ✅ Detecta automáticamente tareas con prioridad `'alta'` o vencidas
- ✅ Programa 12 notificaciones (una cada hora durante 12 horas)
- ✅ Marcadas como `sticky` y `ongoing` (difíciles de descartar)
- ✅ Vibración más fuerte: `[0, 500, 200, 500]`
- ✅ Prioridad MAX en Android

```javascript
import { scheduleHourlyReminders } from './services/notifications';

// Usar al crear/actualizar una tarea urgente
await scheduleHourlyReminders(task);
```

### 2️⃣ Notificaciones Persistentes con Acciones Obligatorias
**Función:** `schedulePersistentNotification(task)`

- ✅ Crea notificación que NO se puede descartar fácilmente
- ✅ Incluye 3 botones de acción:
  - **✅ Completar** - Marca tarea como completa
  - **⏰ Posponer 1h** - Retrasa notificación 1 hora
  - **👁️ Ver Tarea** - Abre detalles de la tarea
- ✅ `sticky: true, ongoing: true, autoDismiss: false`
- ✅ Tracking automático con AsyncStorage

```javascript
import { schedulePersistentNotification } from './services/notifications';

// Crear notificación persistente para tarea crítica
await schedulePersistentNotification(task);
```

### 3️⃣ Sistema de Confirmación Obligatoria
**Funciones:** 
- `confirmNotificationViewed(taskId)` - Marcar como vista
- `checkUnconfirmedNotifications(tasks)` - Verificar y reprogramar

- ✅ Guarda en AsyncStorage cada notificación enviada
- ✅ Si no se confirma en **30 minutos**, se reprograma automáticamente
- ✅ Incrementa nivel de escalado si hay retraso

```javascript
import { 
  confirmNotificationViewed, 
  checkUnconfirmedNotifications 
} from './services/notifications';

// Al abrir una tarea desde notificación
await confirmNotificationViewed(taskId);

// Verificar periódicamente (cada 30 min)
await checkUnconfirmedNotifications(allTasks);
```

### 4️⃣ Sistema de Escalado Progresivo
**Función:** `scheduleEscalatedNotifications(task)`

- ✅ 6 niveles de escalado (0-5)
- ✅ Aumenta frecuencia e intensidad progresivamente
- ✅ Niveles:
  - **Nivel 0**: 1 notif/hora, vibración normal
  - **Nivel 1**: 2 notif/hora, prioridad HIGH
  - **Nivel 2**: 4 notif/hora, sticky
  - **Nivel 3**: 6 notif/hora, ongoing (no descartable)
  - **Nivel 4**: 12 notif/hora, vibración máxima
  - **Nivel 5**: 20 notif/hora (cada 3 min), vibración ultra fuerte

```javascript
import { 
  scheduleEscalatedNotifications,
  resetEscalationLevel 
} from './services/notifications';

// Programar notificaciones con escalado
await scheduleEscalatedNotifications(task);

// Resetear al completar tarea
await resetEscalationLevel(taskId);
```

## 🚀 Setup Inicial (IMPORTANTE)

### 1. Configurar Listener de Respuestas

Agregar en `App.js` al iniciar la app:

```javascript
import { setupNotificationResponseListener } from './services/notifications';

// Dentro de useEffect en App.js
useEffect(() => {
  const subscription = setupNotificationResponseListener();
  
  return () => {
    if (subscription) subscription.remove();
  };
}, []);
```

### 2. Verificar Notificaciones No Confirmadas

Agregar en `HomeScreen.js` o componente principal:

```javascript
import { checkUnconfirmedNotifications } from './services/notifications';

// Verificar cada 30 minutos
useEffect(() => {
  const interval = setInterval(async () => {
    await checkUnconfirmedNotifications(tasks);
  }, 30 * 60 * 1000); // 30 minutos
  
  return () => clearInterval(interval);
}, [tasks]);
```

## 📱 Integración en Pantallas

### En HomeScreen.js - Al crear tarea urgente:

```javascript
const handleCreateTask = async (taskData) => {
  // Crear tarea en Firebase
  const newTask = await createTask(taskData);
  
  // Si es urgente, activar notificaciones horarias
  if (newTask.priority === 'alta') {
    await scheduleHourlyReminders(newTask);
    await schedulePersistentNotification(newTask);
  }
  
  // Activar escalado para todas las tareas importantes
  await scheduleEscalatedNotifications(newTask);
};
```

### En TaskDetailScreen.js - Al marcar como completa:

```javascript
const handleCompleteTask = async () => {
  // Marcar tarea como completa
  await updateTask(taskId, { status: 'cerrada' });
  
  // Resetear escalado
  await resetEscalationLevel(taskId);
  
  // Confirmar visualización
  await confirmNotificationViewed(taskId);
};
```

### En MyInboxScreen.js - Al abrir desde notificación:

```javascript
useEffect(() => {
  // Si la tarea se abrió desde notificación
  if (route.params?.fromNotification && route.params?.taskId) {
    confirmNotificationViewed(route.params.taskId);
  }
}, [route.params]);
```

## 🔔 Tipos de Notificaciones

| Tipo | Frecuencia | Persistente | Escalable | Uso |
|------|-----------|-------------|-----------|-----|
| `hourly_urgent` | Cada hora (x12) | Sí | No | Tareas urgentes/vencidas |
| `persistent_action_required` | Inmediata | Sí | No | Tareas críticas que necesitan acción |
| `escalated` | Variable por nivel | Sí (Nivel 2+) | Sí | Cualquier tarea con recordatorios |

## ⚙️ Configuración de Escalado

```javascript
// Nivel 0: Normal
{ intervals: [60], priority: 'DEFAULT' }

// Nivel 5: Máximo (cada 3 min)
{ intervals: [3, 6, 9, 12, 15, ...60], priority: 'MAX' }
```

## 🎯 Casos de Uso Recomendados

### Caso 1: Tarea Urgente Recién Creada
```javascript
await scheduleHourlyReminders(task);        // Notif cada hora
await schedulePersistentNotification(task); // Notif persistente inmediata
await scheduleEscalatedNotifications(task); // Sistema de escalado
```

### Caso 2: Tarea Normal con Recordatorio
```javascript
await scheduleNotificationForTask(task);    // Notif antes de vencer
await scheduleEscalatedNotifications(task); // Escalado por si acaso
```

### Caso 3: Tarea Vencida No Completada
```javascript
await scheduleHourlyReminders(task);        // Notif horarias
await incrementEscalationLevel(task.id);    // Aumentar presión
await schedulePersistentNotification(task); // Notif persistente
```

## 📊 Tracking y Debug

```javascript
// Ver todas las notificaciones programadas
import { getAllScheduledNotifications } from './services/notifications';
const scheduled = await getAllScheduledNotifications();
console.log(`${scheduled.length} notificaciones programadas`);

// Ver nivel de escalado actual
import { getEscalationLevel } from './services/notifications';
const level = await getEscalationLevel(taskId);
console.log(`Nivel de escalado: ${level}`);
```

## ⚠️ Notas Importantes

1. **AsyncStorage** ya está instalado - No requiere instalación adicional
2. **Solo funciona en iOS/Android** - Web se salta automáticamente
3. **Permisos obligatorios** - Pedir permisos al iniciar la app
4. **Límite de notificaciones** - Android/iOS tienen límite (~64 programadas)
5. **Battery drain** - Notificaciones muy frecuentes consumen batería

## 🔧 Troubleshooting

### Las notificaciones no aparecen
- Verificar permisos: `await ensurePermissions()`
- Revisar si es dispositivo físico: `Device.isDevice`
- Verificar platform: `Platform.OS !== 'web'`

### Las notificaciones se pueden descartar fácilmente
- Asegurarse de usar `schedulePersistentNotification()`
- Verificar que `sticky: true` y `ongoing: true` estén configurados

### El escalado no aumenta
- Llamar `incrementEscalationLevel()` manualmente si es necesario
- Verificar que `checkUnconfirmedNotifications()` se esté ejecutando

## 📝 TODO Futuro

- [ ] Integrar con backend para sincronizar notificaciones entre dispositivos
- [ ] Agregar opción de desactivar escalado para tareas específicas
- [ ] Implementar "modo silencioso" con horarios configurables
- [ ] Dashboard de estadísticas de notificaciones respondidas/ignoradas
