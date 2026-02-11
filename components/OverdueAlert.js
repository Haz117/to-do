// components/OverdueAlert.js
// ✨ Banner compacto para tareas vencidas
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function OverdueAlert({ tasks, currentUserEmail, role = 'operativo', onTaskPress }) {
  // ✅ EARLY RETURNS MUST BE BEFORE ALL HOOKS
  if (!tasks || tasks.length === 0) return null;

  // NOW call hooks after all early returns
  const { theme, isDark } = useTheme();

  // Categorizar tareas
  const { overdue, urgent } = useMemo(() => {
    const now = Date.now();
    const overdue = [];
    const urgent = [];

    const applicable = role === 'admin' || role === 'jefe' 
      ? tasks.filter(t => t.status !== 'cerrada')
      : tasks.filter(t => t.status !== 'cerrada' && t.assignedTo === currentUserEmail);

    applicable.forEach(task => {
      const diff = (new Date(task.dueAt).getTime() - now) / (1000 * 60 * 60);
      if (diff < 0) overdue.push(task);
      else if (diff < 6) urgent.push(task);
    });

    return { overdue, urgent };
  }, [tasks, currentUserEmail, role]);

  if (overdue.length === 0 && urgent.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#FFF9E6' }]}>
      {overdue.length > 0 && (
        <TouchableOpacity 
          style={styles.badge}
          onPress={() => overdue.length > 0 && onTaskPress?.(overdue[0])}
        >
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.badgeText}>{overdue.length} vencidas</Text>
        </TouchableOpacity>
      )}
      
      {urgent.length > 0 && (
        <TouchableOpacity 
          style={styles.badge}
          onPress={() => urgent.length > 0 && onTaskPress?.(urgent[0])}
        >
          <Ionicons name="timer" size={16} color="#FF9500" />
          <Text style={styles.badgeText}>{urgent.length} urgentes</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
