# 🎓 Guía de Capacitación - Sistema de Tareas Municipal

## 👥 Audiencia
Personal del Gobierno Municipal (Presidencia, Obras, Jurídica, Tesorería, RRHH, Administración)

---

## 📱 Requisitos Previos

### Dispositivos Compatibles
- ✅ **Android** 10 o superior
- ✅ **iPhone** iOS 13 o superior

### Instalación (cuando esté publicada)
1. Descargar desde Google Play Store (Android) o App Store (iOS)
2. O usar archivo APK (Android) - requiere "Permitir instalación desde fuentes desconocidas"

---

## 🚀 Primeros Pasos

### 1. Registro de Cuenta

**Para Operativos:**
1. Abrir la app
2. Clic en **"Regístrate"**
3. Llenar formulario:
   - **Nombre completo**: Tu nombre real (aparecerá en las tareas)
   - **Email**: Correo institucional (ej: `nombre@municipio.gob.mx`)
   - **Departamento**: Seleccionar tu área (Obras, Jurídica, etc.)
   - **Contraseña**: Mínimo 6 caracteres
   - **Confirmar contraseña**: Misma contraseña
4. Clic en **"Registrarse"**
5. ✅ Tu cuenta se crea con rol "Operativo"

**Para Administradores:**
- El primer Admin se crea manualmente (ver documentación técnica)
- Admins pueden cambiar roles de otros usuarios

---

## 🏠 Pantalla Principal (Home)

### Vista General
```
┌─────────────────────────────┐
│  🏛️ TODO Municipal         │
│  [🔍 Buscar...]            │
│  [Todas ▼] [Alta ▼]       │
├─────────────────────────────┤
│  📋 Reparar alumbrado      │
│     🏗️ Obras · 🔴 Alta     │
│     ⏰ Vence: 25/Nov       │
├─────────────────────────────┤
│  📋 Revisión de contratos  │
│     ⚖️ Jurídica · 🟡 Media │
│     ⏰ Vence: 30/Nov       │
└─────────────────────────────┘
```

### Acciones Rápidas
- **Deslizar izquierda** (←) → Eliminar tarea
- **Deslizar derecha** (→) → Marcar como completada
- **Tocar tarea** → Ver detalles completos

---

## ➕ Crear Nueva Tarea

### Desde la Pantalla Principal
1. Clic en botón **"+" flotante** (abajo a la derecha)
2. Llenar formulario:

   **Título** (obligatorio)
   - Ej: "Reparar baches en Av. Juárez"
   - Máximo 100 caracteres
   
   **Descripción** (obligatorio)
   - Detalles completos del trabajo
   - Ej: "5 baches de 20cm aprox. entre calles 5 y 6"
   
   **Prioridad**
   - 🔴 **Alta**: Urgente, emergencias
   - 🟡 **Media**: Importante pero puede esperar
   - 🟢 **Baja**: Sin fecha crítica
   
   **Fecha Límite**
   - Tocar el campo para abrir calendario
   - Seleccionar fecha de vencimiento
   
   **Asignar A** (opcional)
   - Ej: "Juan Pérez, María López"
   - Separar con comas
   
   **Etiquetas** (opcional)
   - Ej: "infraestructura, urgente"
   - Ayudan a filtrar después

3. Clic en **"Crear Tarea"**
4. ✅ La tarea aparece inmediatamente en tu lista

---

## 📝 Gestionar Tareas

### Ver Detalles
1. Tocar cualquier tarea
2. Ver información completa:
   - Descripción detallada
   - Fecha de creación
   - Quién la creó
   - Estado actual
   - Comentarios

### Actualizar Estado
En la pantalla de detalles:
- **Pendiente** → Aún no iniciada
- **En Progreso** → Trabajando en ella
- **Completada** → Terminada

### Cambiar Prioridad
- Tocar el selector de prioridad
- Elegir: Alta, Media o Baja

### Modificar Fecha Límite
- Tocar el campo de fecha
- Seleccionar nueva fecha en calendario

---

## 💬 Comentarios y Colaboración

### Agregar Comentario
1. Abrir tarea
2. Scroll hasta abajo → sección **"Chat"**
3. Escribir comentario en campo de texto
4. Clic en **"Enviar"** (ícono de avión)
5. ✅ **TODOS** los usuarios asignados reciben notificación push

### Ver Historial
- Todos los comentarios se guardan
- Muestra quién comentó y cuándo
- No se pueden editar ni borrar (auditoría)

---

## 🔔 Notificaciones

### Tipos de Notificaciones
1. **Nueva tarea asignada** 
   - "Te asignaron: Reparar alumbrado"
   
2. **Nuevo comentario**
   - "Juan comentó en: Reparar baches"
   
3. **Próxima a vencer**
   - "Tarea vence mañana: Revisión de contratos"

### Configurar Notificaciones
1. Al abrir la app por primera vez
2. Permitir notificaciones cuando pregunte
3. Si las rechazaste:
   - Android: Ajustes → Apps → TODO → Notificaciones
   - iOS: Ajustes → TODO → Notificaciones

---

## 📊 Vistas Diferentes

### 🏠 Inicio
- Todas tus tareas en lista
- Puedes buscar y filtrar

### 📋 Kanban
- Vista de tablero (columnas):
  - **Pendiente** | **En Progreso** | **Completada**
- Arrastra tareas entre columnas

### 📥 Mi Bandeja
- Solo tareas asignadas a TI
- Ideal para concentrarte en tu trabajo

### 📈 Reportes (Solo Jefe y Admin)
- Estadísticas del departamento
- Exportar a Excel
- Ver productividad

### ⚙️ Configuración
- Ver tu perfil
- Cerrar sesión
- Probar notificaciones

---

## 🎯 Según Tu Rol

### 👷 Operativo (Personal)
**Puedes:**
- ✅ Ver tareas asignadas a ti
- ✅ Actualizar estado de tus tareas
- ✅ Comentar en tareas
- ✅ Crear tareas para ti mismo
- ✅ Recibir notificaciones

**NO puedes:**
- ❌ Ver tareas de otros departamentos
- ❌ Eliminar tareas de otros
- ❌ Cambiar roles de usuarios
- ❌ Acceder a reportes completos

### 👔 Jefe de Área (Director)
**Puedes (además de lo anterior):**
- ✅ Ver TODAS las tareas de tu departamento
- ✅ Crear tareas para tu equipo
- ✅ Asignar tareas a operativos
- ✅ Exportar reportes de tu área
- ✅ Ver estadísticas del departamento

**NO puedes:**
- ❌ Ver tareas de otros departamentos
- ❌ Cambiar roles de usuarios

### 🏛️ Administrador (Alcalde, Secretario)
**Puedes TODO:**
- ✅ Ver tareas de TODOS los departamentos
- ✅ Crear tareas en cualquier área
- ✅ Cambiar roles de usuarios
- ✅ Exportar reportes completos
- ✅ Ver logs de auditoría
- ✅ Eliminar cualquier tarea

---

## 🔒 Seguridad y Privacidad

### Datos Protegidos
- ✅ Tu contraseña está cifrada (nadie puede verla)
- ✅ Solo ves tareas donde tienes acceso
- ✅ Cada acción queda registrada (auditoría)
- ✅ Los comentarios no se pueden borrar

### Firma Digital
Al completar tareas importantes:
- Se registra quién completó
- Fecha y hora exacta
- No se puede modificar después
- Sirve como comprobante legal

### Cerrar Sesión
**IMPORTANTE**: Siempre cierra sesión si:
- Usas dispositivo compartido
- Terminas tu jornada laboral
- Vas a prestar tu teléfono

**Cómo:**
1. Ir a **Configuración** (⚙️)
2. Scroll hasta abajo
3. Clic en **"Cerrar Sesión"**

---

## 🆘 Preguntas Frecuentes

### "Olvidé mi contraseña"
- Por ahora contactar al Admin
- Próxima versión: recuperación por email

### "No recibo notificaciones"
1. Verificar que la app tenga permisos
2. Android: Revisar que la app no esté en "ahorro de batería"
3. Verificar conexión a internet

### "No veo una tarea que sé que existe"
- Solo ves tareas donde estás asignado
- Contacta al creador de la tarea para que te agregue

### "La app está lenta"
- Verificar conexión a internet
- Cerrar y volver a abrir la app
- Si persiste, contactar soporte técnico

### "Eliminé una tarea por error"
- Las tareas eliminadas NO se pueden recuperar
- Siempre confirma antes de eliminar
- Solo elimina si estás 100% seguro

### "Quiero cambiar mi departamento"
- Contactar al Administrador
- Solo Admin puede cambiar departamentos y roles

---

## 📋 Buenas Prácticas

### Al Crear Tareas
✅ **Usa títulos descriptivos**: "Reparar baches Av. Juárez" en vez de "Baches"
✅ **Agrega detalles completos**: Ubicación, cantidad, especificaciones
✅ **Asigna fecha realista**: Considera el trabajo real necesario
✅ **Asigna a personas específicas**: Evita "alguien" o "equipo"

### Durante el Trabajo
✅ **Actualiza el estado**: Cambia a "En Progreso" cuando empieces
✅ **Comenta avances**: "50% completado", "Esperando materiales"
✅ **Usa fotos** (próxima versión): Documentar antes/después
✅ **Marca completada solo cuando termines**: No antes

### Comunicación
✅ **Comenta en la tarea**: No uses WhatsApp para trabajo oficial
✅ **Sé específico**: "Falta cemento" en vez de "Falta material"
✅ **Respeta horarios**: Evita notificar fuera de jornada laboral
✅ **Profesional siempre**: Los comentarios quedan registrados

---

## 🎓 Ejercicio Práctico

### Tarea de Ejemplo
1. **Crear tarea**: "Revisar alumbrado público"
2. **Asignarla a ti mismo**
3. **Agregar comentario**: "Iniciando recorrido"
4. **Cambiar a**: En Progreso
5. **Agregar otro comentario**: "Encontrados 3 focos fundidos"
6. **Cambiar a**: Completada
7. **Ver en Kanban**: Debe estar en columna "Completada"

---

## 📞 Soporte Técnico

**Contacto:**
- Email: soporte.sistemas@municipio.gob.mx
- Teléfono: (55) 1234-5678 ext. 101
- Horario: Lunes a Viernes 9:00 - 18:00

**Antes de contactar:**
1. Verifica tu conexión a internet
2. Cierra y abre la app
3. Revisa esta guía
4. Ten a la mano: Tu email de registro y descripción del problema

---

## ✅ Conclusión

Esta app está diseñada para:
- 📊 Mejorar organización del municipio
- 🔔 Comunicación en tiempo real
- 📈 Transparencia y rendición de cuentas
- 🛡️ Seguridad de la información

**Recuerda:** 
- Usa contraseñas seguras
- Actualiza el estado de tus tareas
- Comenta para mantener informados a todos
- Cierra sesión en dispositivos compartidos

¡Bienvenido al sistema de gestión de tareas municipal! 🏛️
