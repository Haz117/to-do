# 🔒 SEGURIDAD - CREDENCIALES PROTEGIDAS

## ⚠️ ADVERTENCIA DE SEGURIDAD

**TODAS las credenciales han sido removidas del código fuente por seguridad.**

---

## 🔐 Cómo Configurar Credenciales de Forma Segura

### 1. Variables de Entorno Local (.env)

Crea un archivo `.env` en la raíz del proyecto (NUNCA lo subas a Git):

```bash
# Firebase - Obtén de Firebase Console
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# SendGrid - Obtén de SendGrid Dashboard
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=tu-email-verificado@gmail.com
FROM_NAME=Sistema TodoApp

# App
APP_URL=https://tu-proyecto.vercel.app
```

### 2. Variables en Vercel (Producción)

**Vercel Dashboard → Tu Proyecto → Settings → Environment Variables**

Agrega TODAS las variables de arriba marcando:
- ✓ Production
- ✓ Preview
- ✓ Development

### 3. Configuración en app.config.js (Expo)

Asegúrate de que `app.config.js` lea las variables:

```javascript
export default {
  extra: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    // ... resto de variables
  }
}
```

---

## 📁 Archivos Protegidos

Los siguientes archivos DEBEN estar en `.gitignore`:

```
.env
.env.local
.env.production
firebase-config.js  # Si existe
credentials.json    # Si existe
```

---

## 🔍 Cómo Obtener Credenciales

### Firebase:
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. ⚙️ Project Settings
4. Scroll a "Your apps" → Web app
5. Copia las credenciales

### SendGrid:
1. Ve a [SendGrid Dashboard](https://app.sendgrid.com)
2. Settings → API Keys
3. Create API Key
4. Copia la key (solo se muestra una vez)

---

## ✅ Verificación de Seguridad

Ejecuta este comando para verificar que no hay credenciales expuestas:

```bash
# Buscar posibles credenciales
git grep -E "apiKey|password|secret|token" | grep -v ".gitignore" | grep -v "SEGURIDAD"
```

Si encuentra algo, elimínalo inmediatamente.

---

## 🚨 Si Expusiste Credenciales Accidentalmente

### 1. Rotar Credenciales de Firebase:
- Firebase Console → Project Settings → Service Accounts
- Generar nuevas credenciales
- Actualizar en Vercel y .env local

### 2. Rotar API Key de SendGrid:
- SendGrid → Settings → API Keys
- Delete la key antigua
- Create API Key nueva
- Actualizar en Vercel

### 3. Limpiar Historial de Git (si las subiste):
```bash
# Opción 1: BFG Repo-Cleaner (recomendado)
bfg --replace-text passwords.txt

# Opción 2: git filter-branch (avanzado)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📞 Contacto para Credenciales

Si necesitas acceso al sistema:

1. Contacta al administrador del proyecto
2. Solicita credenciales personalizadas
3. NUNCA compartas tus credenciales

---

## ✅ Checklist de Seguridad

- [ ] Archivo `.env` creado localmente
- [ ] `.env` está en `.gitignore`
- [ ] Variables configuradas en Vercel
- [ ] Firebase config sin credenciales hardcoded
- [ ] Credenciales de prueba eliminadas del README
- [ ] API Keys de SendGrid en variables de entorno
- [ ] No hay credenciales en archivos .js/.md/.txt

---

**🛡️ La seguridad es responsabilidad de todos. NUNCA subas credenciales a Git.**
