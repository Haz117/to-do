# 📋 TodoApp MORENA

Sistema completo de gestión de tareas con roles, permisos y sincronización en tiempo real.

![Version](https://img.shields.io/badge/version-1.0.0-9F2241) ![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28)

---

## 📱 **DESCARGA LA APP**

### 🌐 **App Web (Disponible ahora)**
Accede desde cualquier navegador: **https://to-do-iota-opal.vercel.app**

### 📲 **App PWA (Instalar como App)**
1. Abre https://to-do-iota-opal.vercel.app en Chrome/Edge
2. Haz clic en el icono de instalar en la barra de direcciones
3. O en iOS Safari: Compartir → Agregar a pantalla de inicio

### 🔐 **Credenciales de Prueba:**
```
👑 Admin:     admin@todo.com / admin123
```

---

Aplicación de gestión de tareas desarrollada con React Native, Expo y Firebase.

## 🚀 Características

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

## 🏃 Ejecutar la App

### 🔹 Desarrollo Local
```bash
npm start
```
O usa comandos directos:
- **Web:** `npx expo start --web` (localhost:8081)
- **Android/iOS:** `npx expo start` y escanea QR con Expo Go

### 🔹 Deploy a Vercel (Producción Web)
```bash
git add .
git commit -m "tu mensaje"
git push

# Luego en Vercel dashboard: Deploy manualmente desde el commit deseado
```

## 📁 Estructura del Proyecto
```
TODO/
├── components/          # Componentes UI reutilizables
│   ├── AnimatedBadge.js, SpringCard.js, ConfettiCelebration.js
│   ├── ConnectionIndicator.js   # Indicador de conectividad
│   ├── FilterBar.js, SearchBar.js
│   └── TaskItem.js              # Item de tarea con animaciones
├── screens/             # Pantallas principales
│   ├── AdminScreen.js       # Panel de administración
│   ├── CalendarScreen.js    # Vista de calendario
│   ├── HomeScreen.js        # Vista principal de tareas
│   ├── KanbanScreen.js      # Tablero Kanban drag & drop
│   ├── LoginScreen.js       # Autenticación
│   ├── MyInboxScreen.js     # Mi Bandeja
│   ├── ReportScreen.js      # Reportes y analytics
│   ├── TaskChatScreen.js    # Chat por tarea
│   └── TaskDetailScreen.js  # Crear/editar tareas
├── services/            # Lógica de negocio
│   ├── authFirestore.js    # Autenticación con Firebase Auth
│   ├── tasks.js            # CRUD de tareas (tiempo real con onSnapshot)
│   ├── analytics.js        # Métricas y estadísticas
│   ├── offlineQueue.js     # Sistema de cola para modo offline
│   ├── fcm.js              # Push notifications (FCM)
│   ├── roles.js            # Gestión de roles y usuarios
│   └── reports.js          # Generación de reportes CSV
├── contexts/
│   └── ThemeContext.js     # Provider de tema claro/oscuro
├── firebase.js          # Configuración de Firebase
├── app.config.js        # Configuración de Expo
└── vercel.json          # Configuración deploy Vercel
```

## 🔥 Configurar Firebase

1. **Crear proyecto en Firebase Console**
2. **Habilitar servicios:**
   - Authentication (Email/Password)
   - Firestore Database
   - Realtime Database (para .info/connected)
   - Cloud Messaging (FCM) para notificaciones

3. **Configurar Firestore Rules** (firestore.rules ya incluido en el proyecto)
4. **Crear índices compuestos** (ver CREAR_INDICE_FIREBASE.md)

### Estructura de Colecciones:
```
tasks/                    # Tareas
  ├── {taskId}
  │   ├── title: string
  │   ├── status: 'pendiente' | 'en_proceso' | 'en_revision' | 'cerrada'
  │   ├── priority: 'baja' | 'media' | 'alta'
  │   ├── assignedTo: string (email)
  │   ├── area: string
  │   ├── createdAt: Timestamp
  │   └── messages/        # Subcollection para chat
  └── ...

users/                    # Usuarios
  ├── {userId}
  │   ├── email: string
  │   ├── role: 'admin' | 'jefe' | 'operativo'
  │   ├── department: string
  │   └── name: string
  └── ...
```

## ⚠️ Solución de Problemas

### 🧩 Versiones incompatibles
```bash
npx expo install --fix
```

### 🚫 Error de Metro Bundler
```bash
npx expo start -c
```

### 🗑️ Problemas con node_modules
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install --legacy-peer-deps
```

### 🌐 Error en Web (LinearGradient)
✅ **Ya resuelto**: Todos los LinearGradient fueron eliminados por compatibilidad web

### 🎨 Modo oscuro muy brillante
✅ **Ya resuelto**: Color primary cambiado de #FF6B9D a #B8314F en modo oscuro

---

## 📄 Licencia

ISC License

---

## 🎉 Últimas Actualizaciones - Enero 2026

### ✅ Mejoras de UX/UI
- 🎨 **Modo oscuro refinado**: Color primary suavizado (#B8314F) para mejor legibilidad
- 📱 **Kanban responsive**: Columnas se adaptan al ancho de pantalla (min 350px en web)
- 🖥️ **Compatibilidad web total**: Eliminados LinearGradient de todos los componentes
- 🌙 **Adaptación completa**: CalendarScreen, MyInboxScreen, ReportScreen, KanbanScreen en dark mode

### ✅ Optimizaciones de Performance
- ⚡ **React.memo** agregado a SpringCard, ConfettiCelebration, ProgressBadge
- 🔄 **Tiempo real optimizado**: subscribeToTasks usa onSnapshot (sin límites innecesarios)
- 💾 **Sistema offline robusto**: offlineQueue.js con AsyncStorage y NetInfo
- 🎭 **Animaciones optimizadas**: FadeInView con memo reduce re-renders

### 🎯 Arquitectura
- Firebase Auth como fuente única de verdad
- Sistema de roles: admin/jefe/operativo con permisos específicos
- Sincronización en tiempo real con Firestore
- PWA listo para instalar desde navegador

---

👥 **Autor:** Hazel Jared Almaraz


firebase.js lee la configuración desde Constants.manifest.extra (inyectado por Expo) o process.env como respaldo.
