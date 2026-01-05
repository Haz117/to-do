// Verificar hash del admin
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const email = 'admin@todo.com';
const password = 'admin123';

console.log('\n=== VERIFICACIÓN DE HASH ===\n');
console.log('Email:', email);
console.log('Password:', password);
console.log('\nHash calculado:', simpleHash(password + email));
console.log('\nEste hash debe estar en Firestore en el campo "password"');
console.log('Si pusiste otro hash, cámbialo por este.\n');
