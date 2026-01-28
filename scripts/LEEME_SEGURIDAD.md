# 🔒 AVISO DE SEGURIDAD

⚠️ **ESTE ARCHIVO CONTIENE CREDENCIALES - NO SUBIR A GIT**

Este es un script de desarrollo que contiene credenciales.
Ha sido agregado al .gitignore para proteger tu seguridad.

## ⚠️ ADVERTENCIA

Si necesitas ejecutar este script:

1. **Crea un archivo .env** con tus credenciales:
   ```
   FIREBASE_API_KEY=tu_api_key
   FIREBASE_AUTH_DOMAIN=tu_auth_domain
   # ... etc
   ```

2. **Modifica este archivo** para leer del .env:
   ```javascript
   require('dotenv').config();
   
   const firebaseConfig = {
     apiKey: process.env.FIREBASE_API_KEY,
     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
     // ... etc
   };
   ```

3. **NUNCA hardcodees credenciales** en el código

## 🛡️ Buenas Prácticas

- ✅ Usar variables de entorno (.env)
- ✅ Agregar .env al .gitignore
- ✅ No compartir credenciales por email/chat
- ✅ Rotar credenciales periódicamente
- ❌ NO subir credenciales a Git
- ❌ NO compartir credenciales públicamente

## 📞 Necesitas Ayuda?

Revisa: [SEGURIDAD.md](../SEGURIDAD.md)
