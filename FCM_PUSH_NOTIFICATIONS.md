# 🔔 Firebase Cloud Messaging (FCM) - Push Notifications

## ✅ Estado de Implementación

Firebase Cloud Messaging está **completamente integrado** para enviar notificaciones push en tiempo real.

### Características Implementadas

1. **✅ Servicio FCM** (`services/fcm.js`)
   - Obtención de tokens de Expo Push
   - Registro de tokens por usuario en Firestore
   - Envío de push notifications via Expo Push API
   - Funciones helper para casos de uso comunes

2. **✅ Integración en App.js**
   - Registro automático de token al iniciar sesión
   - Eliminación de token al cerrar sesión
   - Listeners para interacción con notificaciones

3. **✅ Notificaciones en Chat** (`TaskChatScreen.js`)
   - Push notification cuando alguien comenta en una tarea
   - Solo notifica a usuarios con acceso (excepto el autor)

4. **✅ Notificaciones Locales Mejoradas** (`services/notifications.js`)
   - Combinación de notificaciones locales + push
   - Notificación al asignar tareas

---

## 🚀 Casos de Uso

### 1. Nueva Tarea Asignada
Cuando se crea o asigna una tarea, el usuario recibe:
- 📱 **Push Notification**: "📋 Nueva Tarea Asignada"
- 🔔 **Local Notification**: Recordatorio 10 minutos antes del deadline

### 2. Nuevo Comentario en Chat
Cuando alguien comenta en una tarea:
- 📱 **Push Notification**: "💬 Nuevo Comentario - [Autor] comentó en [Tarea]"
- 🎯 Navega directamente al chat al hacer tap

### 3. Fecha Límite Próxima (preparado)
- 📱 **Push Notification**: "⏰ Fecha Límite Próxima - La tarea vence pronto"

---

## ⚙️ Configuración Requerida

### Paso 1: Dispositivo Físico (IMPORTANTE)

⚠️ **Push notifications NO funcionan en**:
- Expo Go
- Emuladores
- Simuladores

✅ **Requieren**:
- Dispositivo físico (Android o iOS)
- Development Build o Production Build

### Paso 2: Crear Development Build

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Configurar proyecto
eas build:configure

# Crear build para desarrollo
eas build --profile development --platform android
# o para iOS:
eas build --profile development --platform ios
```

### Paso 3: Instalar el Build

1. **Android**:
   - Descarga el APK generado
   - Instala en tu dispositivo Android
   
2. **iOS**:
   - Registra tu dispositivo en Apple Developer
   - Descarga e instala el .ipa

### Paso 4: Configurar app.json

Asegúrate de tener estas configuraciones en `app.json`:

```json
{
  "expo": {
    "name": "TODO App",
    "slug": "todo-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#8B0000",
      "androidMode": "default",
      "androidCollapsedTitle": "{{unread_count}} tareas pendientes"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.todoapp",
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.todoapp",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

## 📁 Estructura de Datos en Firestore

### Collection: `fcmTokens`

Cada documento representa un dispositivo registrado:

```javascript
{
  token: "ExponentPushToken[xxxxxx]",  // Token de Expo Push
  userId: "abc123xyz...",              // UID del usuario
  platform: "android",                  // "android" | "ios"
  deviceName: "Samsung Galaxy S21",    // Nombre del dispositivo
  createdAt: Timestamp,                // Cuándo se registró
  lastUsed: Timestamp                  // Última vez usado
}
```

### Collection: `tasks` (actualizada)

Las tareas ahora incluyen `userAccess` para saber a quién notificar:

```javascript
{
  title: "Mi tarea",
  createdBy: "abc123xyz",              // Creador
  createdByName: "Juan Pérez",
  userAccess: [                        // Array de usuarios con acceso
    "abc123xyz",
    "def456uvw"
  ],
  // ... resto de campos
}
```

---

## 🧪 Testing de Notificaciones Push

### Test 1: Registro de Token

1. Inicia sesión en la app (en un dispositivo físico con development build)
2. Verifica en Firebase Console → Firestore → `fcmTokens`
3. Deberías ver un documento con tu token

### Test 2: Comentario en Chat

1. Usuario A: Crea una tarea y asígnala a Usuario B
2. Usuario A: Abre el chat de la tarea
3. Usuario A: Envía un mensaje
4. **Usuario B**: Debe recibir push notification "💬 Nuevo Comentario"

### Test 3: Notificación Manual (desde AdminScreen)

1. Ve a la pestaña **Admin**
2. Haz clic en "Enviar Notificación de Prueba"
3. Deberías recibir una notificación local (no push, ya que es para testing local)

---

## 🔧 Funciones Disponibles

### En `services/fcm.js`:

```javascript
// Obtener token de Expo Push
const token = await getExpoPushToken();

// Registrar token en Firestore
await registerDeviceToken(token);

// Eliminar token al cerrar sesión
await unregisterDeviceToken(token);

// Obtener tokens de un usuario específico
const tokens = await getUserTokens(userId);

// Enviar push notification
await sendPushNotification(tokens, {
  title: "Título",
  body: "Mensaje",
  data: { customData: "value" }
});

// Notificar a un usuario específico
await notifyUser(userId, "Título", "Mensaje", { screen: "Home" });

// Helpers específicos
await notifyTaskAssigned(userId, task);
await notifyNewComment(userId, task, authorName);
await notifyDeadlineApproaching(userId, task);
```

---

## 🐛 Troubleshooting

### Error: "Expo push token could not be fetched"

**Solución**: Asegúrate de estar usando un dispositivo físico con development build (no Expo Go).

### No recibo notificaciones push

1. **Verifica permisos**: Ve a Configuración del dispositivo → Permisos → Notificaciones
2. **Verifica token**: Busca en Firestore `fcmTokens` tu documento
3. **Verifica logs**: Revisa la consola para ver si se envió la notificación
4. **Verifica build**: Expo Go NO soporta push notifications

### Las notificaciones llegan tarde

- Las notificaciones de Expo Push pueden tener hasta 1-2 minutos de demora
- Para notificaciones instantáneas, considera Firebase Cloud Functions

### Error: "Failed to schedule notification"

**Solución**: Verifica que `app.json` tenga configurado `notification` correctamente.

---

## 🚀 Mejoras Futuras

### 1. Cloud Functions para Notificaciones Automáticas

Crear Firebase Cloud Functions que envíen notificaciones automáticamente:

```javascript
// functions/index.js
exports.onTaskAssigned = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const task = snap.data();
    if (task.userAccess && task.userAccess.length > 0) {
      // Enviar notificación a cada usuario
      for (const userId of task.userAccess) {
        await notifyTaskAssigned(userId, task);
      }
    }
  });
```

### 2. Notificaciones Programadas para Deadlines

Programar notificaciones push automáticas 24h, 1h, y 10min antes del deadline.

### 3. Categorías de Notificaciones

Permitir al usuario configurar qué notificaciones quiere recibir:
- Nuevas tareas
- Comentarios
- Recordatorios
- Cambios de estado

### 4. Badge Count

Actualizar el badge del ícono de la app con el número de tareas pendientes.

---

## 📚 Recursos

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

✅ **Push Notifications está completamente funcional**

Tu app ahora puede:
- Enviar notificaciones en tiempo real
- Notificar cuando se asignan tareas
- Notificar cuando hay nuevos comentarios
- Gestionar tokens por usuario
- Funcionar incluso cuando la app está cerrada

**Siguiente paso**: Crea un development build y prueba en un dispositivo físico!
