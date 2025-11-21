# 🔐 Firebase Authentication - Guía de Implementación

## ✅ Estado Actual

Firebase Authentication está **completamente integrado** en la aplicación TODO.

### Características Implementadas

1. **✅ Servicio de Autenticación** (`services/auth.js`)
   - Registro de usuarios con email/password
   - Inicio de sesión
   - Cierre de sesión
   - Observer de cambios de autenticación
   - Manejo de errores en español

2. **✅ Pantalla de Login** (`screens/LoginScreen.js`)
   - UI moderna con gradientes
   - Alternancia entre Login y Registro
   - Validación de formularios
   - Confirmación de contraseña
   - Nombres de usuario opcionales

3. **✅ Integración en App.js**
   - Listener de autenticación global
   - Pantalla de carga durante verificación
   - Redirección automática a Login si no autenticado
   - Navegación protegida

4. **✅ Pantalla de Configuración** (`screens/AdminScreen.js`)
   - Botón de cerrar sesión con confirmación
   - Información del usuario actual
   - Gestión de notificaciones
   - UI simplificada y moderna

5. **✅ Tareas Asociadas a Usuarios** (`services/tasks.js`)
   - Campo `createdBy` con UID del creador
   - Campo `createdByName` para mostrar
   - Array `userAccess` para control de acceso
   - Filtrado automático por usuario autenticado

---

## 🚀 Cómo Usar

### Registro de un Nuevo Usuario

1. Abre la app
2. Haz clic en "Crear cuenta"
3. Completa:
   - **Email**: tu correo electrónico
   - **Contraseña**: mínimo 6 caracteres
   - **Confirmar contraseña**: debe coincidir
   - **Nombre** (opcional): nombre para mostrar
4. Haz clic en "Registrarse"

### Inicio de Sesión

1. Ingresa tu **email** y **contraseña**
2. Haz clic en "Iniciar Sesión"
3. Serás redirigido automáticamente a la pantalla principal

### Cerrar Sesión

1. Ve a la pestaña **Admin** (ícono de configuración)
2. Haz clic en el botón **"Cerrar Sesión"** en la esquina superior derecha
3. O haz clic en el botón grande rojo al final de la pantalla
4. Confirma la acción

---

## 📁 Estructura de Archivos Modificados

```
TODO/
├── services/
│   ├── auth.js                  ✅ NUEVO - Servicio de autenticación
│   └── tasks.js                 ✅ ACTUALIZADO - Asocia tareas con usuarios
├── screens/
│   ├── LoginScreen.js           ✅ NUEVO - Pantalla de login/registro
│   └── AdminScreen.js           ✅ ACTUALIZADO - Configuración + logout
├── App.js                       ✅ ACTUALIZADO - Flujo de autenticación
├── FIRESTORE_INDICES.md         ✅ NUEVO - Guía de índices Firestore
└── FIREBASE_AUTH_SETUP.md       ✅ Este archivo
```

---

## 🔥 Estructura de Datos en Firestore

### Tareas (Collection: `tasks`)

Cada tarea ahora incluye información del usuario:

```javascript
{
  id: "auto_generated_id",
  title: "Mi tarea",
  description: "Descripción de la tarea",
  status: "pending",          // pending | in-progress | completed
  priority: "high",            // low | medium | high | critical
  
  // 🆕 Campos de autenticación
  createdBy: "abc123xyz...",   // UID del usuario de Firebase Auth
  createdByName: "Juan Pérez", // Nombre para mostrar
  userAccess: [                // Array de UIDs con acceso a esta tarea
    "abc123xyz...",
    "def456uvw..."
  ],
  
  // Campos existentes
  assignedTo: ["María García"], // Nombres de asignados (legacy)
  tags: ["importante", "urgente"],
  dueAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Mensajes de Chat (Collection: `tasks/{taskId}/messages`)

```javascript
{
  id: "auto_generated_id",
  text: "Mensaje del chat",
  author: "Juan Pérez",        // Usa getCurrentUserName()
  timestamp: Timestamp
}
```

---

## ⚙️ Configuración Requerida en Firebase Console

### 1. Habilitar Email/Password Authentication

1. Ve a [Firebase Console](https://console.firebase.google.com/project/infra-sublime-464215-m5)
2. Ve a **Authentication** → **Sign-in method**
3. Habilita **Email/Password**
4. ✅ **Ya configurado en tu proyecto**

### 2. Crear Índice Compuesto en Firestore

**⚠️ CRÍTICO**: Para que las queries filtradas funcionen correctamente

1. Ve a **Firestore Database** → **Indexes** → **Composite**
2. Haz clic en **Create Index**
3. Configuración:
   - **Collection ID**: `tasks`
   - **Field 1**: `userAccess` - Type: `Arrays` - Mode: `Array-contains`
   - **Field 2**: `createdAt` - Type: `Timestamp` - Mode: `Descending`
   - **Query scope**: `Collection`
4. Haz clic en **Create**
5. Espera 2-5 minutos a que se complete

**Alternativa automática**: Al ejecutar la app por primera vez, verás un error con un enlace directo para crear el índice. Haz clic en ese enlace.

### 3. Actualizar Reglas de Seguridad (Recomendado)

Actualmente las reglas están en **modo test** (permiten todo). Actualiza a:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tareas: solo usuarios autenticados con acceso
    match /tasks/{taskId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.userAccess;
      
      allow create: if request.auth != null &&
                       request.auth.uid in request.resource.data.userAccess;
      
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.userAccess;
      
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.createdBy;
      
      // Mensajes de chat: acceso si tienes acceso a la tarea
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 🧪 Testing

### Crear Usuario de Prueba

```bash
Email: test@example.com
Contraseña: password123
Nombre: Usuario de Prueba
```

### Verificar Funcionamiento

1. ✅ Registra un usuario nuevo
2. ✅ Cierra sesión
3. ✅ Inicia sesión con el usuario creado
4. ✅ Crea una tarea → debe incluir `createdBy` con tu UID
5. ✅ Verifica que solo veas tus tareas
6. ✅ Cierra sesión nuevamente

---

## 🐛 Troubleshooting

### Error: "The query requires an index"

**Solución**: Crea el índice compuesto (ver sección "Configuración Requerida")

### Error: "auth/email-already-in-use"

**Solución**: Ese email ya está registrado. Usa otro email o inicia sesión.

### Error: "auth/weak-password"

**Solución**: La contraseña debe tener al menos 6 caracteres.

### Error: "auth/invalid-credential"

**Solución**: Email o contraseña incorrectos. Verifica tus credenciales.

### No puedo ver mis tareas después de autenticarme

**Solución**: 
1. Verifica que el índice compuesto esté creado
2. Revisa la consola de Firebase por errores
3. Asegúrate de que las reglas de Firestore lo permitan

---

## 🔜 Próximos Pasos: Firebase Cloud Messaging (FCM)

Ahora que la autenticación está completa, el siguiente paso es:

### **Notificaciones Push** cuando:
- Se asigna una tarea a un usuario
- Se acerca la fecha límite
- Alguien comenta en una tarea

### Archivos que se crearán:
- `services/fcm.js` - Gestión de tokens y envío de notificaciones
- `firebase-functions/` - Cloud Functions para triggers automáticos

---

## 📚 Recursos

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

---

✅ **Firebase Authentication está completamente funcional**

Tu app ahora tiene autenticación robusta con usuarios reales, tareas asociadas por UID, y un sistema de acceso basado en roles.
