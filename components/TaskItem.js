// components/TaskItem.js
// TaskItem moderno con animaciones y glassmorphism - Compatible con web
import React, { useEffect, useState, memo, useRef } from 'react';
import { TouchableOpacity, Pressable, View, Text, StyleSheet, Animated, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { hapticMedium } from '../utils/haptics';
import { getSwipeable } from '../utils/platformComponents';
import ContextMenu from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';
import Avatar from './Avatar';
import PulsingDot from './PulsingDot';

const Swipeable = getSwipeable();

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
  onReopen,
  currentUserRole = 'operativo',
  index = 0,
  isDeleting: isDeleteProp = false  // ⚡ Prop para que el padre pueda controlar si se está borrando
}) {
  const { theme } = useTheme();
  const { width: screenWidth } = useResponsive();
  const isSmallDevice = screenWidth < 400;
  const [now, setNow] = useState(Date.now());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const deletePulseAnim = useRef(new Animated.Value(0)).current;
  
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

  // Animación de pulso cuando se está borrando
  useEffect(() => {
    if (isDeleteProp) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(deletePulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(deletePulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isDeleteProp]);
  
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

  // Construir acciones del menú basadas en permisos disponibles
  const menuActions = [
    // Solo mostrar duplicar si el callback está disponible (admin y jefe)
    ...(onDuplicate ? [{ icon: 'copy-outline', label: 'Duplicar tarea', onPress: () => { hapticMedium(); onDuplicate(task); } }] : []),
    { icon: 'share-outline', label: 'Compartir', onPress: () => { hapticMedium(); onShare && onShare(task); } },
    // Reabrir solo para admin si está cerrada
    ...(onReopen && task.status === 'cerrada' ? [{ icon: 'refresh-outline', label: 'Reabrir tarea', onPress: () => { hapticMedium(); onReopen(task); } }] : []),
    // Solo mostrar eliminar si el callback está disponible (solo admin) y no está en progreso
    ...(onDelete ? [{ icon: 'trash-outline', label: 'Eliminar', danger: true, onPress: () => { hapticMedium(); setShowDeleteDialog(true); } }] : [])
  ];

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    const isClosedAndNotAdmin = task.status === 'cerrada' && currentUserRole !== 'admin';
    
    return (
      <TouchableOpacity 
        style={styles.completeAction} 
        onPress={() => !isClosedAndNotAdmin && (onToggleComplete && onToggleComplete())} 
        activeOpacity={isClosedAndNotAdmin ? 0.5 : 0.9}
        disabled={isClosedAndNotAdmin}
      >
        <View style={[
          styles.actionGradient, 
          { 
            backgroundColor: task.status === 'cerrada' ? theme.info : '#34C759',
            opacity: isClosedAndNotAdmin ? 0.4 : 1
          }
        ]}>
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
      <TouchableOpacity 
        style={styles.deleteAction} 
        onPress={() => {
          // 🛡️ GUARD: No permitir delete si ya está en progreso
          if (isDeleting) {
            return;
          }
          if (onDelete) {
            setShowDeleteDialog(true);
          }
        }} 
        activeOpacity={0.9}
        disabled={isDeleting}
      >
        <View style={[styles.actionGradient, { backgroundColor: '#FF3B30', opacity: isDeleting ? 0.5 : 1 }]}>
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

  const getDueStatus = () => {
    const due = new Date(task.dueAt).getTime();
    const remaining = due - now;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (remaining <= 0) {
      return { topBorderColor: '#FF3B30', status: 'vencida' }; // Rojo - Vencida
    } else if (remaining <= oneDayMs) {
      return { topBorderColor: '#FF9500', status: 'proxima' }; // Naranja - Próxima a vencer
    }
    return { topBorderColor: 'transparent', status: 'normal' };
  };

  const priorityStyle = getPriorityStyle();
  const dueStatus = getDueStatus();

  return (
    <>
      <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} friction={1.5} overshootFriction={8}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <View
            style={[
              styles.container,
              { 
                backgroundColor: theme.card, 
                borderColor: theme.borderLight, 
                shadowColor: theme.shadow,
                opacity: isDeleteProp ? 0.6 : 1  // ⚡ Opcidad reducida cuando se está borrando
              },
              task.status === 'cerrada' && { opacity: isDeleteProp ? 0.6 : 0.7, backgroundColor: theme.backgroundTertiary }
            ]}
          >
            {/* Indicador prominente de "BORRANDO..." */}
            {isDeleteProp && (
              <Animated.View style={[
                styles.deletingOverlay, 
                { 
                  backgroundColor: '#FF3B30',
                  opacity: deletePulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1]
                  })
                }
              ]}>
                <ActivityIndicator 
                  size="large" 
                  color="#FFFFFF" 
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={styles.deletingTextBold}>
                    ¡BORRANDO!
                  </Text>
                  <Text style={styles.deletingTextSmall}>
                    Por favor espera...
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Indicador de vencimiento - badge de alerta */}
            {dueStatus.status !== 'normal' && (
              <View 
                style={[
                  styles.dueAlert,
                  { backgroundColor: dueStatus.topBorderColor }
                ]}
              >
                <Ionicons 
                  name={dueStatus.status === 'vencida' ? 'alert-circle' : 'time'} 
                  size={14} 
                  color="#FFF" 
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.dueAlertText}>
                  {dueStatus.status === 'vencida' ? 'VENCIDA' : 'POR VENCER'}
                </Text>
              </View>
            )}
            <View style={styles.contentRow}>
              {/* Contenido principal a la izquierda */}
              <TouchableOpacity 
                onPress={() => { hapticMedium(); onPress && onPress(task); }} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onLongPress={handleLongPress}
                delayLongPress={500}
                activeOpacity={0.9}
                style={styles.taskContent}
              >
                {/* Fila 1: Avatar + Título */}
                <View style={styles.row}>
                  {task.assignedTo && <Avatar name={task.assignedTo} size={isSmallDevice ? 32 : 36} style={styles.avatar} showBorder />}
                  <Text style={[styles.title, { color: theme.text }, task.status === 'cerrada' && styles.titleCompleted]} numberOfLines={2}>
                    {task.title}
                  </Text>
                </View>
              
                {/* Fila 2: Área • Asignado */}
                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {task.area || 'Sin área'} • {task.assignedTo || 'Sin asignar'}
                </Text>
                
                {/* Fila 3: Estado */}
                <Text style={[styles.statusText, { color: theme.textTertiary }]} numberOfLines={1}>
                  {task.status === 'en_progreso' ? 'En progreso' : task.status === 'en_revision' ? 'En revisión' : task.status === 'cerrada' ? 'Completada' : 'Pendiente'}
                </Text>
              </TouchableOpacity>
              
              {/* Acciones a la derecha: Chat + Delete */}
              <View style={styles.actionsRow}>
                {task.hasUnreadMessages && (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                    <Ionicons name="chatbubble" size={12} color="#FFF" />
                  </View>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => {
                      if (isDeleting) {
                        return;
                      }
                      hapticMedium();
                      setShowDeleteDialog(true);
                    }}
                    style={[styles.deleteButton, isSmallDevice && styles.deleteButtonSmall]}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    activeOpacity={isDeleting ? 0.3 : 0.7}
                    disabled={isDeleting}
                  >
                    <Ionicons name="trash-outline" size={isSmallDevice ? 18 : 22} color={isDeleting ? "#CCC" : "#FF3B30"} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </Swipeable>
      <ContextMenu visible={showContextMenu} onClose={() => setShowContextMenu(false)} position={menuPosition} actions={menuActions} />
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Eliminar tarea"
        message="¿Estás seguro de que quieres eliminar esta tarea?"
        icon="trash"
        iconColor="#FF3B30"
        danger
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={false}
        onConfirm={() => {
          // 🛡️ GUARD: Prevenir múltiples clics
          if (isDeleting) return;
          
          // ⚡ CERRAR INMEDIATAMENTE - ANTES que nada
          setShowDeleteDialog(false);
          setIsDeleting(true);
          
          // 🔄 Ejecutar delete en background
          setTimeout(() => {
            if (onDelete) {
              Promise.resolve(onDelete())
                .catch(err => {
                  // Delete handler error caught
                })
                .finally(() => setIsDeleting(false));
            } else {
              setIsDeleting(false);
            }
          }, 200); // Pequeño delay para asegurar que el dialog cerró
        }}
        onCancel={() => {
          if (!isDeleting) {
            setShowDeleteDialog(false);
          }
        }}
      />
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
    position: 'relative',
    overflow: 'hidden',
  },
  dueAlert: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  dueAlertText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    fontSize: 15, 
    fontWeight: '700', 
    flex: 1, 
    marginRight: 8,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '800',
    minWidth: 60,
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
    gap: 6,
    flexWrap: 'wrap',
  },
  meta: { 
    fontSize: 13, 
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  metaSmall: { 
    fontSize: 12,
    fontWeight: '600',
    color: '#999'
  },
  priorityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  priorityBadge: { 
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  taskContent: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  deleteButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  deleteButtonSmall: {
    padding: 6,
    minWidth: 34,
    minHeight: 34,
  },
  // ⚡ ESTILOS PARA INDICADOR DE BORRANDO
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 12,
  },
  deletingTextBold: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  deletingText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deletingTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
    opacity: 0.9,
  },
  actionsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
});
