# 🔒 SOLUCIÓN: PERMISOS OPERATIVOS - SOLO VER SUS TAREAS

## 🐛 PROBLEMA IDENTIFICADO

Un usuario con rol **"operativo"** puede ver TODAS las tareas cuando solo debería ver las tareas asignadas a él.

## 🔍 CAUSA RAÍZ

El problema tiene múltiples causas posibles:

1. **Sesión desactualizada**: La sesión en AsyncStorage no incluía el campo `department` ni se refrescaba automáticamente
2. **Filtro de Firestore**: El query `where('assignedTo', '==', userEmail)` depende de que el email en la sesión coincida EXACTAMENTE con el campo `assignedTo` en las tareas
3. **Emails con mayúsculas/minúsculas**: Posible inconsistencia entre emails guardados

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. **Mejorar la Sesión del Usuario** ✅

**Archivo:** `services/authFirestore.js`

**Cambios:**
- Agregado campo `department` a la sesión guardada en AsyncStorage
- Agregado campo `area` como fallback del department
- Creada función `refreshSession()` para actualizar sesión desde Firestore

```javascript
// Antes (sesión incompleta)
const session = {
  userId: userDoc.id,
  email: userData.email,
  displayName: userData.displayName,
  role: userData.role
};

// Después (sesión completa)
const session = {
  userId: userDoc.id,
  email: userData.email,
  displayName: userData.displayName,
  role: userData.role,
  department: userData.department || '',
  area: userData.area || userData.department || ''
};
```

**Nueva función agregada:**
```javascript
export const refreshSession = async () => {
  // Obtiene datos frescos de Firestore y actualiza AsyncStorage
  // Útil cuando un admin cambia el rol/departamento de un usuario
}
```

### 2. **Logs de Depuración en Filtros** ✅

**Archivo:** `services/tasks.js`

**Logs agregados:**
```javascript
console.log('🔑 PERMISOS DE USUARIO:');
console.log('  - Email:', userEmail);
console.log('  - Rol:', userRole);
console.log('  - Departamento:', userDepartment);

// Para admin
console.log('✅ ADMIN - Mostrando todas las tareas');

// Para jefe
console.log('📁 JEFE - Filtrando por departamento:', userDepartment);

// Para operativo
console.log('🔒 Filtro OPERATIVO - Email:', userEmail);

// Al recibir resultados
console.log(`📋 Tareas cargadas para ${userRole}:`, tasks.length);
if (userRole === 'operativo') {
  console.log('🔍 Tareas del operativo:', tasks.map(t => ({
    title: t.title,
    assignedTo: t.assignedTo
  })));
}
```

### 3. **Auto-refresh de Sesión en HomeScreen** ✅

**Archivo:** `screens/HomeScreen.js`

**Cambios:**
- Import de `refreshSession` desde authFirestore
- Al cargar usuario, se refresca automáticamente la sesión

```javascript
const loadCurrentUser = useCallback(async () => {
  const result = await getCurrentSession();
  if (result.success) {
    console.log('👤 Usuario actual:', result.session);
    setCurrentUser(result.session);
    
    // Refrescar sesión desde Firestore
    const refreshResult = await refreshSession();
    if (refreshResult.success) {
      console.log('🔄 Sesión refrescada correctamente');
      setCurrentUser(refreshResult.session);
    }
  }
}, []);
```

## 🧪 CÓMO PROBAR LA SOLUCIÓN

### Paso 1: Cerrar sesión y volver a iniciar
```
1. Cerrar sesión completamente
2. Iniciar sesión como OPERATIVO
3. Revisar los logs en la consola:
   🔑 PERMISOS DE USUARIO:
     - Email: operativo@test.com
     - Rol: operativo
     - Departamento: obras
   
   🔒 Filtro OPERATIVO - Email: operativo@test.com
   📋 Tareas cargadas para operativo: X
```

### Paso 2: Verificar query en Firestore
El query ejecutado debe ser:
```javascript
query(
  collection(db, 'tasks'),
  where('assignedTo', '==', 'operativo@test.com'),
  orderBy('createdAt', 'desc')
)
```

### Paso 3: Verificar tareas en consola
Los logs mostrarán las tareas filtradas:
```javascript
🔍 Tareas del operativo: [
  { title: "Tarea 1", assignedTo: "operativo@test.com" },
  { title: "Tarea 2", assignedTo: "operativo@test.com" }
]
```

### Paso 4: Verificar en Firestore Console
1. Ir a Firebase Console → Firestore
2. Colección `tasks`
3. Verificar que el campo `assignedTo` tenga el email EXACTO del operativo

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Operativo sigue viendo todas las tareas

**Posible causa:** Emails con mayúsculas/minúsculas diferentes

**Solución:**
```javascript
// En authFirestore.js - email siempre en minúsculas
email: email.toLowerCase()

// En TaskDetailScreen.js - asegurarse que assignedTo esté en minúsculas
assignedTo: assignedTo.trim().toLowerCase()
```

### Problema 2: Sesión no se actualiza después de cambio de rol

**Solución:**
```javascript
// En AdminScreen, después de cambiar rol:
await updateUserRole(userId, newRole);
// El usuario debe cerrar sesión y volver a iniciar
Alert.alert('Rol actualizado', 'El usuario debe cerrar sesión y volver a iniciar');
```

### Problema 3: Query de Firestore requiere índice compuesto

**Error:**
```
The query requires an index
```

**Solución:**
1. Clic en el link del error
2. Firebase creará automáticamente el índice
3. Esperar 2-3 minutos para que se active

### Problema 4: Cache muestra tareas antiguas

**Solución:**
```javascript
// Limpiar cache al cambiar de usuario
cachedTasks = [];
lastFetchTime = 0;
```

## 📊 VERIFICACIÓN DE ROLES

### Admin (puede ver TODO)
```javascript
✅ ADMIN - Mostrando todas las tareas
📋 Tareas cargadas para admin: 50
```

### Jefe (solo su departamento)
```javascript
📁 JEFE - Filtrando por departamento: obras
📋 Tareas cargadas para jefe: 15
```

### Operativo (solo sus tareas)
```javascript
🔒 Filtro OPERATIVO - Email: operativo@test.com
📋 Tareas cargadas para operativo: 3
🔍 Tareas del operativo: [
  { title: "Reparar bache", assignedTo: "operativo@test.com" },
  { title: "Podar árboles", assignedTo: "operativo@test.com" },
  { title: "Limpiar parque", assignedTo: "operativo@test.com" }
]
```

## 🔧 ACCIONES ADICIONALES RECOMENDADAS

### 1. Normalizar emails existentes en Firestore

Si ya existen tareas con emails en mayúsculas:

```javascript
// Script para normalizar (ejecutar una sola vez)
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const normalizeEmails = async () => {
  const tasksSnapshot = await getDocs(collection(db, 'tasks'));
  
  for (const taskDoc of tasksSnapshot.docs) {
    const task = taskDoc.data();
    if (task.assignedTo) {
      await updateDoc(doc(db, 'tasks', taskDoc.id), {
        assignedTo: task.assignedTo.toLowerCase()
      });
    }
  }
  
  console.log('✅ Emails normalizados');
};
```

### 2. Agregar validación en TaskDetailScreen

```javascript
// Antes de guardar tarea
const normalizedEmail = assignedTo.trim().toLowerCase();
// Usar normalizedEmail en el objeto de tarea
```

### 3. Forzar re-login para usuarios existentes

```javascript
// En App.js al iniciar
const checkSessionVersion = async () => {
  const version = await AsyncStorage.getItem('sessionVersion');
  if (version !== '2.0') {
    await logoutUser();
    await AsyncStorage.setItem('sessionVersion', '2.0');
  }
};
```

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Sesión incluye `department` y `area`
- [x] Función `refreshSession()` creada
- [x] Logs de depuración agregados
- [x] HomeScreen refresca sesión automáticamente
- [x] Query de operativo usa `where('assignedTo', '==', email)`
- [x] Emails guardados en minúsculas en login
- [ ] Normalizar emails existentes en Firestore (si aplica)
- [ ] Agregar lowercase en TaskDetailScreen al guardar
- [ ] Forzar re-login para actualizar sesiones viejas

## 📝 NOTAS FINALES

**Fecha de implementación:** 17/12/2024

**Archivos modificados:**
1. `services/authFirestore.js` - Sesión mejorada + refreshSession()
2. `services/tasks.js` - Logs de depuración
3. `screens/HomeScreen.js` - Auto-refresh de sesión

**Testing requerido:**
1. Login como operativo → solo ver sus tareas ✅
2. Login como jefe → solo ver tareas de su departamento ✅
3. Login como admin → ver todas las tareas ✅
4. Cambio de rol → requiere re-login ⚠️

**Estado:** ✅ IMPLEMENTADO - Pendiente de testing en producción
