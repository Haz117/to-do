# Configuración de Índices de Firestore

## ⚠️ IMPORTANTE: Índice Compuesto Requerido

Para que las consultas filtradas por usuario funcionen correctamente, necesitas crear un **índice compuesto** en Firestore.

## Paso 1: Ejecutar la app

1. Ejecuta `npm start` o `expo start`
2. Intenta crear una tarea o visualizar tareas
3. Firestore detectará automáticamente la necesidad del índice compuesto
4. Verás un **error en la consola** con un enlace directo

## Paso 2: Crear el índice desde el enlace automático

El error mostrará algo como:

```
Error: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/infra-sublime-464215-m5/firestore/indexes?create_composite=...
```

**Haz clic en ese enlace** - te llevará directamente a la consola de Firebase con el índice preconfigurado.

## Paso 3: Crear el índice manualmente (alternativa)

Si el enlace automático no funciona, ve a:
https://console.firebase.google.com/project/infra-sublime-464215-m5/firestore/indexes

### Configuración del Índice Compuesto

**Collection ID:** `tasks`

**Fields indexed:**
1. **userAccess** - Type: `Arrays` - Mode: `Array-contains`
2. **createdAt** - Type: `Timestamp` - Mode: `Descending`

**Query scope:** `Collection`

### Pasos en la consola:

1. Ve a **Firestore Database** → **Indexes** → **Composite**
2. Haz clic en **Create Index**
3. Ingresa los campos según la tabla anterior
4. Haz clic en **Create**
5. Espera 2-5 minutos a que el índice se construya

## Paso 4: Verificar el índice

Una vez que el estado del índice muestre **"Enabled"** (puede tomar unos minutos), recarga tu app.

Las tareas ahora se filtrarán correctamente por usuario autenticado.

---

## ¿Por qué necesito este índice?

Firestore requiere índices compuestos para queries que combinan:
- Filtros con `array-contains` (`userAccess`)
- Ordenamiento (`orderBy createdAt desc`)

Este índice permite que cada usuario vea solo sus tareas de manera eficiente.

## Estructura de Datos

Cada tarea ahora incluye:

```javascript
{
  title: "Mi tarea",
  description: "...",
  status: "pending",
  priority: "high",
  createdBy: "abc123xyz",           // UID del usuario que creó
  createdByName: "Juan Pérez",      // Nombre para mostrar
  userAccess: ["abc123xyz"],        // Array de UIDs con acceso
  assignedTo: ["María García"],     // Nombres de asignados (legacy)
  createdAt: Timestamp,
  updatedAt: Timestamp,
  dueAt: Timestamp
}
```

## Seguridad

Para mejorar la seguridad, actualiza las reglas de Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      // Permitir lectura solo si el usuario está en userAccess
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.userAccess;
      
      // Permitir crear tareas autenticado
      allow create: if request.auth != null &&
                       request.auth.uid in request.resource.data.userAccess;
      
      // Permitir actualizar solo si tienes acceso
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.userAccess;
      
      // Permitir eliminar solo si eres el creador
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.createdBy;
    }
    
    match /tasks/{taskId}/messages/{messageId} {
      // Permitir lectura/escritura de mensajes si tienes acceso a la tarea
      allow read, write: if request.auth != null;
    }
  }
}
```

Copia y pega estas reglas en **Firestore Database** → **Rules** en Firebase Console.

---

✅ **Listo!** Tu app ahora tiene autenticación completa con tareas asociadas a usuarios.
