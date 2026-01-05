# 🔥 CREAR ÍNDICE DE FIREBASE - URGENTE

## 🚨 ERROR ACTUAL

```
The query requires an index
```

**Causa:** El query de Firestore para operativos usa:
- `where('assignedTo', '==', email)` 
- `orderBy('createdAt', 'desc')`

Estos dos campos combinados requieren un **índice compuesto** en Firestore.

---

## ✅ SOLUCIÓN RÁPIDA (2 minutos)

### OPCIÓN 1: Clic en el Link (MÁS FÁCIL)

1. **En los logs de la terminal, busca este link:**
   ```
   https://console.firebase.google.com/v1/r/project/infra-sublime-464215-m5/firestore/indexes?create_composite=...
   ```

2. **Haz clic en el link**
   - Se abrirá Firebase Console
   - Firebase detectará automáticamente el índice necesario

3. **Clic en "Crear índice"**
   - Firebase lo creará automáticamente
   - Espera 2-3 minutos para que se active

4. **Recarga la app**
   - Presiona 'r' en la terminal de Expo
   - El error desaparecerá

---

### OPCIÓN 2: Manual en Firebase Console

Si el link no funciona:

1. **Ve a Firebase Console:**
   ```
   https://console.firebase.google.com/project/infra-sublime-464215-m5/firestore/indexes
   ```

2. **Clic en "Crear índice"**

3. **Configura el índice:**
   - **Colección:** `tasks`
   - **Campo 1:** `assignedTo` (Ascendente)
   - **Campo 2:** `createdAt` (Descendente)

4. **Clic en "Crear"**

5. **Espera 2-3 minutos** hasta que el estado sea "Habilitado"

---

## 📊 ÍNDICES NECESARIOS

Para que la app funcione correctamente con los 3 roles, necesitas estos índices:

### 1. Para OPERATIVOS (REQUERIDO)
```
Colección: tasks
Campos:
  - assignedTo (Ascendente)
  - createdAt (Descendente)
```

### 2. Para JEFES (REQUERIDO si hay jefes)
```
Colección: tasks
Campos:
  - area (Ascendente)
  - createdAt (Descendente)
```

### 3. Para ADMIN (Ya existe - query sin where)
No requiere índice compuesto

---

## 🔍 VERIFICAR QUE FUNCIONA

Después de crear el índice:

1. **Espera 2-3 minutos** (Firebase tarda en activar índices)

2. **Recarga la app:** Presiona 'r' en terminal Expo

3. **Verifica los logs:**
   ```
   🔒 Filtro OPERATIVO - Email: hazelalmaraz91@gmail.com
   📋 Tareas cargadas para operativo: X
   🔍 Tareas del operativo: [...]
   ```

4. **NO debe aparecer:**
   ```
   ❌ ERROR: The query requires an index
   ```

---

## 🛠️ SI EL ERROR PERSISTE

### Problema: "Index still building"
**Solución:** Espera más tiempo (hasta 5 minutos para índices grandes)

### Problema: "Index creation failed"
**Solución:** 
1. Borra el índice fallido
2. Créalo de nuevo
3. Verifica que los nombres de campos sean exactos

### Problema: "Permission denied"
**Solución:**
1. Verifica que tengas permisos de Editor en Firebase
2. Si eres Owner, no debería haber problema

---

## ✅ RESUMEN

**Lo que debes hacer AHORA:**

1. ✅ Buscar el link en los logs de terminal
2. ✅ Clic en el link → Firebase abre
3. ✅ Clic en "Crear índice"
4. ✅ Esperar 2-3 minutos
5. ✅ Presionar 'r' en Expo para recargar
6. ✅ Verificar que no hay más errores

**Tiempo estimado:** 3-5 minutos

---

## 📝 ESTADO ACTUAL

- ✅ Filtro de operativos implementado correctamente
- ✅ Logs de depuración agregados
- ✅ Sesión refrescada automáticamente
- ✅ Email normalizado a minúsculas
- ⏳ **FALTA: Crear índice de Firebase** ← HAZ ESTO AHORA
- ⏳ Error de `dueAt.toDate` corregido en código

**Después de crear el índice, la app funcionará perfectamente** ✅
