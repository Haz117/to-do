# 📱 TODO App - Guía de Usuario

## ✨ Características Implementadas

### 🎨 **Diseño Elegante estilo iPhone**
- Gradientes morados/violetas (#667eea → #764ba2)
- Headers con bordes redondeados y sombras suaves
- Tarjetas con elevación y espaciado iOS
- Tipografía San Francisco style
- Emojis para mejor UX

### 🔐 **Sistema de Administración con Roles**

#### **Credenciales de Acceso:**

Por razones de seguridad, las credenciales no están disponibles públicamente. 
Contacta al administrador del sistema para obtener acceso.

#### **Roles Disponibles:**
- **👑 Administrador (ADMIN)**: Control total
  - Agregar/eliminar usuarios
  - Cambiar roles de cualquier usuario
  - Gestionar notificaciones del sistema
  
- **👤 Miembro (MEMBER)**: Acceso estándar
  - Ver lista de usuarios
  - Crear y gestionar tareas
  
- **👁️ Invitado (GUEST)**: Solo lectura
  - Ver usuarios sin modificar
  - Ver tareas asignadas

### 🔔 **Sistema de Notificaciones Mejorado**

#### **Tipos de Notificaciones:**
1. **⏰ Recordatorio de Vencimiento**
   - Se programa 10 minutos antes de la fecha límite
   - Incluye título de la tarea

2. **📋 Recordatorios Diarios**
   - Hasta 3 recordatorios cada 24 horas
   - Solo para tareas no cerradas
   - Incluye fecha de vencimiento

3. **📋 Asignación de Tarea**
   - Notificación inmediata al asignar
   - Muestra quién asignó la tarea

#### **Gestión de Notificaciones (Solo Admin):**
- **🧪 Probar Notificación**: Envía una notificación de prueba en 2 segundos
- **📋 Ver Programadas**: Lista todas las notificaciones pendientes
- **🗑️ Cancelar Todas**: Elimina todas las notificaciones programadas

#### **Características Técnicas:**
- ✅ Canal de Android configurado con alta prioridad
- ✅ Sonido y vibración habilitados
- ✅ Logs detallados en consola para debugging
- ✅ Navegación automática al presionar notificación
- ✅ Manejo de permisos robusto

### 📅 **Selector de Fecha Mejorado**
- Separado en 2 pasos (fecha + hora) para Android
- Sin errores de "dismiss undefined"
- Formato 24 horas
- Interfaz limpia con emoji 📅

### 📊 **5 Secciones Principales**

1. **📋 Tareas** - Lista principal con filtros
2. **📊 Kanban** - Vista de tablero por estado
3. **📥 Bandeja** - Tareas asignadas al usuario actual
4. **📈 Reportes** - Análisis y métricas por área
5. **⚙️ Admin** - Gestión de usuarios y sistema

---

## 🚀 Cómo Usar la App

### **1. Iniciar Sesión en Admin**
1. Abre la pestaña **"Admin"** (⚙️)
2. Ingresa credenciales (ver arriba)
3. Presiona **"Entrar"**

### **2. Crear Usuario Nuevo (Solo Admin)**
1. En Admin, presiona **"+ Agregar Usuario"**
2. Completa:
   - Nombre completo
   - Email
   - Contraseña
   - Rol (Admin/Miembro/Invitado)
3. Presiona **"Agregar"**

### **3. Crear Tarea**
1. Ve a **"Tareas"** o **"Bandeja"**
2. Presiona el botón **+** (esquina superior derecha)
3. Completa el formulario:
   - **Título** (obligatorio)
   - **Descripción**
   - **Asignado a**: Nombre del responsable
   - **Área**: Jurídica, Obras, Tesorería, etc.
   - **Prioridad**: Baja, Media, Alta
   - **Estado**: Pendiente, En proceso, En revisión, Cerrada
   - **Fecha**: Presiona 📅 → Selecciona fecha → Selecciona hora
4. Presiona **"Crear Tarea"**

### **4. Probar Notificaciones**
1. Inicia sesión como **Admin**
2. En la sección "🔔 Gestión de Notificaciones":
   - Presiona **"🧪 Probar Notificación"**
   - Espera 2 segundos
   - Verás la notificación aparecer
3. Presiona la notificación para navegar a la tarea

### **5. Ver Notificaciones Programadas**
1. Como Admin, presiona **"📋 Ver Programadas"**
2. Verás un resumen de todas las notificaciones pendientes

---

## 🎯 Funcionalidades por Pantalla

### **📋 Tareas (HomeScreen)**
- Lista todas las tareas con filtros
- Countdown en tiempo real hasta vencimiento
- Colores según prioridad
- Filtros por área, responsable, prioridad
- Botón + para crear nueva tarea

### **📊 Kanban (KanbanScreen)**
- 4 columnas por estado:
  - 🟠 Pendiente
  - 🔵 En proceso
  - 🟣 En revisión
  - 🟢 Cerrada
- Botones para cambiar estado rápidamente
- Vista horizontal con scroll

### **📥 Mi Bandeja (MyInboxScreen)**
- Solo tareas asignadas al usuario actual
- Ordenadas por fecha de vencimiento
- Acciones rápidas:
  - ✓ Cerrar tarea
  - ⏰ Posponer 1 día (re-programa notificación)
  - 💬 Abrir chat
- Configurar nombre de usuario actual

### **📈 Reportes (ReportScreen)**
- Tarjetas por área con contadores
- Estadísticas por estado
- Lista de tareas críticas (alta prioridad)
- Lista de tareas vencidas
- Resumen general

### **⚙️ Admin (AdminScreen)**
- Login requerido
- Gestión de usuarios
- Cambio de roles
- Gestión de notificaciones (solo Admin)
- Banner muestra usuario actual y rol
- Botón de salir

---

## 🔧 Solución de Problemas

### **❌ No recibo notificaciones**
1. Verifica que estés en un **dispositivo físico** (no funciona en simulador)
2. Revisa que los permisos estén concedidos:
   - Abre Configuración → TODO → Notificaciones → Permitir
3. En la consola debe aparecer: `✅ Permisos de notificación concedidos`
4. Prueba con **"🧪 Probar Notificación"** en Admin

### **❌ Error al seleccionar fecha**
- ✅ Ya corregido: Ahora funciona en 2 pasos (fecha → hora)
- Si persiste, recarga la app

### **❌ No puedo agregar usuarios**
- Verifica que hayas iniciado sesión como **Admin**
- Solo el rol Admin puede agregar usuarios

### **❌ El chat no funciona**
- Verifica que `firebase.js` esté configurado con tus credenciales
- Revisa que Firebase Firestore esté habilitado en tu proyecto

---

## 📱 Tecnologías Usadas

- **React Native** 0.81.5
- **Expo** ~54.0.22
- **React Navigation** 6.x
- **Firebase** (Firestore para chat)
- **AsyncStorage** (almacenamiento local)
- **expo-notifications** (notificaciones locales)
- **expo-linear-gradient** (gradientes)
- **@react-native-community/datetimepicker** (selector de fecha)

---

## 🎨 Paleta de Colores

```
Gradiente Principal: #667eea → #764ba2 (Purple/Violet)
Acento iOS Blue: #007AFF
Verde Éxito: #34C759
Rojo Alerta: #FF3B30
Naranja Warning: #FF9500
Gris Texto: #1A1A1A (oscuro), #6E6E73 (medio), #8E8E93 (claro)
Fondo: #F8F9FA
```

---

## 📝 Notas Importantes

1. **Notificaciones en Expo Go**: Las notificaciones locales funcionan limitadamente en Expo Go. Para funcionalidad completa, considera hacer un build de desarrollo.

2. **Persistencia**: Los datos se guardan en AsyncStorage (local al dispositivo). No se sincronizan entre dispositivos.

3. **Chat**: Requiere conexión a internet y configuración de Firebase.

4. **Roles**: El primer usuario creado por defecto es Admin. Usa sus credenciales para gestionar el sistema.

---

## 🔄 Próximas Mejoras Sugeridas

- [ ] Sincronización en la nube (Firebase/Supabase)
- [ ] Notificaciones push remotas
- [ ] Adjuntar archivos a tareas
- [ ] Historial de cambios por tarea
- [ ] Exportar reportes a PDF
- [ ] Dark mode
- [ ] Drag & drop en Kanban (requiere build nativo)

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa la consola de Expo para logs
2. Verifica que todas las dependencias estén instaladas: `npm install`
3. Recarga la app: Presiona `r` en la terminal de Expo

---

**¡Disfruta tu app TODO! 🎉**
