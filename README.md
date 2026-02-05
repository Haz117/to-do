# 📋 TodoApp MORENA

Sistema completo de gestión de tareas con roles, permisos y sincronización en tiempo real.

![Version](https://img.shields.io/badge/version-1.0.0-9F2241) ![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28) ![Expo](https://img.shields.io/badge/Expo-SDK%2053-000020)

---

## 🚀 Características Principales

✅ **Gestión de Tareas Inteligente**
- Crear, editar y eliminar tareas
- Asignación de tareas a usuarios
- Prioridades y estados personalizables
- Fechas de compromiso con recordatorios automáticos

🔐 **Sistema de Autenticación**
- Login seguro con Firebase Auth
- Roles de usuario (Admin, Jefe, Operativo)
- Gestión de permisos por departamento
- Control de acceso basado en roles

🔔 **Notificaciones Push**
- Notificaciones en tiempo real (FCM)
- Recordatorios automáticos
- Alertas de asignación de tareas
- Notificaciones de comentarios

💬 **Colaboración en Tiempo Real**
- Chat por tarea
- Sistema de firmas digitales
- Comentarios y actualizaciones
- Sincronización instantánea con Firestore

📊 **Vistas y Reportes**
- Vista principal tipo Bento Grid
- Vista Kanban interactiva con Drag & Drop  
- Bandeja de entrada personalizada
- Reportes y estadísticas por área
- Exportación de datos (CSV)

📱 **Multiplataforma**
- Compatible con iOS, Android y Web
- Diseño responsive y adaptativo
- Trabajo sin conexión con sincronización automática

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:** Las credenciales Firebase están protegidas mediante variables de entorno.

**Para configurar tu entorno:**

1. Crea un archivo `.env` basado en `.env.example`
2. Completa tus propias credenciales de Firebase
3. **NUNCA** subas el archivo `.env` al repositorio

```bash
# ✅ Archivo incluido en .gitignore
.env
```

---

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI (se instala automáticamente)
- Cuenta en [Firebase Console](https://console.firebase.google.com/)

---

## 🔧 Instalación y Configuración

### 1️⃣ Clonar e Instalar Dependencias

```bash
git clone <repository-url>
cd to-do
npm install --legacy-peer-deps
```

### 2️⃣ Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita **Authentication** (Email/Password)
3. Crea una base de datos **Firestore**
4. Copia tus credenciales

### 3️⃣ Variables de Entorno

Crea un archivo `.env` en la raíz con tus credenciales:

```bash
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

### 4️⃣ Reglas de Firestore

Aplica estas reglas de seguridad en Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm start
# o
npx expo start
```

### Opciones de Ejecución

- **Android:** Presiona `a` en la terminal o ejecuta `npm run android`
- **iOS:** Presiona `i` o ejecuta `npm run ios`  
- **Web:** Presiona `w` o ejecuta `npm run web`
- **Dispositivo físico:** Escanea el código QR con [Expo Go](https://expo.dev/client)

---

## 📁 Estructura del Proyecto

```
to-do/
├── components/          # Componentes reutilizables UI
├── screens/             # Pantallas principales
│   ├── HomeScreen.js        # Vista principal de tareas
│   ├── LoginScreen.js       # Autenticación
│   ├── KanbanScreen.js      # Vista Kanban
│   ├── AdminScreen.js       # Administración
│   ├── MyInboxScreen.js     # Bandeja personal
│   ├── ReportScreen.js      # Reportes
│   ├── TaskDetailScreen.js  # Detalle de tarea
│   └── TaskChatScreen.js    # Chat por tarea
├── services/            # Lógica de negocio
│   ├── auth.js              # Autenticación Firebase
│   ├── tasks.js             # CRUD de tareas
│   ├── roles.js             # Gestión de roles
│   ├── notifications.js     # Notificaciones
│   └── fcm.js              # Push notifications
├── theme/               # Estilos y temas
├── utils/               # Utilidades
├── App.js              # Punto de entrada
├── firebase.js         # Configuración Firebase
└── app.config.js       # Configuración Expo
```

---

## ⚠️ Solución de Problemas

### Versiones incompatibles
```bash
npx expo install --fix
```

### Limpiar caché de Metro
```bash
npx expo start -c
```

### Reinstalar dependencias
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install --legacy-peer-deps
```

---

## 📄 Licencia

ISC License

---

## 👥 Autor

**Hazel Jared Almaraz**

---

*Desarrollado con ❤️ usando React Native, Expo y Firebase*
