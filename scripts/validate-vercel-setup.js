// scripts/validate-vercel-setup.js
// Script para validar que la configuración de Vercel Pro esté correcta

const fs = require('fs');
const path = require('path');

console.log('🔍 Validando configuración de Vercel Pro...\n');

let errors = 0;
let warnings = 0;
let success = 0;

// Verificar archivos necesarios
const requiredFiles = [
  'vercel.json',
  'api/send-email.js',
  'services/emailNotifications.vercel.js',
  'CONFIGURACION_VERCEL_PRO.md',
  'package.json'
];

console.log('📁 Verificando archivos requeridos...');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    success++;
  } else {
    console.log(`  ❌ ${file} - NO ENCONTRADO`);
    errors++;
  }
});

// Verificar package.json
console.log('\n📦 Verificando dependencias...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['@vercel/analytics', '@vercel/speed-insights'];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep} v${packageJson.dependencies[dep]}`);
    success++;
  } else {
    console.log(`  ❌ ${dep} - NO INSTALADO`);
    errors++;
  }
});

// Verificar vercel.json
console.log('\n⚙️ Verificando vercel.json...');
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

if (vercelConfig.headers) {
  console.log('  ✅ Headers de seguridad configurados');
  success++;
  
  const headers = vercelConfig.headers[0]?.headers || [];
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy'
  ];
  
  requiredHeaders.forEach(header => {
    const found = headers.find(h => h.key === header);
    if (found) {
      console.log(`    ✅ ${header}: ${found.value}`);
      success++;
    } else {
      console.log(`    ⚠️ ${header} - No configurado`);
      warnings++;
    }
  });
} else {
  console.log('  ❌ Headers de seguridad NO configurados');
  errors++;
}

if (vercelConfig.rewrites) {
  console.log('  ✅ Rewrites configurados (SPA routing)');
  success++;
} else {
  console.log('  ⚠️ Rewrites no configurados');
  warnings++;
}

// Verificar API route
console.log('\n🔌 Verificando API routes...');
const apiFile = 'api/send-email.js';
if (fs.existsSync(apiFile)) {
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  
  if (apiContent.includes('process.env.SENDGRID_API_KEY')) {
    console.log('  ✅ API usa variables de entorno seguras');
    success++;
  } else {
    console.log('  ❌ API NO usa variables de entorno');
    errors++;
  }
  
  if (apiContent.includes('emailRegex')) {
    console.log('  ✅ Validación de email implementada');
    success++;
  } else {
    console.log('  ⚠️ Sin validación de email');
    warnings++;
  }
} else {
  console.log('  ❌ API route no encontrada');
  errors++;
}

// Verificar App.js
console.log('\n📱 Verificando App.js...');
if (fs.existsSync('App.js')) {
  const appContent = fs.readFileSync('App.js', 'utf8');
  
  if (appContent.includes('@vercel/analytics')) {
    console.log('  ✅ Analytics importado');
    success++;
  } else {
    console.log('  ❌ Analytics NO importado');
    errors++;
  }
  
  if (appContent.includes('@vercel/speed-insights')) {
    console.log('  ✅ Speed Insights importado');
    success++;
  } else {
    console.log('  ❌ Speed Insights NO importado');
    errors++;
  }
  
  if (appContent.includes('Platform.OS === \'web\'')) {
    console.log('  ✅ Analytics condicionado para web');
    success++;
  } else {
    console.log('  ⚠️ Analytics podría ejecutarse en mobile');
    warnings++;
  }
}

// Verificar build
console.log('\n🏗️ Verificando build...');
if (fs.existsSync('dist')) {
  console.log('  ✅ Carpeta dist encontrada');
  success++;
  
  const distFiles = fs.readdirSync('dist');
  if (distFiles.includes('index.html')) {
    console.log('  ✅ index.html generado');
    success++;
  } else {
    console.log('  ❌ index.html NO encontrado');
    errors++;
  }
} else {
  console.log('  ⚠️ Carpeta dist no encontrada (ejecutar: npm run build:web)');
  warnings++;
}

// Variables de entorno
console.log('\n🔑 Verificando variables de entorno...');
const requiredEnvVars = [
  'SENDGRID_API_KEY',
  'FROM_EMAIL',
  'FROM_NAME',
  'APP_URL'
];

console.log('  ℹ️ Las siguientes variables deben estar en Vercel Dashboard:');
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`    ✅ ${varName} (detectada localmente)`);
    success++;
  } else {
    console.log(`    ⚠️ ${varName} (configurar en Vercel)`);
    warnings++;
  }
});

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VALIDACIÓN');
console.log('='.repeat(60));
console.log(`✅ Exitosos: ${success}`);
console.log(`⚠️ Advertencias: ${warnings}`);
console.log(`❌ Errores: ${errors}`);
console.log('='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('\n🎉 ¡Configuración perfecta! Todo listo para deploy.\n');
  process.exit(0);
} else if (errors === 0) {
  console.log('\n✅ Configuración válida con algunas advertencias.');
  console.log('💡 Revisa las advertencias antes de deploy.\n');
  process.exit(0);
} else {
  console.log('\n❌ Se encontraron errores críticos.');
  console.log('🔧 Corrige los errores antes de hacer deploy.\n');
  process.exit(1);
}
