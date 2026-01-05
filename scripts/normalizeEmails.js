// scripts/normalizeEmails.js
// Script para normalizar todos los emails a minúsculas en Firestore
// EJECUTAR UNA SOLA VEZ después de implementar los cambios de permisos

import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Normaliza todos los emails en la colección de usuarios
 * Convierte emails a minúsculas para consistencia
 */
const normalizeUserEmails = async () => {
  console.log('🔄 Iniciando normalización de emails de usuarios...');
  
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let updated = 0;
    let skipped = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const originalEmail = userData.email;
      
      if (originalEmail) {
        const normalizedEmail = originalEmail.toLowerCase();
        
        if (originalEmail !== normalizedEmail) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            email: normalizedEmail
          });
          console.log(`  ✅ Usuario actualizado: ${originalEmail} → ${normalizedEmail}`);
          updated++;
        } else {
          skipped++;
        }
      }
    }
    
    console.log(`\n✅ Usuarios procesados:`);
    console.log(`   - Actualizados: ${updated}`);
    console.log(`   - Sin cambios: ${skipped}`);
    console.log(`   - Total: ${updated + skipped}`);
    
  } catch (error) {
    console.error('❌ Error normalizando emails de usuarios:', error);
  }
};

/**
 * Normaliza el campo assignedTo en todas las tareas
 * Convierte emails a minúsculas para que coincidan con los filtros
 */
const normalizeTaskAssignments = async () => {
  console.log('\n🔄 Iniciando normalización de asignaciones en tareas...');
  
  try {
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    let updated = 0;
    let skipped = 0;
    let nullAssignments = 0;
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const originalAssigned = taskData.assignedTo;
      
      if (originalAssigned) {
        const normalizedAssigned = originalAssigned.toLowerCase().trim();
        
        if (originalAssigned !== normalizedAssigned) {
          await updateDoc(doc(db, 'tasks', taskDoc.id), {
            assignedTo: normalizedAssigned
          });
          console.log(`  ✅ Tarea actualizada: "${taskData.title}"`);
          console.log(`     ${originalAssigned} → ${normalizedAssigned}`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        console.log(`  ⚠️ Tarea sin asignación: "${taskData.title}"`);
        nullAssignments++;
      }
    }
    
    console.log(`\n✅ Tareas procesadas:`);
    console.log(`   - Actualizadas: ${updated}`);
    console.log(`   - Sin cambios: ${skipped}`);
    console.log(`   - Sin asignación: ${nullAssignments}`);
    console.log(`   - Total: ${updated + skipped + nullAssignments}`);
    
  } catch (error) {
    console.error('❌ Error normalizando asignaciones de tareas:', error);
  }
};

/**
 * Función principal que ejecuta ambas normalizaciones
 */
export const normalizeAllEmails = async () => {
  console.log('\n🚀 INICIANDO NORMALIZACIÓN DE EMAILS EN FIRESTORE');
  console.log('================================================\n');
  
  await normalizeUserEmails();
  await normalizeTaskAssignments();
  
  console.log('\n================================================');
  console.log('✅ NORMALIZACIÓN COMPLETADA');
  console.log('\n⚠️ IMPORTANTE: Los usuarios deben cerrar sesión y volver a iniciar');
  console.log('   para que la sesión se actualice con los emails normalizados.\n');
};

// Si se ejecuta directamente desde terminal
if (require.main === module) {
  normalizeAllEmails()
    .then(() => {
      console.log('\n✅ Script finalizado correctamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando script:', error);
      process.exit(1);
    });
}
