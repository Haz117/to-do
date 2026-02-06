// components/OverdueAlert.js
// ✨ Alerta mejorada para tareas vencidas - Usa AlertBanner profesional
import React from 'react';
import AlertBanner from './AlertBanner';
import { useTheme } from '../contexts/ThemeContext';

export default function OverdueAlert({ tasks, currentUserEmail, role = 'operativo' }) {
  const { isDark } = useTheme();
  
  if (!tasks || tasks.length === 0) return null;

  // Filtrar tareas vencidas según rol
  let overdueTasks = [];
  
  if (role === 'admin') {
    overdueTasks = tasks.filter(task => task.dueAt < Date.now() && task.status !== 'cerrada');
  } else if (role === 'jefe') {
    overdueTasks = tasks.filter(task => 
      task.dueAt < Date.now() && 
      task.status !== 'cerrada'
    );
  } else {
    overdueTasks = tasks.filter(task => 
      task.dueAt < Date.now() && 
      task.status !== 'cerrada' &&
      task.assignedTo === currentUserEmail
    );
  }

  const overdueCount = overdueTasks.length;
  if (overdueCount === 0) return null;

  const title = overdueCount === 1 ? 'Tarea vencida' : 'Tareas vencidas';
  const message = overdueCount === 1 
    ? 'Una tarea requiere atención inmediata' 
    : `${overdueCount} tareas requieren atención inmediata`;

  return (
    <AlertBanner
      type="error"
      title={title}
      message={message}
      icon="alert-circle"
      dismissible={false}
      animated={true}
    />
  );
}
