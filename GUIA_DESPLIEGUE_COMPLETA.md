# 🚀 GUÍA DE DESPLIEGUE - TodoApp MORENA

## 📋 REQUISITOS PREVIOS

Instala las herramientas necesarias:

```bash
# Vercel CLI (para web)
npm install -g vercel

# EAS CLI (para Android APK)
npm install -g eas-cli
```

---

## 🌐 PARTE 1: DESPLEGAR EN VERCEL (WEB)

### Paso 1: Login en Vercel
```bash
vercel login
```
- Te abrirá el navegador
- Inicia sesión con GitHub, GitLab o email

### Paso 2: Primer despliegue
```bash
npm run build:web
vercel
```

Responde las preguntas:
- **Set up and deploy?** → `Y` (Yes)
- **Which scope?** → Tu cuenta personal
- **Link to existing project?** → `N` (No)
- **Project name?** → `todo-morena` (o el nombre que quieras)
- **Directory?** → `./dist`
- **Override settings?** → `N` (No)

### Paso 3: Depliegues futuros
```bash
# Despliegue de prueba
npm run build:web
vercel

# Despliegue a producción
npm run build:web
vercel --prod
```

**Tu app estará en:** `https://tu-proyecto.vercel.app`

---

## 📱 PARTE 2: GENERAR APK PARA ANDROID

### Paso 1: Login en Expo
```bash
eas login
```
- Usa tu cuenta de Expo (crea una en expo.dev si no tienes)

### Paso 2: Configurar proyecto
```bash
eas build:configure
```
- Confirma las preguntas con Enter

### Paso 3: Generar APK de prueba
```bash
eas build -p android --profile preview
```

- Espera 10-15 minutos (se compila en la nube)
- Al terminar te dará un link de descarga
- Descarga el APK a tu celular
- Instala (permite instalar de fuentes desconocidas)

### Paso 4: APK de producción (cuando esté listo)
```bash
eas build -p android --profile production
```

---

## 🎯 FLUJO RECOMENDADO

### Para probar cambios rápido:
1. Haz cambios en el código
2. `npm run build:web`
3. `vercel` (despliegue de prueba)
4. Prueba en la URL que te da

### Para publicar versión final:
1. `npm run build:web`
2. `vercel --prod` (web en producción)
3. `eas build -p android --profile production` (APK final)

---

## 📝 NOTAS IMPORTANTES

### Variables de entorno en Vercel:
1. Ve a tu proyecto en vercel.com
2. Settings → Environment Variables
3. Agrega tus variables de Firebase:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

### Para actualizar la app Android:
- Incrementa `version` en app.config.js
- Vuelve a generar el APK
- Los usuarios deben desinstalar la vieja e instalar la nueva
- (O publica en Play Store para updates automáticos)

---

## 🔗 URLs IMPORTANTES

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Expo Dashboard:** https://expo.dev/accounts/[tu-usuario]/projects
- **Tu app web:** https://[tu-proyecto].vercel.app

---

## 🆘 PROBLEMAS COMUNES

### "Build failed" en Vercel
- Verifica que `expo export -p web` funcione localmente
- Revisa los logs en el dashboard de Vercel

### "Build failed" en EAS
- Verifica app.config.js tenga `bundleIdentifier` y `package`
- Revisa los logs en expo.dev

### La app web no carga
- Verifica las variables de entorno en Vercel
- Revisa la consola del navegador

---

## ✅ CHECKLIST ANTES DE DESPLEGAR

- [ ] Código funcionando localmente
- [ ] Variables de Firebase configuradas
- [ ] Sin errores en consola
- [ ] Probado en navegador local
- [ ] Build web exitoso (`npm run build:web`)
- [ ] Login en Vercel y Expo
