# 🔐 Aplicar Reglas de Seguridad en Firebase

## ⚠️ IMPORTANTE
Estas reglas deben aplicarse ANTES de usar la app en producción. Sin ellas, cualquier usuario puede ver/modificar cualquier dato.

---

## 📝 Pasos para Aplicar las Reglas

### 1. Abrir Firebase Console
1. Ir a: https://console.firebase.google.com/
2. Seleccionar proyecto: **infra-sublime-464215-m5**
3. En el menú lateral, clic en **Firestore Database**

### 2. Ir a la Pestaña "Reglas"
1. En la parte superior, verás pestañas: "Datos" | "Reglas" | "Índices" | "Uso"
2. Clic en **"Reglas"**
3. Verás un editor de código con las reglas actuales

### 3. Reemplazar las Reglas
1. **BORRAR TODO** el contenido actual (probablemente está en modo test)
2. **COPIAR** todo el contenido del archivo `firestore.rules` (en la raíz del proyecto)
3. **PEGAR** en el editor de Firebase Console

### 4. Publicar las Reglas
1. Clic en botón **"Publicar"** (arriba a la derecha)
2. Confirmar en el diálogo que aparece
3. Esperar mensaje de confirmación: "Reglas publicadas correctamente"

---

## ✅ Verificación

Después de publicar, verifica que las reglas estén activas:

### En Firebase Console:
- Las reglas deben mostrar: `rules_version = '2';`
- Debe aparecer la fecha/hora de última publicación
- Estado: "Activo"

### Probar en la App:
1. Cerrar sesión si estás logueado
2. Intentar abrir la app sin login → debe pedir autenticación
3. Login con usuario normal → debe ver solo SUS tareas
4. No debe poder eliminar tareas de otros usuarios

---

## 🚨 Si Algo Sale Mal

### Revertir a Modo Test (temporal):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ NUNCA dejar en modo test en producción**

---

## 📋 Crear Primer Usuario Admin

Después de aplicar las reglas, necesitas crear el primer usuario Admin MANUALMENTE:

### Opción A: Desde Firebase Console
1. Ir a **Authentication** → **Users**
2. Clic en **"Add user"**
3. Ingresar:
   - Email: `alcalde@municipio.gob.mx` (o el que uses)
   - Password: `*******` (contraseña segura)
4. Copiar el **UID** del usuario creado (algo como: `abc123def456...`)

5. Ir a **Firestore Database** → **Datos**
6. Crear colección `users` (si no existe)
7. Agregar documento con ID = **UID copiado**
8. Campos:
   ```
   email: "alcalde@municipio.gob.mx"
   displayName: "Presidente Municipal"
   role: "admin"
   department: "presidencia"
   active: true
   createdAt: (usar timestamp actual)
   ```

### Opción B: Desde la App
1. En LoginScreen, registrar nuevo usuario con email del admin
2. Inmediatamente ir a Firestore Console
3. Editar el documento del usuario recién creado
4. Cambiar `role: "operativo"` → `role: "admin"`

---

## 🎯 Siguiente Paso

Una vez tengas el usuario Admin:

1. **Admin crea Jefes de Área:**
   - Registrar usuarios para cada director
   - Admin cambia rol de `operativo` → `jefe`
   - Asignar departamento correcto

2. **Jefes crean Operativos:**
   - Cada jefe registra a su personal
   - Se quedan con rol `operativo`
   - Departamento heredado del jefe

---

## 🔍 Estructura Final en Firestore

```
users/
  ├── uid_alcalde/
  │   ├── email: "alcalde@municipio.gob.mx"
  │   ├── role: "admin"
  │   └── department: "presidencia"
  │
  ├── uid_director_obras/
  │   ├── email: "director.obras@municipio.gob.mx"
  │   ├── role: "jefe"
  │   └── department: "obras"
  │
  └── uid_operativo_obras/
      ├── email: "operativo@municipio.gob.mx"
      ├── role: "operativo"
      └── department: "obras"

tasks/
  └── task_id_123/
      ├── title: "Reparar baches"
      ├── department: "obras"
      ├── userAccess: ["uid_director_obras", "uid_operativo_obras"]
      └── createdBy: "uid_director_obras"
```

---

## 🛡️ Seguridad Implementada

✅ **Sin autenticación** → No se puede acceder a nada
✅ **Usuario normal** → Solo ve tareas donde está en `userAccess`
✅ **Jefe de área** → Ve tareas de su departamento
✅ **Admin** → Ve todo y puede modificar roles
✅ **Mensajes de chat** → Inmutables (no se pueden editar/borrar)
✅ **Firmas digitales** → Inmutables
✅ **Logs de auditoría** → Solo admin puede leer, nadie puede modificar

---

## 📞 Soporte

Si tienes errores al publicar las reglas:
1. Verifica que copiaste TODO el contenido de `firestore.rules`
2. Asegúrate de que empiece con `rules_version = '2';`
3. Revisa que no haya errores de sintaxis (Firebase los marca en rojo)
4. Si persiste, envía screenshot del error
