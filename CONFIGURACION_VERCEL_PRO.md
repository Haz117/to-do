# 🚀 Guía de Configuración en Vercel Pro

## ✅ Mejoras Implementadas

Tu proyecto ahora incluye:

### 📊 **1. Analytics y Monitoreo**
- ✅ Vercel Analytics integrado
- ✅ Speed Insights para métricas de rendimiento
- ✅ Solo se activa en producción web (no afecta la app móvil)

### 🔒 **2. Seguridad Mejorada**
Headers de seguridad configurados:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### ⚡ **3. Optimización de Cache**
- Assets estáticos: 1 año de cache
- JavaScript/CSS: Cache inmutable
- Imágenes: Cache a largo plazo

### 📧 **4. Sistema de Emails Seguro**
- API serverless en `/api/send-email.js`
- Las API Keys NO se exponen al cliente
- Servicio actualizado en `services/emailNotifications.vercel.js`

---

## 🔑 Variables de Entorno Requeridas

Ve a **Vercel Dashboard → Tu Proyecto → Settings → Environment Variables** y agrega:

### **Para SendGrid (Emails):**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `SENDGRID_API_KEY` | `SG.xxxxxxxxxxxxxx` | Tu API Key de SendGrid |
| `FROM_EMAIL` | `noreply@tudominio.com` | Email verificado en SendGrid |
| `FROM_NAME` | `TodoApp MORENA` | Nombre que aparece en emails |
| `APP_URL` | `https://tu-proyecto.vercel.app` | URL de tu app |

### **Para Firebase:**

⚠️ **IMPORTANTE:** Obtén estos valores de tu Firebase Console (Project Settings)

| Variable | Dónde encontrarla |
|----------|------------------|
| `FIREBASE_API_KEY` | Firebase Console → Project Settings → General |
| `FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings → General |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General |
| `FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings → General |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings → General |
| `FIREBASE_APP_ID` | Firebase Console → Project Settings → General |

**💡 Tip:** Marca las variables como disponibles en: `Production`, `Preview`, y `Development`

---

## 📧 Configurar SendGrid

### 1. Crear Cuenta
1. Ve a [https://sendgrid.com/](https://sendgrid.com/)
2. Crea cuenta gratuita (100 emails/día)
3. Verifica tu email

### 2. Verificar Sender
1. **Settings → Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Completa:
   - From Email: tu email verificado
   - From Name: "Sistema TodoApp"
   - Reply To: tu email
4. **Verifica el email de confirmación** ✅

### 3. Crear API Key
1. **Settings → API Keys**
2. **Create API Key**
3. Nombre: "Vercel TodoApp"
4. Permisos: **Full Access** (o solo "Mail Send")
5. **Copia la key** (solo se muestra una vez)
6. Pégala en Vercel como `SENDGRID_API_KEY`

---

## 🧪 Probar Emails

### Desde tu app (después de deploy):
```javascript
// En la consola del navegador de tu app en Vercel
fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'tu-email@gmail.com',
    subject: 'Test desde Vercel',
    html: '<h1>¡Funciona!</h1><p>Los emails están configurados correctamente.</p>',
    type: 'test'
  })
}).then(r => r.json()).then(console.log)
```

### Usar el nuevo servicio:
El archivo `services/emailNotifications.vercel.js` ya está listo para usar:

```javascript
import { notifyTaskAssigned } from './services/emailNotifications.vercel';

// Ejemplo de uso
await notifyTaskAssigned(task, user);
```

---

## 🔄 Actualizar Código Existente

Para usar el nuevo sistema de emails seguro, reemplaza las importaciones:

**Antes:**
```javascript
import { notifyTaskAssigned } from './services/emailNotifications';
```

**Después:**
```javascript
import { notifyTaskAssigned } from './services/emailNotifications.vercel';
```

---

## 📊 Ver Analytics

### En Vercel Dashboard:
1. Ve a tu proyecto
2. Click en **"Analytics"** (menú lateral)
3. Verás:
   - 📈 Pageviews en tiempo real
   - 🌍 Visitantes por país
   - ⚡ Core Web Vitals
   - 📱 Dispositivos y navegadores

### Speed Insights:
1. Click en **"Speed Insights"**
2. Verás métricas de rendimiento:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - TTFB (Time to First Byte)

---

## 🚀 Desplegar los Cambios

```bash
# 1. Commit de cambios
git add .
git commit -m "✨ Mejoras Vercel Pro: Analytics, headers, emails seguros"

# 2. Push a GitHub
git push origin main

# 3. Vercel hace deploy automático
```

O desde Vercel CLI:
```bash
npm run build:web
vercel --prod
```

---

## ✅ Checklist de Configuración

- [ ] Variables de entorno agregadas en Vercel
- [ ] SendGrid API Key creada y verificada
- [ ] Email sender verificado en SendGrid
- [ ] Deploy realizado con nuevos cambios
- [ ] Prueba de email enviada exitosamente
- [ ] Analytics activo y funcionando
- [ ] Headers de seguridad verificados

---

## 🎯 Funcionalidades de Emails

Tu sistema ahora envía automáticamente:

### ✉️ **Nueva Tarea Asignada**
```javascript
notifyTaskAssigned(task, assignedToUser)
```

### ⏰ **Tarea por Vencer**
```javascript
notifyTaskDueSoon(task, user)
```

### 💬 **Nuevo Mensaje en Chat**
```javascript
notifyNewChatMessage(task, message, recipient)
```

### 👋 **Bienvenida a Nuevo Usuario**
```javascript
sendWelcomeEmail(user, tempPassword)
```

---

## 🐛 Troubleshooting

### "Email service not configured"
✅ **Solución:** Verifica que `SENDGRID_API_KEY` esté en variables de entorno de Vercel

### "Invalid email address"
✅ **Solución:** Verifica que el email sea válido y esté verificado en SendGrid

### "403 Forbidden"
✅ **Solución:** Regenera la API Key en SendGrid con permisos de "Mail Send"

### "Sender not verified"
✅ **Solución:** Completa la verificación de sender en SendGrid Settings

### Analytics no aparece
✅ **Solución:** Los datos pueden tardar 24 horas. Verifica que hayas hecho deploy después de instalar el paquete.

---

## 📝 Notas Adicionales

### Plan Free vs Pro:
- **Free:** 100 GB/mes bandwidth, 1 proyecto
- **Pro ($20/mes):** 1 TB/mes, proyectos ilimitados, analytics avanzado, protección DDoS

### Límites de SendGrid:
- **Free:** 100 emails/día
- **Essentials ($20/mes):** 50,000 emails/mes
- **Pro ($90/mes):** 1.5M emails/mes

### Recomendaciones:
- Monitorea analytics semanalmente
- Revisa logs de emails en SendGrid
- Configura alertas en Vercel para errors
- Usa dominio personalizado para producción

---

## 🆘 Soporte

- **Vercel Docs:** https://vercel.com/docs
- **SendGrid Docs:** https://docs.sendgrid.com
- **Analytics Docs:** https://vercel.com/docs/analytics

---

¡Listo! Tu proyecto está optimizado para Vercel Pro 🚀
