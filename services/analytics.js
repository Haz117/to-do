// services/analytics.js
// Servicio de análisis y estadísticas de tareas
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Obtener métricas generales
 */
export const getGeneralMetrics = async (userId, userRole) => {
  try {
    let tasksQuery;
    
    if (userRole === 'admin') {
      // Admin ve todas las tareas
      tasksQuery = query(collection(db, 'tasks'));
    } else {
      // Otros usuarios ven solo sus tareas
      tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', userId)
      );
    }

    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = today - (30 * 24 * 60 * 60 * 1000);

    // Métricas básicas
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'cerrada').length;
    const pending = tasks.filter(t => t.status === 'pendiente').length;
    const inProgress = tasks.filter(t => t.status === 'en_proceso').length;
    const inReview = tasks.filter(t => t.status === 'en_revision').length;
    const overdue = tasks.filter(t => 
      t.status !== 'cerrada' && t.dueAt && t.dueAt < now
    ).length;

    // Métricas de tiempo
    const completedTasks = tasks.filter(t => t.status === 'cerrada' && t.completedAt && t.createdAt);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedTasks.length
      : 0;

    // Tareas por prioridad
    const byPriority = {
      alta: tasks.filter(t => t.priority === 'alta').length,
      media: tasks.filter(t => t.priority === 'media').length,
      baja: tasks.filter(t => t.priority === 'baja').length,
    };

    // Tareas creadas en periodos
    const createdToday = tasks.filter(t => t.createdAt >= today).length;
    const createdThisWeek = tasks.filter(t => t.createdAt >= weekAgo).length;
    const createdThisMonth = tasks.filter(t => t.createdAt >= monthAgo).length;

    // Tareas completadas en periodos
    const completedToday = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= today
    ).length;
    const completedThisWeek = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= weekAgo
    ).length;
    const completedThisMonth = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= monthAgo
    ).length;

    // Tasa de completitud
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

    // Productividad (tareas completadas vs creadas esta semana)
    const weeklyProductivity = createdThisWeek > 0 
      ? (completedThisWeek / createdThisWeek * 100).toFixed(1) 
      : 0;

    return {
      success: true,
      metrics: {
        total,
        completed,
        pending,
        inProgress,
        inReview,
        overdue,
        completionRate: parseFloat(completionRate),
        avgCompletionTime: Math.round(avgCompletionTime),
        byPriority,
        periods: {
          today: { created: createdToday, completed: completedToday },
          week: { created: createdThisWeek, completed: completedThisWeek },
          month: { created: createdThisMonth, completed: completedThisMonth },
        },
        weeklyProductivity: parseFloat(weeklyProductivity),
      }
    };
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener datos para gráfica de tendencia (últimos 30 días)
 */
export const getTrendData = async (userId, userRole) => {
  try {
    let tasksQuery;
    
    if (userRole === 'admin') {
      tasksQuery = query(collection(db, 'tasks'));
    } else {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', userId)
      );
    }

    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Últimos 30 días
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const created = tasks.filter(t => 
        t.createdAt >= date.getTime() && t.createdAt < nextDate.getTime()
      ).length;

      const completed = tasks.filter(t => 
        t.completedAt >= date.getTime() && t.completedAt < nextDate.getTime()
      ).length;

      days.push({
        date: date.toISOString().split('T')[0],
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        created,
        completed,
      });
    }

    return { success: true, data: days };
  } catch (error) {
    console.error('Error obteniendo datos de tendencia:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener estadísticas por área
 */
export const getAreaStats = async () => {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const areas = {};
    
    tasks.forEach(task => {
      const area = task.area || 'Sin área';
      
      if (!areas[area]) {
        areas[area] = {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          avgCompletionTime: 0,
        };
      }

      areas[area].total++;
      
      if (task.status === 'cerrada') {
        areas[area].completed++;
        if (task.completedAt && task.createdAt) {
          areas[area].avgCompletionTime += (task.completedAt - task.createdAt);
        }
      } else {
        areas[area].pending++;
        if (task.dueAt && task.dueAt < Date.now()) {
          areas[area].overdue++;
        }
      }
    });

    // Calcular promedios
    Object.keys(areas).forEach(area => {
      const completed = areas[area].completed;
      if (completed > 0) {
        areas[area].avgCompletionTime = Math.round(areas[area].avgCompletionTime / completed);
      }
      areas[area].completionRate = areas[area].total > 0 
        ? (areas[area].completed / areas[area].total * 100).toFixed(1)
        : 0;
    });

    return { success: true, areas };
  } catch (error) {
    console.error('Error obteniendo stats por área:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener top performers (usuarios más productivos)
 */
export const getTopPerformers = async () => {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const users = {};

    tasks.forEach(task => {
      const user = task.assignedTo || 'Sin asignar';
      
      if (!users[user]) {
        users[user] = {
          name: task.assignedToName || user,
          total: 0,
          completed: 0,
          completedThisWeek: 0,
          avgCompletionTime: 0,
          onTime: 0, // completadas antes del deadline
        };
      }

      users[user].total++;

      if (task.status === 'cerrada') {
        users[user].completed++;
        
        if (task.completedAt >= weekAgo) {
          users[user].completedThisWeek++;
        }

        if (task.completedAt && task.createdAt) {
          users[user].avgCompletionTime += (task.completedAt - task.createdAt);
        }

        if (task.dueAt && task.completedAt <= task.dueAt) {
          users[user].onTime++;
        }
      }
    });

    // Calcular tasas y ordenar
    const performers = Object.keys(users).map(userId => {
      const user = users[userId];
      return {
        userId,
        name: user.name,
        total: user.total,
        completed: user.completed,
        completedThisWeek: user.completedThisWeek,
        completionRate: user.total > 0 ? (user.completed / user.total * 100).toFixed(1) : 0,
        avgCompletionTime: user.completed > 0 
          ? Math.round(user.avgCompletionTime / user.completed)
          : 0,
        onTimeRate: user.completed > 0 ? (user.onTime / user.completed * 100).toFixed(1) : 0,
      };
    }).sort((a, b) => b.completedThisWeek - a.completedThisWeek);

    return { success: true, performers: performers.slice(0, 10) };
  } catch (error) {
    console.error('Error obteniendo top performers:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Formatear tiempo de milisegundos a texto legible
 */
export const formatCompletionTime = (ms) => {
  if (!ms || ms <= 0) return 'N/A';
  
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  } else {
    const minutes = Math.floor(ms / (60 * 1000));
    return `${minutes}m`;
  }
};
