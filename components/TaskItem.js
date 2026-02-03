// components/TaskItem.js
// TaskItem moderno con animaciones y glassmorphism - Compatible con web
import React, { useEffect, useState, memo, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium } from '../utils/haptics';
import { getSwipeable } from '../utils/platformComponents';
import ContextMenu from './ContextMenu';
import Avatar from './Avatar';
import PulsingDot from './PulsingDot';
import TaskStatusButtons from './TaskStatusButtons';

const Swipeable = getSwipeable();
const { width } = Dimensions.get('window');

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
  onChangeStatus,
  currentUserRole = 'operativo',
  index = 0 
}) {
  const { theme } = useTheme();
  const [now, setNow] = useState(Date.now());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Animación de entrada escalonada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);
  
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const due = new Date(task.dueAt).getTime();
  const remaining = due - now;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = (event) => {
    hapticMedium();
    event.nativeEvent.target.measure((fx, fy, width, height, px, py) => {
      setMenuPosition({ x: px + 10, y: py + height + 5 });
      setShowContextMenu(true);
    });
  };

  const menuActions = [
    { icon: 'copy-outline', label: 'Duplicar tarea', onPress: () => { hapticMedium(); onDuplicate && onDuplicate(task); } },
    { icon: 'share-outline', label: 'Compartir', onPress: () => { hapticMedium(); onShare && onShare(task); } },
    { icon: 'trash-outline', label: 'Eliminar', danger: true, onPress: () => { hapticMedium(); onDelete && onDelete(); } }
  ];

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={styles.completeAction} onPress={() => onToggleComplete && onToggleComplete()} activeOpacity={0.9}>
        <View style={[styles.actionGradient, { backgroundColor: task.status === 'cerrada' ? theme.info : '#34C759' }]}>
          <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
            <Ionicons name={task.status === 'cerrada' ? 'refresh' : 'checkmark-circle'} size={28} color="#FFF" />
            <Text style={styles.actionText}>{task.status === 'cerrada' ? 'Reabrir' : 'Completar'}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => onDelete && onDelete()} activeOpacity={0.9}>
        <View style={[styles.actionGradient, { backgroundColor: '#FF3B30' }]}>
          <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
            <Ionicons name="trash" size={28} color="#FFF" />
            <Text style={styles.actionText}>Eliminar</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const getPriorityStyle = () => {
    switch (task.priority) {
      case 'alta': return { bg: theme.priorityHighBg, color: theme.priorityHigh };
      case 'media': return { bg: theme.priorityMediumBg, color: theme.priorityMedium };
      case 'baja': return { bg: theme.priorityLowBg, color: theme.priorityLow };
      default: return { bg: theme.badgeBackground, color: theme.textSecondary };
    }
  };

  const priorityStyle = getPriorityStyle();

  return (
    <>
      <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} friction={1.5} overshootFriction={8}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <TouchableOpacity 
            onPress={() => { hapticMedium(); onPress && onPress(task); }} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={[
              styles.container,
              { backgroundColor: theme.card, borderColor: theme.borderLight, shadowColor: theme.shadow },
              task.status === 'cerrada' && { opacity: 0.7, backgroundColor: theme.backgroundTertiary }
            ]}
            activeOpacity={0.9}
          >
            <View style={styles.row}>
              {task.assignedTo && <Avatar name={task.assignedTo} size={36} style={styles.avatar} showBorder />}
              <Text style={[styles.title, { color: theme.text }, task.status === 'cerrada' && styles.titleCompleted]} numberOfLines={2}>
                {task.title}
              </Text>
              {onDelete && (
                <TouchableOpacity
                  onPress={() => {
                    hapticMedium();
                    onDelete();
                  }}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>
              )}
              <View style={styles.badgeContainer}>
                {task.hasUnreadMessages && (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                    <Ionicons name="chatbubble" size={10} color="#FFF" />
                  </View>
                )}
                {remaining <= 0 && task.status !== 'cerrada' ? (
                  <View style={styles.overdueBadgeContainer}>
                    <Text style={styles.overdueBadge}>VENCIDA</Text>
                  </View>
                ) : (
                  <Text style={[styles.badge, { backgroundColor: theme.info, color: '#FFF' }]}>
                    {formatRemaining(remaining)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                {task.area || 'Sin área'} • {task.assignedTo || 'Sin asignar'}
              </Text>
              <Text style={[styles.metaSmall, { color: theme.textTertiary }]}>{new Date(task.dueAt).toLocaleDateString()}</Text>
            </View>
            {task.priority && (
              <View style={styles.priorityRow}>
                <Text style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg, color: priorityStyle.color }]}>
                  {task.priority.toUpperCase()}
                </Text>
                <Text style={[styles.statusText, { color: theme.textTertiary }]} numberOfLines={1}>
                  {task.status === 'en_progreso' ? 'En progreso' : task.status === 'en_revision' ? 'En revisión' : task.status === 'cerrada' ? 'Completada' : 'Pendiente'}
                </Text>
              </View>
            )}
            
            {/* Botones de cambio de estado solo para operativos */}
            {currentUserRole === 'operativo' && onChangeStatus && (
              <TaskStatusButtons 
                currentStatus={task.status} 
                onChangeStatus={onChangeStatus}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>
      <ContextMenu visible={showContextMenu} onClose={() => setShowContextMenu(false)} position={menuPosition} actions={menuActions} />
    </>
  );
});

export default TaskItem;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginHorizontal: 10,
    borderRadius: 12,
    padding: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 6,
    gap: 5
  },
  avatar: {
    marginRight: 8,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700', 
    flex: 1, 
    marginRight: 8,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '800',
    minWidth: 65,
    textAlign: 'center',
    letterSpacing: -0.2
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6,
    alignItems: 'center',
    gap: 6
  },
  meta: { 
    fontSize: 13, 
    fontWeight: '500',
    letterSpacing: 0.1,
    flex: 1,
  },
  metaSmall: { 
    fontSize: 12,
    fontWeight: '600'
  },
  priorityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6
  },
  priorityBadge: { 
    fontSize: 10, 
    fontWeight: '700', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '500',
    fontStyle: 'italic',
    flex: 1,
  },
  completeAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 12,
    marginRight: 16,
    overflow: 'hidden'
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 12,
    marginLeft: 16,
    overflow: 'hidden'
  },
  actionGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  overdueBadgeContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  overdueBadge: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    marginLeft: 4
  },
});
