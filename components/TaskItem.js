// components/TaskItem.js
// Componente que muestra título, fecha límite, usuario asignado y un countdown en vivo.
// Incluye swipe gestures para acciones rápidas
// Propiedades:
// - task: { id, title, description, dueAt (ISO/string/number), assignedTo }
// - onPress: función al presionar el item
// - onDelete: función para eliminar
// - onToggleComplete: función para marcar como completada
import React, { useEffect, useState, memo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

function formatRemaining(ms) {
  if (ms <= 0) return 'Vencida';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

const TaskItem = memo(function TaskItem({ task, onPress, onDelete, onToggleComplete }) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    // Actualiza cada segundo para el countdown en vivo
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const due = new Date(task.dueAt).getTime();
  const remaining = due - now;

  // Renderizar acciones al deslizar a la derecha (completar)
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp'
    });

    return (
      <TouchableOpacity
        style={styles.completeAction}
        onPress={() => onToggleComplete && onToggleComplete()}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
          <Ionicons 
            name={task.status === 'cerrada' ? 'refresh' : 'checkmark-circle'} 
            size={28} 
            color="#FFFFFF" 
          />
          <Text style={styles.actionText}>
            {task.status === 'cerrada' ? 'Reabrir' : 'Completar'}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Renderizar acciones al deslizar a la izquierda (eliminar)
  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp'
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete && onDelete()}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
          <Ionicons name="trash" size={28} color="#FFFFFF" />
          <Text style={styles.actionText}>Eliminar</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
    >
      <TouchableOpacity 
        onPress={() => onPress && onPress(task)} 
        style={[
          styles.container,
          task.status === 'cerrada' && styles.containerCompleted
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Text style={[
            styles.title,
            task.status === 'cerrada' && styles.titleCompleted
          ]}>
            {task.title}
          </Text>
          <Text style={[styles.badge, remaining <= 0 ? styles.badgeExpired : null]}>
            {formatRemaining(remaining)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {task.area || 'Sin área'} • {task.assignedTo || 'Sin asignar'}
          </Text>
          <Text style={styles.metaSmall}>{new Date(task.dueAt).toLocaleDateString()}</Text>
        </View>
        {task.priority && (
          <View style={styles.priorityRow}>
            <Text style={[styles.priorityBadge, task.priority === 'alta' && styles.priorityHigh, task.priority === 'media' && styles.priorityMedium]}>
              {task.priority.toUpperCase()}
            </Text>
            <Text style={styles.statusText}>{task.status === 'en_proceso' ? 'En proceso' : task.status === 'en_revision' ? 'En revisión' : task.status === 'cerrada' ? 'Completada' : task.status || 'Pendiente'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
});

export default TaskItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFAF0',
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 12
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1A1A1A', 
    flex: 1, 
    marginRight: 12,
    letterSpacing: -0.5,
    lineHeight: 24
  },
  badge: {
    backgroundColor: '#DAA520',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center'
  },
  badgeExpired: { 
    backgroundColor: '#8B0000'
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  meta: { 
    color: '#6E6E73', 
    fontSize: 14, 
    fontWeight: '500',
    letterSpacing: 0.1
  },
  metaSmall: { 
    color: '#AEAEB2', 
    fontSize: 13,
    fontWeight: '500'
  },
  priorityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
    gap: 10
  },
  priorityBadge: { 
    fontSize: 11, 
    fontWeight: '700', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 6, 
    backgroundColor: '#F2F2F7', 
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  priorityHigh: { 
    backgroundColor: '#FFE4E1', 
    color: '#8B0000'
  },
  priorityMedium: { 
    backgroundColor: '#FFF8DC', 
    color: '#DAA520'
  },
  statusText: { 
    fontSize: 13, 
    color: '#8E8E93', 
    fontWeight: '500',
    fontStyle: 'italic'
  },
  completeAction: {
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 12
  },
  deleteAction: {
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 12
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  containerCompleted: {
    opacity: 0.6,
    backgroundColor: '#F2F2F7'
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93'
  }
});
