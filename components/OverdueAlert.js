// components/OverdueAlert.js
// Banner de advertencia para tareas vencidas - Reutilizable en todas las pantallas
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function OverdueAlert({ tasks, currentUserEmail, role = 'operativo' }) {
  const { theme, isDark } = useTheme();
  
  if (!tasks || tasks.length === 0) return null;

  // Filtrar tareas vencidas según rol
  let overdueTasks = [];
  
  if (role === 'admin') {
    // Admin ve todas las tareas vencidas
    overdueTasks = tasks.filter(task => task.dueAt < Date.now() && task.status !== 'cerrada');
  } else if (role === 'jefe') {
    // Jefe ve tareas vencidas de su departamento
    overdueTasks = tasks.filter(task => 
      task.dueAt < Date.now() && 
      task.status !== 'cerrada' &&
      task.area === task.userDepartment // Filtrar por departamento
    );
  } else {
    // Operativo solo ve sus tareas vencidas
    overdueTasks = tasks.filter(task => 
      task.dueAt < Date.now() && 
      task.status !== 'cerrada' &&
      task.assignedTo === currentUserEmail
    );
  }

  const overdueCount = overdueTasks.length;

  if (overdueCount === 0) return null;

  return (
    <View style={[
      styles.overdueAlert, 
      { 
        backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', 
        borderColor: '#DC2626' 
      }
    ]}>
      <Ionicons name="warning" size={24} color="#DC2626" />
      <View style={styles.alertTextContainer}>
        <Text style={[styles.alertTitle, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
          ⚠️ {overdueCount} {overdueCount === 1 ? 'tarea vencida' : 'tareas vencidas'}
        </Text>
        <Text style={[styles.alertSubtitle, { color: isDark ? '#FEE2E2' : '#991B1B' }]}>
          {overdueCount === 1 ? 'Requiere atención inmediata' : 'Requieren atención inmediata'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  alertTextContainer: {
    flex: 1
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2
  },
  alertSubtitle: {
    fontSize: 13,
    fontWeight: '500'
  }
});
