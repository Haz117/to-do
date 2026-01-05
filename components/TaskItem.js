// components/TaskItem.js
// Componente que muestra título, fecha límite, usuario asignado y un countdown en vivo.
// Incluye swipe gestures para acciones rápidas y long-press menu
// Propiedades:
// - task: { id, title, description, dueAt (ISO/string/number), assignedTo }
// - onPress: función al presionar el item
// - onDelete: función para eliminar
// - onToggleComplete: función para marcar como completada
// - onDuplicate: función para duplicar
// - onShare: función para compartir
import React, { useEffect, useState, memo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from './ContextMenu';
import Avatar from './Avatar';
import * as Haptics from 'expo-haptics';
import PulsingDot from './PulsingDot';
import { LinearGradient } from 'expo-linear-gradient';

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

const TaskItem = memo(function TaskItem({ 
  task, 
  onPress, 
  onDelete, 
  onToggleComplete, 
  onDuplicate,
  onShare,
  index = 0 
}) {
  const [now, setNow] = useState(Date.now());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    // Actualiza cada 10 segundos para el countdown (optimización)
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const due = new Date(task.dueAt).getTime();
  const remaining = due - now;

  // Manejar long-press
  const handleLongPress = (event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Calcular posición del menú
    event.nativeEvent.target.measure((fx, fy, width, height, px, py) => {
      setMenuPosition({
        x: px + 10,
        y: py + height + 5
      });
      setShowContextMenu(true);
    });
  };

  // Acciones del menú contextual
  const menuActions = [
    {
      icon: 'copy-outline',
      label: 'Duplicar tarea',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDuplicate && onDuplicate(task);
      }
    },
    {
      icon: 'share-outline',
      label: 'Compartir',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onShare && onShare(task);
      }
    },
    {
      icon: 'pin-outline',
      label: 'Fijar arriba',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Implementar fijar
      }
    },
    {
      icon: 'trash-outline',
      label: 'Eliminar',
      danger: true,
      onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete && onDelete();
      }
    }
  ];

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
        <LinearGradient
          colors={task.status === 'cerrada' ? ['#3B82F6', '#2563EB'] : ['#10B981', '#059669']}
          style={styles.actionGradient}
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
        </LinearGradient>
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
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.actionGradient}
        >
          <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
            <Ionicons name="trash" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Eliminar</Text>
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Swipeable
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={1.5}
        overshootFriction={8}
        rightThreshold={30}
        leftThreshold={30}
      >
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress && onPress(task);
          }} 
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={[
            styles.container,
            task.status === 'cerrada' && styles.containerCompleted
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.row}>
            {/* Avatar del asignado */}
            {task.assignedTo && (
              <Avatar 
                name={task.assignedTo} 
                size={36}
                style={styles.avatar}
                showBorder
              />
            )}
            
            <Text 
              style={[
                styles.title,
                task.status === 'cerrada' && styles.titleCompleted,
                task.assignedTo && { marginLeft: 8, flex: 1 }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {task.title}
            </Text>
            
            {/* Badge con dot pulsante para vencidas */}
            <View style={styles.badgeContainer}>
              {remaining <= 0 && task.status !== 'cerrada' && (
                <PulsingDot size={8} color="#FF3B30" style={styles.pulsingDot} />
              )}
              <Text style={[styles.badge, remaining <= 0 ? styles.badgeExpired : null]}>
                {formatRemaining(remaining)}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
              {task.area || 'Sin área'} • {task.assignedTo || 'Sin asignar'}
            </Text>
            <Text style={styles.metaSmall} numberOfLines={1}>{new Date(task.dueAt).toLocaleDateString()}</Text>
          </View>
          {task.priority && (
            <View style={styles.priorityRow}>
              <Text style={[styles.priorityBadge, task.priority === 'alta' && styles.priorityHigh, task.priority === 'media' && styles.priorityMedium]}>
                {task.priority.toUpperCase()}
              </Text>
              <Text style={styles.statusText} numberOfLines={1} ellipsizeMode="tail">{task.status === 'en_proceso' ? 'En proceso' : task.status === 'en_revision' ? 'En revisión' : task.status === 'cerrada' ? 'Completada' : task.status || 'Pendiente'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>

      {/* Menú contextual */}
      <ContextMenu 
        visible={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        position={menuPosition}
        actions={menuActions}
      />
    </>
  );
});

export default TaskItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#F5DEB3'
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8
  },
  avatar: {
    marginRight: 8,
  },
  title: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#1A1A1A', 
    flex: 1, 
    marginRight: 8,
    letterSpacing: -0.4,
    lineHeight: 24,
    minWidth: '60%'
  },
  badge: {
    backgroundColor: '#5856D6',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 70,
    maxWidth: 100,
    textAlign: 'center',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    letterSpacing: -0.2
  },
  badgeExpired: { 
    backgroundColor: '#FF3B30'
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8
  },
  meta: { 
    color: '#1A1A1A', 
    fontSize: 14, 
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
    numberOfLines: 1
  },
  metaSmall: { 
    color: '#6E6E73', 
    fontSize: 14,
    fontWeight: '600'
  },
  priorityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
    gap: 10
  },
  priorityBadge: { 
    fontSize: 10, 
    fontWeight: '700', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    backgroundColor: '#F2F2F7', 
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start'
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
    fontStyle: 'italic',
    flex: 1,
    flexShrink: 1
  },
  completeAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden'
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden'
  },
  actionGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingRight: 20,
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  pulsingDot: {
    marginRight: 4
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93'
  }
});
