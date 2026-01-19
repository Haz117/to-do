g# 📝 GUÍA DE DESPLIEGUE - PASOS PENDIENTES

## ✅ LO QUE YA ESTÁ HECHO

- ✅ **expo-dev-client** instalado
- ✅ **eas.json** creado y configurado
- ✅ **firestore.rules** actualizadas para producción
- ✅ **privacy-policy.html** creada
- ✅ **app.config.js** actualizado con configuración EAS

---

## 🔴 LO QUE NECESITAS HACER MANUALMENTE

### 1. 📱 DESCARGAR ARCHIVOS DE FIREBASE (CRÍTICO)

#### Para Android: `google-services.json`

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **infra-sublime-464215-m5**
3. Click en el ícono de **engranaje** ⚙️ → **Configuración del proyecto**
4. En la pestaña **General**, baja hasta **Tus apps**
5. Si NO existe una app Android:
   - Click en **Agregar app** → Selecciona **Android** (ícono de Android)
   - **Nombre del paquete Android**: `com.todoapp.todo`
   - **Apodo de la app**: `TodoApp`
   - Click en **Registrar app**
6. Descarga el archivo **google-services.json**
7. **Colócalo en**: `C:\Users\TI\Documents\TODO\google-services.json` (raíz del proyecto)

#### Para iOS: `GoogleService-Info.plist`

1. En la misma página de Firebase Console
2. Si NO existe una app iOS:
   - Click en **Agregar app** → Selecciona **iOS** (ícono de Apple)
   - **ID del paquete de iOS**: `com.todoapp.todo`
   - **Apodo de la app**: `TodoApp`
   - Click en **Registrar app**
3. Descarga el archivo **GoogleService-Info.plist**
4. **Colócalo en**: `C:\Users\TI\Documents\TODO\GoogleService-Info.plist` (raíz del proyecto)

---

### 2. 🎨 CONVERTIR ASSETS DE SVG A PNG

Actualmente tienes archivos SVG, pero necesitas PNG para las stores.

#### Opción 1: Usar herramienta online (RECOMENDADO)

1. Ve a: https://easyappicon.com/
2. Crea un ícono de 1024x1024px con tu logo
3. Sube el ícono
4. Descarga el paquete completo
5. Extrae y renombra los archivos:
   - `icon.png` (1024x1024px) → `C:\Users\TI\Documents\TODO\assets\icon.png`
   - `splash.png` (2048x2048px) → `C:\Users\TI\Documents\TODO\assets\splash.png`
   - `adaptive-icon.png` (1024x1024px) → `C:\Users\TI\Documents\TODO\assets\adaptive-icon.png`

#### Opción 2: Convertir manualmente con PowerShell

Si tienes los SVG y quieres convertirlos:

```powershell
# Instalar ImageMagick o usar una herramienta online como:
# https://cloudconvert.com/svg-to-png
# https://convertio.co/es/svg-png/
```

**Dimensiones requeridas:**
- **icon.png**: 1024x1024px (PNG, fondo sólido)
- **splash.png**: 2048x2048px (PNG, puede tener transparencia)
- **adaptive-icon.png**: 1024x1024px (PNG, para Android, debe ser centrado)

---

### 3. 🔐 INSTALAR Y CONFIGURAR EAS CLI

```powershell
# 1. Instalar EAS CLI globalmente
npm install -g eas-cli

# 2. Iniciar sesión en Expo
eas login
# Te pedirá usuario y contraseña de Expo (crea cuenta en expo.dev si no tienes)

# 3. Configurar el proyecto (esto actualizará el projectId en app.config.js)
cd C:\Users\TI\Documents\TODO
eas build:configure
# Selecciona 'All' cuando pregunte por plataformas
```

---

### 4. 🌐 HOSTEAR LA POLÍTICA DE PRIVACIDAD

Necesitas una URL pública para la política de privacidad. Opciones:

#### Opción A: Firebase Hosting (RECOMENDADO - GRATIS)

```powershell
cd C:\Users\TI\Documents\TODO

# 1. Inicializar Firebase Hosting
firebase init hosting
# Selecciona tu proyecto: infra-sublime-464215-m5
# Public directory: escribe 'public' y presiona Enter
# Single-page app: No
# Automatic builds: No

# 2. Copiar el archivo de privacidad
New-Item -ItemType Directory -Force -Path "public"
Copy-Item "privacy-policy.html" -Destination "public\index.html"

# 3. Desplegar
firebase deploy --only hosting

# Te dará una URL como: https://infra-sublime-464215-m5.web.app
```

#### Opción B: GitHub Pages (GRATIS)

1. Crea un repositorio público en GitHub
2. Sube el archivo `privacy-policy.html` renombrado como `index.html`
3. Ve a Settings → Pages → Activa GitHub Pages
4. Obtendrás una URL: `https://tu-usuario.github.io/tu-repo/`

#### Opción C: Netlify Drop (GRATIS, MÁS FÁCIL)

1. Ve a: https://app.netlify.com/drop
2. Arrastra el archivo `privacy-policy.html` (renombrado como `index.html`)
3. Te dará una URL instantáneamente

**Guarda la URL**, la necesitarás para las tiendas de apps.

---

### 5. 📦 CREAR TU PRIMER BUILD

Una vez que hayas completado los pasos 1-4:

```powershell
cd C:\Users\TI\Documents\TODO

# Build de desarrollo (para testing)
eas build --profile development --platform android

# Esto tomará 15-30 minutos la primera vez
# Al terminar, te dará un link para descargar el APK
# Instálalo en tu celular Android para probar
```

**Para probar con tu celular:**
1. Descarga el APK del link que te da EAS
2. Instálalo en tu dispositivo Android
3. Prueba todas las funciones (incluyendo Drag & Drop que no funciona en Expo Go)

---

### 6. 🏗️ BUILD DE PRODUCCIÓN (cuando esté todo probado)

```powershell
# Para Android (APK)
eas build --profile production --platform android

# Para iOS (requiere cuenta de Apple Developer - $99/año)
eas build --profile production --platform ios
```

---

### 7. 📤 SUBIR A LAS TIENDAS

#### Google Play Store

**Requisitos:**
- Cuenta de Google Play Developer ($25 USD, pago único)
- APK/AAB de producción
- Capturas de pantalla (mínimo 2)
- Descripción de la app
- URL de política de privacidad

**Proceso:**
```powershell
# Crear AAB para Google Play
eas build --profile production --platform android

# Subir automáticamente (después de configurar la cuenta)
eas submit --platform android
```

#### Apple App Store

**Requisitos:**
- Apple Developer Account ($99 USD/año)
- IPA de producción
- Capturas de pantalla de varios tamaños de iPhone
- Descripción de la app
- URL de política de privacidad

```powershell
# Crear IPA para App Store
eas build --profile production --platform ios

# Subir automáticamente
eas submit --platform ios
```

---

## 📊 RESUMEN DE TAREAS

| Tarea | Estado | Tiempo estimado |
|-------|--------|----------------|
| ✅ Instalar expo-dev-client | COMPLETADO | - |
| ✅ Crear eas.json | COMPLETADO | - |
| ✅ Actualizar firestore.rules | COMPLETADO | - |
| ✅ Crear política de privacidad | COMPLETADO | - |
| ❌ Descargar google-services.json | PENDIENTE | 5 min |
| ❌ Descargar GoogleService-Info.plist | PENDIENTE | 5 min |
| ❌ Crear/convertir assets PNG | PENDIENTE | 30-60 min |
| ❌ Instalar y configurar EAS CLI | PENDIENTE | 15 min |
| ❌ Hostear política de privacidad | PENDIENTE | 10 min |
| ❌ Crear primer build de desarrollo | PENDIENTE | 30 min |
| ❌ Testing completo en dispositivo | PENDIENTE | 2-4 horas |
| ❌ Build de producción | PENDIENTE | 30 min |
| ❌ Subir a tiendas | PENDIENTE | 1-2 horas |

**TIEMPO TOTAL RESTANTE:** 5-8 horas

---

## 🆘 SOPORTE

Si tienes problemas:

1. **Documentación de EAS**: https://docs.expo.dev/build/introduction/
2. **Firebase Console**: https://console.firebase.google.com/
3. **Expo Discord**: https://chat.expo.dev/

---

## 🎯 PRÓXIMO PASO INMEDIATO

**EMPIEZA POR ESTO:**

1. Ve a Firebase Console y descarga los 2 archivos de configuración
2. Colócalos en la raíz del proyecto
3. Luego instala EAS CLI: `npm install -g eas-cli`
4. Inicia sesión: `eas login`
5. Configura el proyecto: `eas build:configure`

¡Ya casi estás listo para desplegar! 🚀
