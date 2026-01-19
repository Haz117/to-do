// checkPassword.js - Verificar contraseñas con el hash de la BD

const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Usuario admin de la BD
const email = 'admin@todo.com';
const hashEnBD = '7O5cd97i3'; // El hash que está en Firebase

// Probar contraseñas comunes
const contraseñas = ['admin123', 'admin', '123456', 'password', 'Admin123'];

console.log('\n=== VERIFICANDO CONTRASEÑAS ===\n');
console.log('Email:', email);
console.log('Hash en BD:', hashEnBD);
console.log('\nProbando contraseñas...\n');

for (const pwd of contraseñas) {
  const hash = simpleHash(pwd + email);
  const coincide = hash === hashEnBD;
  console.log(`Contraseña: "${pwd}" -> Hash: ${hash} ${coincide ? '✅ COINCIDE' : ''}`);
}

// También mostrar el hash para una contraseña personalizada
console.log('\n\n=== GENERAR NUEVO HASH ===');
const nuevaPassword = 'admin123';
const nuevoHash = simpleHash(nuevaPassword + email);
console.log(`Si quieres usar: "${nuevaPassword}"`);
console.log(`Actualiza el campo "password" en Firebase a: "${nuevoHash}"`);
