# ============================================
# SEGURIDAD - CREDENCIALES ENCRIPTADAS
# ============================================
# 
# Las credenciales del sistema están encriptadas usando AES-256-CBC
# con un salt único por cada credencial.
#
# ARCHIVO: utils/encryptCredentials.js
# 
# ============================================

## Sistema de Encriptación

### Características:
- Algoritmo: AES-256-CBC
- IV aleatorio por cada encriptación
- Clave maestra derivada con SHA-256
- Formato: Base64(IV:encrypted)

### Uso:

```javascript
const { getCredentials } = require('./utils/encryptCredentials');

// Obtener credenciales por rol
const adminCreds = getCredentials('admin');
console.log(adminCreds.email);    // admin@todo.com
console.log(adminCreds.password); // admin123
```

### Roles Disponibles:
- `admin` - Administrador
- `jefeJuridica` - Jefe Área Jurídica
- `jefeObras` - Jefe Área Obras  
- `operativo` - Operativo

### Comandos:

**Probar sistema de encriptación:**
```bash
node utils/encryptCredentials.js
```

**Ver credenciales desencriptadas:**
```bash
node -e "const {getCredentials}=require('./utils/encryptCredentials');console.log(getCredentials('admin'))"
```

**Encriptar nueva credencial:**
```javascript
const { encrypt } = require('./utils/encryptCredentials');
const encrypted = encrypt('mi-credencial-secreta');
console.log(encrypted);
```

## Archivos Protegidos

Los siguientes archivos contienen credenciales encriptadas:

- `utils/encryptCredentials.js` - Sistema de encriptación
- `createUsers.mjs` - Script de creación de usuarios (credenciales encriptadas)
- Scripts en `.gitignore` protegidos

## Variable de Entorno

Para máxima seguridad en producción, configura:

```bash
CREDENTIALS_KEY="tu-clave-super-secreta-aqui"
```

Si no se configura, usa una clave por defecto (menos seguro).

## Importante

- NUNCA subir archivos con credenciales en texto plano
- Las credenciales encriptadas son seguras para Git
- Sin la clave maestra, no se pueden desencriptar
- Rota la clave maestra periódicamente

## Verificación de Seguridad

```bash
# Buscar credenciales en texto plano (no debe retornar nada)
grep -r "admin123" --exclude-dir=node_modules --exclude="*.md"
grep -r "jefe123" --exclude-dir=node_modules --exclude="*.md"
grep -r "oper123" --exclude-dir=node_modules --exclude="*.md"
```

## Respuesta ante Compromiso

Si la clave maestra se compromete:

1. Cambiar contraseñas reales en Firebase
2. Generar nueva clave maestra
3. Re-encriptar todas las credenciales
4. Actualizar variable `CREDENTIALS_KEY`
5. Hacer deployment con nuevas credenciales

---

**Estado:** Implementado el 28/01/2026
**Nivel de Seguridad:** Alto (AES-256)
