import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getUserProfile } from './roles';

/**
 * Generar reporte de tareas en formato CSV (compatible con Excel)
 * @param {Object} filters - Filtros para el reporte (status, priority, department, dateRange)
 * @returns {Promise<string>} - Path del archivo generado
 */
export const generateTaskReport = async (filters = {}) => {
  try {
    // Obtener perfil del usuario
    const userProfile = await getUserProfile();
    if (!userProfile) {
      throw new Error('Usuario no autenticado');
    }

    // Construir consulta según filtros y permisos
    let q = collection(db, 'tasks');
    const constraints = [];

    // Si no es admin, solo ver tareas con acceso
    if (userProfile.role !== 'admin') {
      constraints.push(where('userAccess', 'array-contains', userProfile.id));
    }

    // Filtros adicionales
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }
    if (filters.department) {
      constraints.push(where('department', '==', filters.department));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    q = query(q, ...constraints);

    // Obtener tareas
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (tasks.length === 0) {
      throw new Error('No hay tareas para exportar con los filtros seleccionados');
    }

    // Generar CSV
    const csv = generateCSV(tasks);

    // Guardar archivo
    const fileName = `reporte_tareas_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Reporte de Tareas'
      });
    }

    return filePath;
  } catch (error) {
    console.error('Error generando reporte:', error);
    throw error;
  }
};

/**
 * Convertir array de tareas a formato CSV
 */
function generateCSV(tasks) {
  // Encabezados
  const headers = [
    'ID',
    'Título',
    'Descripción',
    'Estado',
    'Prioridad',
    'Departamento',
    'Creado Por',
    'Fecha Creación',
    'Fecha Límite',
    'Fecha Completado',
    'Etiquetas'
  ];

  // Convertir cada tarea a fila CSV
  const rows = tasks.map(task => {
    return [
      task.id,
      escapeCSV(task.title || ''),
      escapeCSV(task.description || ''),
      translateStatus(task.status),
      translatePriority(task.priority),
      translateDepartment(task.department || ''),
      task.createdByName || '',
      formatDate(task.createdAt),
      formatDate(task.deadline),
      formatDate(task.completedAt),
      (task.tags || []).join('; ')
    ].map(field => `"${field}"`).join(',');
  });

  // Combinar encabezados y filas
  return [
    headers.map(h => `"${h}"`).join(','),
    ...rows
  ].join('\n');
}

/**
 * Generar reporte estadístico mensual
 */
export const generateMonthlyReport = async (year, month) => {
  try {
    const userProfile = await getUserProfile();
    if (!userProfile) {
      throw new Error('Usuario no autenticado');
    }

    // Calcular rango de fechas
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Obtener tareas del mes
    let q = collection(db, 'tasks');
    const constraints = [
      where('createdAt', '>=', startDate.toISOString()),
      where('createdAt', '<=', endDate.toISOString())
    ];

    if (userProfile.role !== 'admin') {
      constraints.push(where('userAccess', 'array-contains', userProfile.id));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calcular estadísticas
    const stats = calculateStatistics(tasks);

    // Generar reporte de texto
    const report = generateStatisticsText(stats, month, year);

    // Guardar archivo
    const fileName = `estadisticas_${year}_${String(month).padStart(2, '0')}.txt`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, report, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Estadísticas Mensuales'
      });
    }

    return filePath;
  } catch (error) {
    console.error('Error generando reporte mensual:', error);
    throw error;
  }
};

/**
 * Calcular estadísticas de tareas
 */
function calculateStatistics(tasks) {
  const stats = {
    total: tasks.length,
    completed: 0,
    pending: 0,
    inProgress: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
    byDepartment: {},
    avgCompletionTime: 0,
    onTime: 0,
    delayed: 0
  };

  let totalCompletionTime = 0;
  let completedCount = 0;

  tasks.forEach(task => {
    // Por estado
    if (task.status === 'completed') {
      stats.completed++;
      completedCount++;

      // Tiempo de completado
      if (task.completedAt && task.createdAt) {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        const days = Math.round((completed - created) / (1000 * 60 * 60 * 24));
        totalCompletionTime += days;

        // A tiempo o retrasado
        if (task.deadline) {
          const deadline = new Date(task.deadline);
          if (completed <= deadline) {
            stats.onTime++;
          } else {
            stats.delayed++;
          }
        }
      }
    } else if (task.status === 'in-progress') {
      stats.inProgress++;
    } else {
      stats.pending++;
    }

    // Por prioridad
    if (task.priority) {
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    }

    // Por departamento
    const dept = task.department || 'Sin asignar';
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
  });

  // Promedio de tiempo de completado
  if (completedCount > 0) {
    stats.avgCompletionTime = Math.round(totalCompletionTime / completedCount);
  }

  return stats;
}

/**
 * Generar texto del reporte estadístico
 */
function generateStatisticsText(stats, month, year) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  let text = `REPORTE ESTADÍSTICO\n`;
  text += `${monthNames[month - 1]} ${year}\n`;
  text += `Generado: ${new Date().toLocaleString('es-MX')}\n`;
  text += `${'='.repeat(50)}\n\n`;

  text += `RESUMEN GENERAL\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Total de tareas: ${stats.total}\n`;
  text += `Completadas: ${stats.completed} (${percentage(stats.completed, stats.total)}%)\n`;
  text += `En progreso: ${stats.inProgress} (${percentage(stats.inProgress, stats.total)}%)\n`;
  text += `Pendientes: ${stats.pending} (${percentage(stats.pending, stats.total)}%)\n\n`;

  text += `RENDIMIENTO\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Tiempo promedio de completado: ${stats.avgCompletionTime} días\n`;
  text += `Completadas a tiempo: ${stats.onTime}\n`;
  text += `Completadas con retraso: ${stats.delayed}\n\n`;

  text += `POR PRIORIDAD\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Alta: ${stats.byPriority.high || 0}\n`;
  text += `Media: ${stats.byPriority.medium || 0}\n`;
  text += `Baja: ${stats.byPriority.low || 0}\n\n`;

  text += `POR DEPARTAMENTO\n`;
  text += `${'─'.repeat(50)}\n`;
  Object.entries(stats.byDepartment).forEach(([dept, count]) => {
    text += `${translateDepartment(dept)}: ${count}\n`;
  });

  return text;
}

// Utilidades
function escapeCSV(str) {
  return String(str).replace(/"/g, '""');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX');
}

function translateStatus(status) {
  const translations = {
    'pending': 'Pendiente',
    'in-progress': 'En Progreso',
    'completed': 'Completada'
  };
  return translations[status] || status;
}

function translatePriority(priority) {
  const translations = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja'
  };
  return translations[priority] || priority;
}

function translateDepartment(dept) {
  const translations = {
    'presidencia': 'Presidencia',
    'juridica': 'Jurídica',
    'obras': 'Obras Públicas',
    'tesoreria': 'Tesorería',
    'rrhh': 'Recursos Humanos',
    'administracion': 'Administración',
    'Sin asignar': 'Sin asignar'
  };
  return translations[dept] || dept;
}

function percentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
