// contexts/TasksContext.js
// Context global para sincronizar tareas entre todas las pantallas en tiempo real

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToTasks } from '../services/tasks';

export const TasksContext = createContext();

// 💾 Set persistente de tareas eliminadas (se guarda en localStorage)
const DELETED_TASKS_KEY = 'permanentlyDeletedTaskIds';

function saveDeletedTasks(deletedSet) {
  try {
    const arr = Array.from(deletedSet);
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(arr));
  } catch (e) {
    // Silent fail - localStorage is optional
  }
}

function loadDeletedTasks() {
  try {
    const arr = JSON.parse(localStorage.getItem(DELETED_TASKS_KEY) || '[]');
    return new Set(arr);
  } catch (e) {
    return new Set();
  }
}

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef(null);
  
  // 🛡️ Set global para rastrear tareas siendo eliminadas
  const deletingTasksRef = useRef(new Set());
  
  // 💾 Set PERSISTENTE de tareas eliminadas permanentemente
  const permanentlyDeletedRef = useRef(loadDeletedTasks());

  // Función para marcar tarea como "eliminándose"
  const markAsDeleting = useCallback((taskId) => {
    deletingTasksRef.current.add(taskId);
  }, []);

  // Función para desmarcar tarea (cuando se confirma eliminación)
  const unmarkAsDeleting = useCallback((taskId) => {
    deletingTasksRef.current.delete(taskId);
    // Al desmarcar, agregar a permanente para que NO reaparezca
    permanentlyDeletedRef.current.add(taskId);
    saveDeletedTasks(permanentlyDeletedRef.current);
  }, []);

  // Función para limpiar la lista de eliminados (en caso de sincronización)
  const clearDeletedTask = useCallback((taskId) => {
    permanentlyDeletedRef.current.delete(taskId);
    saveDeletedTasks(permanentlyDeletedRef.current);
  }, []);

  // Suscribirse al listener global de tareas
  useEffect(() => {
    let mounted = true;

    const setupSubscription = async () => {
      try {
        unsubscribeRef.current = await subscribeToTasks((updatedTasks) => {
          if (!mounted) return;
          
          // 🛡️ FILTRAR: No restaurar tareas que están siendo eliminadas O fueron eliminadas permanentemente
          const filteredTasks = updatedTasks.filter(task => {
            const isBeingDeleted = deletingTasksRef.current.has(task.id);
            const isPermanentlyDeleted = permanentlyDeletedRef.current.has(task.id);
            return !isBeingDeleted && !isPermanentlyDeleted;
          });
          
          setTasks(filteredTasks);
          setIsLoading(false);
        });
      } catch (error) {
        // Error silencioso en producción
        setIsLoading(false);
      }
    };

    setupSubscription();

    // Limpiar al desmontar
    return () => {
      mounted = false;
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
      }
    };
  }, []);

  const value = {
    tasks,
    setTasks,
    isLoading,
    markAsDeleting,
    unmarkAsDeleting,
    clearDeletedTask,
    deletingTasksRef,
    permanentlyDeletedRef,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// Hook personalizado para usar el contexto de tareas
export function useTasks() {
  const context = React.useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe estar dentro de TasksProvider');
  }
  return context;
}
