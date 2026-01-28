# ⚡ CONFIGURACIÓN RÁPIDA DE .ENV

## 🎯 ¿Qué necesitas hacer?

Tu código ahora es **seguro** - todas las credenciales han sido removidas.
Pero necesitas configurar tu entorno local para que la app funcione.

---

## 📝 PASO 1: Crear archivo .env (2 minutos)

### En Windows:
```powershell
Copy-Item .env.local .env
```

### En Mac/Linux:
```bash
cp .env.local .env
```

---

## 🔑 PASO 2: Obtener Credenciales de Firebase (5 minutos)

### 1. Ir a Firebase Console
👉 https://console.firebase.google.com

### 2. Seleccionar tu proyecto
- Click en tu proyecto existente

### 3. Ir a Project Settings
- Click en el ícono ⚙️ (arriba izquierda)
- Seleccionar "Project Settings"

### 4. Copiar credenciales
Scroll hasta "Your apps" → selecciona tu Web app

Verás algo así:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // 👈 COPIA ESTE
  authDomain: "xxx.firebaseapp.com",  // 👈 COPIA ESTE
  projectId: "xxx",               // 👈 COPIA ESTE
  // ... etc
};
```

### 5. Pegar en .env
Abre `.env` y reemplaza:
```bash
FIREBASE_API_KEY=AIzaSy...tu_valor_real
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 📧 PASO 3: Configurar SendGrid (Opcional - 5 minutos)

Si quieres emails, configura SendGrid:

```bash
SENDGRID_API_KEY=SG.tu_api_key_aqui
FROM_EMAIL=tu-email-verificado@gmail.com
FROM_NAME=Sistema TodoApp
```

Revisa [CONFIGURACION_VERCEL_PRO.md](CONFIGURACION_VERCEL_PRO.md) para detalles.

---

## 🌐 PASO 4: Configurar en Vercel (5 minutos)

Para que funcione en producción:

1. **Ir a Vercel Dashboard**
   👉 https://vercel.com/dashboard

2. **Tu Proyecto → Settings → Environment Variables**

3. **Agregar las mismas variables del .env**
   - Click "Add New" por cada variable
   - Marcar: ✓ Production, ✓ Preview, ✓ Development

---

## ✅ PASO 5: Verificar que funciona

### Local:
```bash
npm start
```

La app debería cargar sin errores.

### Vercel:
```bash
git push origin main
```

Vercel hace deploy automático.

---

## 🐛 Problemas Comunes

### "Firebase app not initialized"
✅ Verifica que completaste TODAS las variables en .env

### "Invalid API key"
✅ Copia las credenciales exactas de Firebase Console

### "Cannot find module .env"
✅ Asegúrate de crear el archivo .env en la raíz del proyecto

---

## 📖 Más Información

- **Seguridad completa:** [SEGURIDAD.md](SEGURIDAD.md)
- **Configuración Vercel:** [CONFIGURACION_VERCEL_PRO.md](CONFIGURACION_VERCEL_PRO.md)
- **Inicio rápido:** [INICIO_RAPIDO.md](INICIO_RAPIDO.md)

---

## ⚠️ RECORDATORIOS DE SEGURIDAD

- ✅ El archivo `.env` está en `.gitignore` (no se sube a Git)
- ❌ NUNCA compartas tu archivo `.env`
- ❌ NUNCA subas credenciales a Git
- ✅ Usa variables de entorno en Vercel para producción
- ✅ Rota credenciales periódicamente

---

**🎯 Una vez configurado, todo funcionará normalmente.**

¡Tu app es ahora segura Y funcional! 🚀
