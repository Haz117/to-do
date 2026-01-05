# 🔐 CORRECCIÓN APLICADA: PERMISOS DE OPERATIVOS

## ✅ PROBLEMA SOLUCIONADO

**Antes:** Un usuario operativo podía ver TODAS las tareas del sistema  
**Ahora:** Un operativo SOLO ve las tareas asignadas a él

---

## 🛠️ CAMBIOS REALIZADOS

### 1. **Sesión Mejorada** (`services/authFirestore.js`)
- ✅ Agregado campo `department` a la sesión
- ✅ Agregado campo `area` a la sesión
- ✅ Creada función `refreshSession()` para actualizar datos desde Firestore
- ✅ Emails convertidos a minúsculas automáticamente

### 2. **Filtros con Logs** (`services/tasks.js`)
- ✅ Agregados logs de depuración para ver qué usuario está accediendo
- ✅ Filtro de operativos: `where('assignedTo', '==', userEmail)`
- ✅ Logs muestran cuántas tareas se cargan por rol

### 3. **Auto-refresh de Sesión** (`screens/HomeScreen.js`)
- ✅ Al abrir la app, refresca automáticamente la sesión desde Firestore
- ✅ Asegura que los datos estén siempre actualizados

### 4. **Normalización de Emails** (`screens/TaskDetailScreen.js`)
- ✅ Al crear/editar tareas, el campo `assignedTo` se guarda en minúsculas
- ✅ Evita problemas de mayúsculas/minúsculas

### 5. **Script de Normalización** (`scripts/normalizeEmails.js`)
- ✅ Script creado para normalizar emails existentes en Firestore
- ⚠️ **DEBES EJECUTAR ESTE SCRIPT UNA VEZ** (instrucciones abajo)

---

## 🚀 INSTRUCCIONES PARA APLICAR LA SOLUCIÓN

### PASO 1: Probar con un Usuario Operativo

1. **Cerrar todas las sesiones activas**
   - Si hay usuarios con la app abierta, pídeles que cierren sesión

2. **Iniciar sesión como OPERATIVO**
   - Email: `operativo@test.com` (o el email de tu usuario operativo)
   - Password: tu contraseña

3. **Revisar los logs en la consola** (terminal donde corre `npx expo start`)
   ```
   🔑 PERMISOS DE USUARIO:
     - Email: operativo@test.com
     - Rol: operativo
     - Departamento: obras
   
   🔒 Filtro OPERATIVO - Email: operativo@test.com
   📋 Tareas cargadas para operativo: 3
   ```

4. **Verificar en la app**
   - El operativo solo debe ver SUS tareas asignadas
   - No debe ver tareas de otros usuarios

---

### PASO 2: Normalizar Emails Existentes (IMPORTANTE)

Si ya tienes tareas creadas con emails que no están en minúsculas, debes ejecutar el script de normalización:

#### Opción A: Desde Expo Developer Tools

1. Abre la consola donde corre `npx expo start`
2. Presiona `i` para abrir el simulador iOS o `a` para Android
3. En la app, navega a la pantalla de Admin
4. **Importante:** Este script debe ejecutarse desde código Node.js, no desde la app

#### Opción B: Ejecutar script Node.js (RECOMENDADO)

```bash
# En la terminal, en la carpeta del proyecto
cd scripts
node -r @babel/register normalizeEmails.js
```

O si tienes problemas con ES6:

1. Crea un archivo temporal `runNormalize.js` en la raíz:
```javascript
const { normalizeAllEmails } = require('./scripts/normalizeEmails');
normalizeAllEmails();
```

2. Ejecuta:
```bash
node runNormalize.js
```

El script mostrará:
```
🚀 INICIANDO NORMALIZACIÓN DE EMAILS EN FIRESTORE
================================================

🔄 Iniciando normalización de emails de usuarios...
  ✅ Usuario actualizado: Operativo@Test.com → operativo@test.com
  
✅ Usuarios procesados:
   - Actualizados: 3
   - Sin cambios: 5
   - Total: 8

🔄 Iniciando normalización de asignaciones en tareas...
  ✅ Tarea actualizada: "Reparar bache calle 5"
     Operativo@Test.com → operativo@test.com
     
✅ Tareas procesadas:
   - Actualizadas: 12
   - Sin cambios: 38
   - Total: 50

================================================
✅ NORMALIZACIÓN COMPLETADA

⚠️ IMPORTANTE: Los usuarios deben cerrar sesión y volver a iniciar
```

---

### PASO 3: Forzar Re-login de Usuarios

**Todos los usuarios deben cerrar sesión y volver a iniciar** para que su sesión se actualice con:
- Emails normalizados
- Campo `department` actualizado
- Permisos correctos

**Opciones:**

A) **Manual:** Pedir a cada usuario que cierre sesión y vuelva a iniciar

B) **Automático:** Agregar código en `App.js` para forzar re-login:

```javascript
// En App.js, dentro de useEffect inicial
const forceRelogin = async () => {
  const version = await AsyncStorage.getItem('appVersion');
  if (version !== '2.0') {
    await logoutUser();
    await AsyncStorage.setItem('appVersion', '2.0');
    Alert.alert('Actualización', 'Por seguridad, debes iniciar sesión nuevamente');
  }
};
```

---

## 🧪 CÓMO VERIFICAR QUE FUNCIONA

### Test 1: Usuario Operativo
```
✅ Email: operativo@test.com
✅ Rol: operativo
✅ Debe ver: Solo tareas donde assignedTo = "operativo@test.com"
✅ NO debe ver: Tareas de otros operativos
✅ NO debe ver: Todas las tareas del sistema
```

### Test 2: Usuario Jefe
```
✅ Email: jefe@test.com
✅ Rol: jefe
✅ Departamento: obras
✅ Debe ver: Solo tareas donde area = "obras"
✅ NO debe ver: Tareas de otros departamentos
```

### Test 3: Usuario Admin
```
✅ Email: admin@test.com
✅ Rol: admin
✅ Debe ver: TODAS las tareas del sistema
```

---

## 📊 LOGS DE VERIFICACIÓN

En la consola deberías ver:

```bash
# Al iniciar sesión como operativo
👤 Usuario actual: {
  email: "operativo@test.com",
  role: "operativo",
  department: "obras"
}

🔄 Sesión refrescada correctamente

🔑 PERMISOS DE USUARIO:
  - Email: operativo@test.com
  - Rol: operativo
  - Departamento: obras

🔒 Filtro OPERATIVO - Email: operativo@test.com

📋 Tareas cargadas para operativo: 3
🔍 Tareas del operativo: [
  { title: "Reparar bache", assignedTo: "operativo@test.com" },
  { title: "Podar árboles", assignedTo: "operativo@test.com" },
  { title: "Limpiar parque", assignedTo: "operativo@test.com" }
]
```

---

## ⚠️ PROBLEMAS COMUNES

### "Operativo sigue viendo todas las tareas"

**Solución:**
1. Verifica que ejecutaste el script de normalización
2. Verifica que el operativo cerró sesión y volvió a iniciar
3. Revisa los logs en consola
4. Verifica en Firestore que `assignedTo` esté en minúsculas

### "Error: The query requires an index"

**Solución:**
1. Clic en el link del error en la consola
2. Firebase creará el índice automáticamente
3. Espera 2-3 minutos
4. Recarga la app

### "Los logs no aparecen"

**Solución:**
1. Asegúrate que estás en modo development: `npx expo start`
2. Abre Remote JS Debugging o React Native Debugger
3. Los logs aparecen en la consola de Metro Bundler

---

## ✅ CHECKLIST FINAL

Marca cada item cuando lo completes:

- [ ] Código actualizado (ya hecho por mí)
- [ ] Script de normalización ejecutado
- [ ] Verificar logs de usuario operativo
- [ ] Confirmar que operativo solo ve sus tareas
- [ ] Verificar que jefe solo ve su departamento
- [ ] Verificar que admin ve todo
- [ ] Todos los usuarios cerraron sesión y volvieron a iniciar
- [ ] Crear índices de Firestore si aparece error
- [ ] Documentación guardada

---

## 📝 RESUMEN TÉCNICO

**Archivos Modificados:**
1. `services/authFirestore.js` - Sesión + refreshSession()
2. `services/tasks.js` - Filtros + logs
3. `screens/HomeScreen.js` - Auto-refresh
4. `screens/TaskDetailScreen.js` - Email lowercase

**Archivos Creados:**
1. `scripts/normalizeEmails.js` - Script de normalización
2. `SOLUCION_PERMISOS_OPERATIVOS.md` - Documentación detallada
3. `INSTRUCCIONES_PERMISOS.md` - Este archivo

**Fecha:** 17 de diciembre de 2024  
**Estado:** ✅ IMPLEMENTADO - Listo para testing
