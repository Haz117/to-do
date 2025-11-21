📝 To-Do Avanzado (Expo + Firebase)

Aplicación de gestión de tareas desarrollada con React Native, Expo y Firebase.

🚀 Características

✅ **Gestión de Tareas**
- Crear, editar y eliminar tareas
- Asignación de tareas a usuarios
- Prioridades y estados personalizables
- Fechas de compromiso con recordatorios

🔐 **Autenticación**
- Sistema de login con Firebase Auth
- Roles de usuario (Admin, Jefe, Operativo)
- Gestión de permisos por departamento

🔔 **Notificaciones**
- Notificaciones push (FCM)
- Recordatorios automáticos
- Alertas de asignación de tareas
- Notificaciones de nuevos comentarios

💬 **Colaboración**
- Chat por tarea en tiempo real
- Sistema de firmas digitales
- Comentarios y actualizaciones

📊 **Vistas y Reportes**
- Vista principal tipo Bento Grid
- Vista Kanban interactiva
- Bandeja de entrada personalizada
- Reportes y estadísticas por área
- Exportación de datos (CSV)

☁️ **Sincronización**
- Firestore en tiempo real
- Fallback a almacenamiento local
- Manejo de conexión offline

📱 Compatible con iOS, Android y Web

📋 Requisitos Previos

Node.js (v14 o superior)

npm o yarn

App Expo Go en tu dispositivo móvil (para pruebas)

Cuenta en Firebase

🔧 Configuración
1️⃣ Instalar dependencias
npm install --legacy-peer-deps

2️⃣ Configurar Firebase

Crea un proyecto en Firebase Console

Copia el archivo .env.example a .env:

copy .env.example .env


Completa tus credenciales en .env:

FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
FIREBASE_MEASUREMENT_ID=tu_measurement_id

3️⃣ Instalar versiones compatibles
npx expo install --fix

🏃 Ejecutar la App
🔹 Modo desarrollo
npm start


o

npx expo start

🔹 Opciones de ejecución

Android: Presiona a o ejecuta npm run android

iOS: Presiona i o ejecuta npm run ios

Web: Presiona w o ejecuta npm run web

Dispositivo físico: Escanea el código QR con Expo Go

📁 Estructura del Proyecto
```
TODO/
├── components/          # Componentes reutilizables
│   ├── FilterBar.js
│   └── TaskItem.js
├── screens/             # Pantallas principales
│   ├── AdminScreen.js       # Configuración y administración
│   ├── HomeScreen.js        # Vista principal de tareas
│   ├── KanbanScreen.js      # Vista tipo Kanban
│   ├── LoginScreen.js       # Autenticación
│   ├── MyInboxScreen.js     # Bandeja personal
│   ├── ReportScreen.js      # Reportes y estadísticas
│   ├── TaskChatScreen.js    # Chat por tarea
│   └── TaskDetailScreen.js  # Crear/editar tareas
├── services/            # Lógica de negocio y utilidades
│   ├── auth.js             # Autenticación con Firebase Auth
│   ├── fcm.js              # Push notifications (FCM)
│   ├── notifications.js    # Gestión de notificaciones locales
│   ├── people.js           # [DEPRECATED] Migrado a roles.js
│   ├── reports.js          # Generación de reportes
│   ├── roles.js            # Gestión de roles y usuarios
│   ├── signatures.js       # Sistema de firmas digitales
│   └── tasks.js            # CRUD de tareas con Firestore
├── App.js               # Punto de entrada principal
├── firebase.js          # Configuración de Firebase
├── storage.js           # [FALLBACK] Almacenamiento local
└── app.config.js        # Configuración de Expo
```

🔥 Configurar Firestore

En Firebase Console, crea una colección llamada tasks con esta estructura:

{
  title: string,
  description: string,
  status: string,      // 'todo', 'in-progress', 'done'
  priority: string,    // 'low', 'medium', 'high'
  dueDate: timestamp,
  assignedTo: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

⚠️ Solución de Problemas
🧩 Versiones incompatibles
npx expo install --fix

🚫 Error de Metro Bundler
npx expo start -c

🗑️ Problemas con node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install --legacy-peer-deps

📄 Licencia

ISC License

---

## 🔄 Changelog - Noviembre 2025

### ✅ Correcciones y Mejoras

**Inicialización de Firebase**
- ✅ Corregido error "No Firebase App '[DEFAULT]' has been created"
- ✅ Firebase Auth ahora se inicializa correctamente con la instancia de app

**Limpieza de Código**
- ✅ Removida dependencia no usada: `@react-navigation/bottom-tabs`
- ✅ Eliminado archivo obsoleto: `services/user.js`
- ✅ Marcados archivos legacy: `storage.js`, `people.js`

**Migración a Firebase Auth**
- ✅ `MyInboxScreen` ahora usa `getCurrentUserName()` de Firebase Auth
- ✅ `TaskChatScreen` migrado a Firebase Auth
- ✅ `AdminScreen` simplificado, eliminadas funciones duplicadas
- ✅ `ReportScreen` ahora usa `subscribeToTasks()` para datos en tiempo real
- ✅ `TaskDetailScreen` migrado de `people.js` a `roles.js` (Firebase Auth)

**Nuevas Funciones**
- ✅ `getAllUsersNames()` en `roles.js` - Obtiene usuarios activos de Firebase
- ✅ Sistema centralizado de autenticación
- ✅ Sincronización en tiempo real en todas las pantallas

### 🎯 Arquitectura Mejorada

**Antes:**
- Sistema mixto: AsyncStorage + Firebase
- Usuario como string en localStorage
- Código duplicado en múltiples pantallas

**Ahora:**
- Firebase como fuente única de verdad
- Sistema de roles y permisos robusto
- Usuario autenticado desde Firebase Auth
- Updates en tiempo real con Firestore
- Código limpio y mantenible

---

👥 Autor

Tu nombre aquí

⚡ Instrucciones Rápidas

Crea un nuevo proyecto Expo:

npx create-expo-app MyTodoApp
cd MyTodoApp


Copia los archivos en la raíz del proyecto.

Instala las dependencias necesarias:

npm install firebase @react-navigation/native @react-navigation/stack @react-native-async-storage/async-storage
expo install expo-notifications react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context


Agrega tu configuración de Firebase en firebase.js.

Ejecuta la app:

npx expo start

🔐 Variables de Entorno

He creado un archivo .env con tus credenciales.

Recomendaciones:

Añade .env a tu .gitignore para no subirlo al repositorio.

Para que Expo inyecte las variables en tiempo de ejecución, app.config.js usa dotenv.

Instala dotenv como dependencia de desarrollo:

npm install dotenv --save-dev


firebase.js lee la configuración desde Constants.manifest.extra (inyectado por Expo) o process.env como respaldo.

🔒 Seguridad

Estas claves permiten acceder a tu proyecto Firebase.
Evita compartir el archivo .env en público.
Para producción, usa secrets del servidor o mecanismos seguros de configuración.git pus