// utils/encryptCredentials.js
// Sistema de encriptación para credenciales sensibles
// Usa AES-256 con salt único por credencial

const crypto = require('crypto');

// Clave maestra (en producción debe estar en variables de entorno)
const MASTER_KEY = process.env.CREDENTIALS_KEY || 'T0D0_4PP_M4ST3R_K3Y_2026_S3CUR3_V3RS10N';

/**
 * Encripta una credencial usando AES-256-CBC
 * @param {string} text - Texto a encriptar
 * @returns {string} - Texto encriptado en formato base64 con IV incluido
 */
function encrypt(text) {
  try {
    // Generar un IV aleatorio de 16 bytes
    const iv = crypto.randomBytes(16);
    
    // Crear hash de la clave maestra para obtener 32 bytes (256 bits)
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    
    // Crear cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encriptar
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Retornar IV + encrypted en base64
    const result = iv.toString('hex') + ':' + encrypted;
    return Buffer.from(result).toString('base64');
  } catch (error) {
    console.error('[ENCRYPT ERROR]', error);
    throw new Error('Error al encriptar');
  }
}

/**
 * Desencripta una credencial
 * @param {string} encryptedText - Texto encriptado en base64
 * @returns {string} - Texto original
 */
function decrypt(encryptedText) {
  try {
    // Decodificar de base64
    const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
    const [ivHex, encrypted] = decoded.split(':');
    
    if (!ivHex || !encrypted) {
      throw new Error('Formato de encriptación inválido');
    }
    
    // Convertir IV de hex a buffer
    const iv = Buffer.from(ivHex, 'hex');
    
    // Crear hash de la clave maestra
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    
    // Crear decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Desencriptar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[DECRYPT ERROR]', error);
    throw new Error('Error al desencriptar');
  }
}

/**
 * Ofusca una cadena para logs (muestra solo primeros y últimos caracteres)
 * @param {string} text - Texto a ofuscar
 * @param {number} visibleChars - Caracteres visibles al inicio y fin
 * @returns {string} - Texto ofuscado
 */
function obfuscate(text, visibleChars = 2) {
  if (!text || text.length <= visibleChars * 2) {
    return '***';
  }
  const start = text.substring(0, visibleChars);
  const end = text.substring(text.length - visibleChars);
  const middle = '*'.repeat(Math.min(text.length - visibleChars * 2, 8));
  return `${start}${middle}${end}`;
}

// Credenciales encriptadas del sistema
const ENCRYPTED_CREDENTIALS = {
  admin: {
    email: encrypt('admin@todo.com'),
    password: encrypt('admin123')
  },
  jefeJuridica: {
    email: encrypt('jefe.juridica@todo.com'),
    password: encrypt('jefe123')
  },
  jefeObras: {
    email: encrypt('jefe.obras@todo.com'),
    password: encrypt('jefe123')
  },
  operativo: {
    email: encrypt('operativo.juridica@todo.com'),
    password: encrypt('oper123')
  }
};

/**
 * Obtiene credenciales desencriptadas por rol
 * @param {string} role - Rol del usuario (admin, jefeJuridica, jefeObras, operativo)
 * @returns {Object} - Credenciales desencriptadas
 */
function getCredentials(role) {
  try {
    if (!ENCRYPTED_CREDENTIALS[role]) {
      throw new Error(`Rol no encontrado: ${role}`);
    }
    
    return {
      email: decrypt(ENCRYPTED_CREDENTIALS[role].email),
      password: decrypt(ENCRYPTED_CREDENTIALS[role].password)
    };
  } catch (error) {
    console.error('[GET CREDENTIALS ERROR]', error);
    throw error;
  }
}

/**
 * Valida credenciales contra las encriptadas
 * @param {string} email - Email a validar
 * @param {string} password - Contraseña a validar
 * @returns {boolean} - True si son válidas
 */
function validateCredentials(email, password) {
  try {
    for (const role in ENCRYPTED_CREDENTIALS) {
      const creds = getCredentials(role);
      if (creds.email === email && creds.password === password) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[VALIDATE CREDENTIALS ERROR]', error);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  obfuscate,
  getCredentials,
  validateCredentials,
  ENCRYPTED_CREDENTIALS
};

// Test si se ejecuta directamente
if (require.main === module) {
  console.log('\n=== PRUEBA DE ENCRIPTACIÓN ===\n');
  
  const testEmail = 'admin@todo.com';
  const testPassword = 'admin123';
  
  console.log('Original:', testEmail);
  const encrypted = encrypt(testEmail);
  console.log('Encriptado:', encrypted);
  console.log('Ofuscado:', obfuscate(testEmail));
  const decrypted = decrypt(encrypted);
  console.log('Desencriptado:', decrypted);
  console.log('Match:', testEmail === decrypted ? '✓' : '✗');
  
  console.log('\n=== CREDENCIALES ENCRIPTADAS ===\n');
  console.log(JSON.stringify(ENCRYPTED_CREDENTIALS, null, 2));
  
  console.log('\n=== VALIDACIÓN ===\n');
  console.log('Validación correcta:', validateCredentials(testEmail, testPassword));
  console.log('Validación incorrecta:', validateCredentials(testEmail, 'wrong'));
}
