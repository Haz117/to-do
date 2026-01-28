# ✅ CHECKLIST DE CONFIGURACIÓN - VERCEL PRO

Usa esta lista para asegurarte de completar todos los pasos.

---

## 📋 PARTE 1: CONFIGURACIÓN SENDGRID

### Crear Cuenta
- [ ] Ir a https://sendgrid.com
- [ ] Registrarse con email
- [ ] Confirmar email de registro

### Verificar Sender
- [ ] Ir a Settings → Sender Authentication
- [ ] Click en "Verify a Single Sender"
- [ ] Completar formulario con datos
- [ ] **CRÍTICO:** Abrir email y hacer click en enlace de verificación
- [ ] Verificar que aparece ✅ verde en dashboard

### Crear API Key
- [ ] Ir a Settings → API Keys
- [ ] Click en "Create API Key"
- [ ] Nombre: "Vercel TodoApp"
- [ ] Permisos: Full Access (o Mail Send)
- [ ] Click en "Create & View"
- [ ] **COPIAR LA KEY** (comienza con SG.)
- [ ] Guardar la key en un lugar seguro

**API Key copiada:** `SG._________________________________`

---

## 📋 PARTE 2: VARIABLES DE ENTORNO EN VERCEL

### Acceder a Configuración
- [ ] Ir a https://vercel.com/dashboard
- [ ] Seleccionar tu proyecto
- [ ] Click en "Settings"
- [ ] Click en "Environment Variables"

### Agregar Variables (una por una)

#### Variable 1: SENDGRID_API_KEY
- [ ] Click en "Add New"
- [ ] Name: `SENDGRID_API_KEY`
- [ ] Value: `SG.___________________` (la que copiaste)
- [ ] Environment: ✓ Production, ✓ Preview, ✓ Development
- [ ] Click "Save"

#### Variable 2: FROM_EMAIL
- [ ] Click en "Add New"
- [ ] Name: `FROM_EMAIL`
- [ ] Value: `tu-email-verificado@gmail.com`
- [ ] Environment: ✓ Production, ✓ Preview, ✓ Development
- [ ] Click "Save"

#### Variable 3: FROM_NAME
- [ ] Click en "Add New"
- [ ] Name: `FROM_NAME`
- [ ] Value: `Sistema TodoApp`
- [ ] Environment: ✓ Production, ✓ Preview, ✓ Development
- [ ] Click "Save"

#### Variable 4: APP_URL
- [ ] Click en "Add New"
- [ ] Name: `APP_URL`
- [ ] Value: `https://tu-proyecto.vercel.app`
- [ ] Environment: ✓ Production, ✓ Preview, ✓ Development
- [ ] Click "Save"

### Verificar
- [ ] Deberías ver 4 variables listadas
- [ ] Cada una marcada para Production, Preview, Development

---

## 📋 PARTE 3: DEPLOY

### Opción A: Git Push
- [ ] Abrir terminal en carpeta del proyecto
- [ ] Ejecutar: `git add .`
- [ ] Ejecutar: `git commit -m "✨ Mejoras Vercel Pro"`
- [ ] Ejecutar: `git push origin main`
- [ ] Ir a Vercel Dashboard
- [ ] Ver deployment en progreso
- [ ] Esperar a ver "Ready" con ✅

### Opción B: Vercel CLI
- [ ] Abrir terminal en carpeta del proyecto
- [ ] Ejecutar: `npm run deploy`
- [ ] Esperar a que termine el build
- [ ] Copiar la URL del deploy

---

## 📋 PARTE 4: PROBAR EMAILS

### Método 1: Página de Test
- [ ] Abrir: `https://tu-proyecto.vercel.app/test-email.html`
- [ ] Ingresar tu email en el campo "Email Destinatario"
- [ ] Dejar los valores por defecto o elegir un template
- [ ] Click en "Enviar Email de Prueba"
- [ ] Esperar mensaje de éxito
- [ ] Revisar bandeja de entrada (1-2 minutos)
- [ ] **Verificar que llegó el email** ✅

### Método 2: Consola del Navegador
- [ ] Abrir tu app: `https://tu-proyecto.vercel.app`
- [ ] Presionar F12 (abrir consola)
- [ ] Copiar y pegar el código:
```javascript
fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'tu-email@gmail.com',
    subject: '✅ Test',
    html: '<h1>¡Funciona!</h1>'
  })
}).then(r => r.json()).then(console.log)
```
- [ ] Presionar Enter
- [ ] Ver respuesta: `{success: true}`
- [ ] Revisar bandeja de entrada
- [ ] **Verificar que llegó el email** ✅

---

## 📋 PARTE 5: VERIFICAR ANALYTICS

### Acceder a Analytics
- [ ] Ir a Vercel Dashboard
- [ ] Tu proyecto → "Analytics" (menú lateral)
- [ ] Abrir tu app en varias pestañas/dispositivos
- [ ] Refrescar la página de Analytics
- [ ] **Ver visitantes en tiempo real** 📊

### Verificar Speed Insights
- [ ] En Vercel, click en "Speed Insights"
- [ ] Ver métricas de rendimiento
- [ ] Verificar que aparecen datos (puede tardar 24h)

---

## 📋 PARTE 6: VALIDACIÓN TÉCNICA

### Ejecutar Script de Validación
- [ ] Abrir terminal
- [ ] Ejecutar: `npm run validate`
- [ ] Verificar: 21+ checks exitosos
- [ ] Verificar: 0 errores

### Verificar Headers de Seguridad
- [ ] Abrir: https://securityheaders.com
- [ ] Ingresar: `https://tu-proyecto.vercel.app`
- [ ] Click "Scan"
- [ ] **Verificar score A o superior** 🔒

### Verificar Performance
- [ ] Abrir: https://pagespeed.web.dev
- [ ] Ingresar: `https://tu-proyecto.vercel.app`
- [ ] Click "Analyze"
- [ ] **Verificar score 90+ en Desktop** ⚡

---

## 📋 RESULTADO FINAL

### Confirmación Visual
- [ ] ✅ Recibí email de prueba
- [ ] ✅ Analytics muestra visitantes
- [ ] ✅ App carga rápidamente
- [ ] ✅ No hay errores en consola
- [ ] ✅ Headers de seguridad activos
- [ ] ✅ Score Lighthouse 90+

---

## 🎉 ¡FELICITACIONES!

Si todos los checks están marcados, tu app está:
- ✅ Desplegada en Vercel Pro
- ✅ Optimizada para rendimiento
- ✅ Asegurada con headers
- ✅ Monitoreable con analytics
- ✅ Lista para enviar emails

---

## 📞 ¿PROBLEMAS?

Si algo no funciona, revisa:

### Email no llega
- [ ] Verificar que sender está verificado en SendGrid
- [ ] Verificar que API Key es correcta
- [ ] Revisar carpeta de spam
- [ ] Verificar logs en Vercel: Deployments → Functions

### Variables no funcionan
- [ ] Hacer redeploy después de agregar variables
- [ ] Verificar que están en "Production"
- [ ] Verificar que no tienen espacios extras

### Deploy falla
- [ ] Verificar que el build local funciona: `npm run build:web`
- [ ] Revisar logs en Vercel Dashboard
- [ ] Verificar que todas las dependencias están instaladas

---

**Fecha de completación:** ___________________

**Tiempo total:** _________ minutos

**¿Funcionó a la primera?** [ ] Sí [ ] No

**Notas adicionales:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
