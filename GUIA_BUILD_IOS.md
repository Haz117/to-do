# 📱 Guía Completa - Escenario 2 Activado (Push Notifications)

## ✅ **ESCENARIO 2 ACTIVADO**: Notificaciones entre usuarios

### 🎯 Qué incluye ahora:
- ✅ **Push notifications** cuando se asigna una tarea a otra persona
- ✅ **Notificaciones de comentarios** en tareas asignadas
- ✅ **Admin ve progreso** de todas las áreas y usuarios
- ✅ **Notificaciones locales** (recordatorios personales)

---

## 🔧 Cambios realizados:

### 1. [services/fcm.js](services/fcm.js) - ✅ Activado completamente
- Push notifications habilitadas
- Registro de tokens en Firestore
- Notificaciones al asignar tareas
- Notificaciones de comentarios

### 2. [screens/LoginScreen.js](screens/LoginScreen.js) - ✅ Actualizado
- Registra token automáticamente al iniciar sesión
- Configura notificaciones push

### 3. [App.js](App.js) - ✅ Actualizado  
- Desregistra token al cerrar sesión
- Limpia notificaciones

### 4. [services/tasks.js](services/tasks.js) - ✅ Actualizado
- Envía notificación push al crear/asignar tarea

---

## 📋 Pasos para Build de iOS

### **PASO 1: Obtener GoogleService-Info.plist**

⚠️ **CRÍTICO para iOS**: Necesitas este archivo de Firebase.

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto: **infra-sublime-464215-m5**
3. Click en ⚙️ → **Project Settings**
4. En "Your apps" → selecciona o crea **iOS app**
5. **Bundle ID debe ser**: `com.todoapp.todo` (mismo que en app.config.js)
6. Descarga **GoogleService-Info.plist**
7. Colócalo en: `C:\Users\TI\Documents\TODO\to-do\`

```powershell
# Verificar que existe:
Test-Path GoogleService-Info.plist
# Debe devolver: True
```

---

### **PASO 2: Configurar APNs (Apple Push Notification service)**

Para que funcionen las push notifications en iOS, necesitas configurar APNs:

#### A. Crear Certificate Signing Request (CSR)
1. Abre **Keychain Access** en Mac (o usa online CSR generator)
2. Menu → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Ingresa tu email de Apple Developer
4. Selecciona "Saved to disk"
5. Guarda como `TodoApp.certSigningRequest`

#### B. Crear APNs Certificate en Apple Developer
1. Ve a [developer.apple.com/account](https://developer.apple.com/account)
2. **Certificates, IDs & Profiles** → **Certificates** → **+**
3. Selecciona **Apple Push Notification service SSL (Production)**
4. Selecciona tu App ID: `com.todoapp.todo`
5. Sube el CSR del paso anterior
6. Descarga el certificado `.cer`

#### C. Subir certificado a Firebase
1. Convierte el `.cer` a `.p12`:
   ```bash
   # En Mac:
   openssl pkcs12 -export -out TodoAppAPNs.p12 -inkey privateKey.key -in apns_certificate.cer
   ```
2. Ve a Firebase Console → **Project Settings** → **Cloud Messaging**
3. En **iOS app configuration** → **APNs Certificates** → **Upload**
4. Sube el archivo `.p12`

---

### **PASO 3: Instalar EAS CLI**

```powershell
npm install -g eas-cli
```

Si falla, usa `npx`:
```powershell
npx eas-cli --version
```

---

### **PASO 4: Login a Expo**

```powershell
npx eas login
```

Necesitas cuenta Expo (gratis en expo.dev).

---

### **PASO 5: Inicializar Proyecto EAS**

```powershell
cd "C:\Users\TI\Documents\TODO\to-do"
npx eas init
```

Esto:
- ✅ Genera tu **EAS Project ID**
- ✅ Lo agrega automáticamente a `app.config.js`
- ✅ Crea configuración necesaria

**Importante**: Después de ejecutar esto, actualiza manualmente en [services/fcm.js](services/fcm.js#L69) el `projectId` con el valor generado.

---

### **PASO 6: Configurar Build**

```powershell
npx eas build:configure
```

Selecciona:
- Platform: **All** (o solo **iOS**)
- Profile: **production**

Esto crea/actualiza `eas.json`.

---

### **PASO 7: Build iOS**

```powershell
npx eas build --platform ios --profile production
```

EAS te pedirá:
- ✅ Apple Developer credentials (tu cuenta de $99/año)
- ✅ Crear/actualizar provisioning profiles
- ✅ Push notification capability (dirá "enabled" ✅)

El build tarda ~15-20 minutos.

---

## 📱 **Instalar en iPhone**

### Opción A: TestFlight (Recomendado)

1. Cuando termine el build, EAS te da un link
2. El build se sube automáticamente a App Store Connect
3. En [appstoreconnect.apple.com](https://appstoreconnect.apple.com):
   - Ve a **TestFlight**
   - Agrega testers (por email)
4. Los testers reciben invitación por email
5. Instalan TestFlight app → Aceptan invitación → Instalan tu app

### Opción B: Development Build (Para testing local)

```powershell
npx eas build --platform ios --profile development
```

Instala directamente en dispositivos registrados en tu cuenta Apple Developer.

---

## 🧪 **Probar Notificaciones Push**

### 1. En Dispositivo Físico
- ⚠️ **CRÍTICO**: Push notifications **NO funcionan en simulador**
- Debe ser iPhone real
- Debe tener iOS 13+

### 2. Flujo de prueba:

**Usuario 1 (Admin):**
1. Login en iPhone 1
2. Crear tarea
3. Asignarla a Usuario 2 (por email)

**Usuario 2:**
1. Login en iPhone 2
2. **Debe recibir notificación push**: "📋 Nueva Tarea Asignada"
3. Click en notificación → Abre la tarea

### 3. Verificar logs:

App mostrará en consola:
```
🔔 Configurando notificaciones push...
✅ Push token obtenido: ExponentPushToken[xxxxx]
✅ Token registrado en Firestore para usuario: abcd1234
```

---

## 🔧 Troubleshooting

### Error: "GoogleService-Info.plist not found"
```powershell
# Verifica que existe:
Test-Path GoogleService-Info.plist

# Si no existe, descárgalo de Firebase Console (Paso 1)
```

### Error: "Project ID not found"
```powershell
# Ejecuta:
npx eas init

# Luego actualiza manualmente services/fcm.js línea 69
```

### No recibe notificaciones push

1. **Verifica que es dispositivo físico** (no simulador)
2. **Permisos concedidos**:
   ```javascript
   // En logs debe aparecer:
   ✅ Push token obtenido: ExponentPushToken[xxxxx]
   ```
3. **APNs configurado en Firebase** (Paso 2C)
4. **Bundle ID coincide**: `com.todoapp.todo` en Firebase y app.config.js
5. **Internet activo** en ambos dispositivos

### Token no se registra

- Verifica Firestore rules permiten escritura en colección `fcmTokens`
- Checa Firebase Console → Firestore → `fcmTokens` collection existe

---

## 📊 **Dashboard Admin**

El admin puede ver:
- ✅ Progreso de todas las tareas
- ✅ Estadísticas por área
- ✅ Top performers
- ✅ Tareas vencidas de todos
- ✅ Gráficas de tendencias

Pantalla: [DashboardScreen.js](screens/DashboardScreen.js)

---

## 🎯 **Funcionalidades Completas**

### ✅ Para todos los usuarios:
- Notificaciones locales (recordatorios propios)
- Notificaciones push cuando les asignan tarea
- Notificaciones de comentarios en sus tareas
- Ver tareas asignadas a ellos

### ✅ Para Admin/Jefe:
- Ver progreso de todos
- Dashboard con estadísticas
- Asignar tareas a cualquier usuario
- Ver todas las tareas del sistema

### ✅ Sistema de roles:
- **Admin**: Acceso total, ve todo
- **Jefe**: Crea tareas, ve su área
- **Operativo**: Ve solo sus tareas asignadas

---

## 🔐 **Firestore Security Rules**

Asegúrate de tener estas rules en Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura de tokens para usuarios autenticados
    match /fcmTokens/{token} {
      allow read, write: if request.auth != null;
    }
    
    // Resto de tus rules para tasks, users, etc.
  }
}
```

---

## 💰 **Costos**

- ✅ **Expo Push Notifications**: Gratis (hasta 600 notificaciones/hora)
- ✅ **Firebase Firestore**: Plan Spark gratis (suficiente para 2 usuarios)
- ⚠️ **Apple Developer**: $99/año (requerido para iOS)
- ✅ **EAS Build**: Plan básico gratis

---

## 📞 **Siguiente Paso**

1. ⬜ Descargar `GoogleService-Info.plist` de Firebase
2. ⬜ Configurar APNs en Firebase (Paso 2)
3. ⬜ Ejecutar `npx eas init`
4. ⬜ Actualizar `projectId` en [services/fcm.js](services/fcm.js#L69)
5. ⬜ Ejecutar `npx eas build --platform ios`

**¿Estás listo para empezar? Dime cuando hayas completado el Paso 1 (GoogleService-Info.plist).**

## ✅ Optimizaciones Completadas

- ✅ Código simplificado para **solo notificaciones locales**
- ✅ FCM comentado (disponible para Escenario 2 en el futuro)
- ✅ `app.config.js` actualizado con configuración iOS
- ✅ Solo cada usuario recibe notificaciones de sus propias tareas

---

## 🚀 Pasos para Build de iOS

### 1. Instalar EAS CLI

```powershell
npm install -g eas-cli
```

Si falla, intenta:
```powershell
npx eas-cli --version
```

### 2. Login a Expo

```powershell
npx eas login
```

### 3. Inicializar Proyecto EAS

```powershell
cd "C:\Users\TI\Documents\TODO\to-do"
npx eas init
```

Esto generará automáticamente tu **Project ID** y lo agregará a `app.config.js`.

### 4. Configurar Build

```powershell
npx eas build:configure
```

Selecciona:
- Platform: **iOS**
- Profile: **production**

### 5. Hacer Build de iOS

```powershell
npx eas build --platform ios --profile production
```

⚠️ **Necesitas:**
- Cuenta de Apple Developer ($99/año)
- Certificados iOS configurados

---

## 📋 Qué incluye este build

### ✅ Notificaciones Locales Funcionando:
- Recordatorios antes de fecha límite (10 min, 1 hora, etc.)
- Notificaciones diarias de tareas pendientes
- Alertas de tareas vencidas
- Sistema de escalado de notificaciones

### ❌ NO incluye (Escenario 1):
- Push notifications remotas
- Notificación cuando otra persona asigna tarea
- Notificaciones de nuevos comentarios de otros usuarios

---

## 🔄 Para habilitar Escenario 2 (Push Notifications) en el futuro:

1. Descomentar código en `services/fcm.js`
2. Configurar Expo Push Token en Firebase
3. Actualizar `app.config.js` con:
   ```javascript
   projectId: 'tu-project-id-real'
   ```

---

## 🧪 Probar antes de Build

```powershell
# Probar en simulador iOS (si tienes Mac)
npm run ios

# Probar en Expo Go
npm start
```

---

## 📱 Instalar en iPhone Real

Después del build, EAS te dará un link para:
1. **TestFlight** (beta testing)
2. **Archivo .ipa** (distribución ad-hoc)

### Opción A: TestFlight (Recomendado)
1. EAS sube automáticamente a TestFlight
2. Agrega testers por email en App Store Connect
3. Instalan desde TestFlight app

### Opción B: Ad-hoc
1. Descarga el .ipa
2. Instala con Xcode o Apple Configurator

---

## ⚙️ Configuraciones iOS Actuales

En `app.config.js`:

```javascript
ios: {
  supportsTablet: true,
  bundleIdentifier: 'com.todoapp.todo',
  googleServicesFile: './GoogleService-Info.plist'  // ✅ Ya configurado
}
```

**⚠️ IMPORTANTE:** Asegúrate de que `GoogleService-Info.plist` existe en la raíz del proyecto.

---

## 🔧 Troubleshooting

### Error: "Google Services file not found"
```powershell
# Verifica que existe:
ls GoogleService-Info.plist
```

### Error: "No project ID"
```powershell
# Ejecuta de nuevo:
npx eas init
```

### Error: "Not logged in"
```powershell
npx eas login
npx eas whoami
```

---

## 📞 Contacto y Soporte

Si necesitas pasar al **Escenario 2** (notificaciones entre usuarios), avísame y descomentamos el código de FCM.

**Ventajas Escenario 1 (actual):**
- ✅ Sin costos de servidor
- ✅ Funciona offline
- ✅ Sin configuración adicional
- ✅ Perfecto para uso individual

**Ventajas Escenario 2 (futuro):**
- ✅ Notificaciones entre usuarios
- ✅ Alertas de asignación de tareas
- ✅ Notificaciones de comentarios
- ⚠️ Requiere Expo Push Service
