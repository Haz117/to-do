// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Implementa Drag & Drop para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada - Compatible con web
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGestureHandlerRootView } from '../utils/platformComponents';
// Temporarily disabled Animated imports that may cause issues
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   runOnJS,
// } from 'react-native-reanimated';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import SpringCard from '../components/SpringCard';
import BottomSheet from '../components/BottomSheet';
import OverdueAlert from '../components/OverdueAlert';

const GestureHandlerRootView = getGestureHandlerRootView();
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { subscribeToTasks, updateTask } from '../services/tasks';
import { getCurrentSession } from '../services/authFirestore';
import { hapticMedium, hapticHeavy, hapticLight } from '../utils/haptics';
import Toast from '../components/Toast';
import TaskStatusButtons from '../components/TaskStatusButtons';
import { useTheme } from '../contexts/ThemeContext';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#FF9800', icon: 'hourglass-outline' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196F3', icon: 'play-circle-outline' },
  { key: 'en_revision', label: 'En revisión', color: '#9C27B0', icon: 'eye-outline' },
  { key: 'cerrada', label: 'Cerrada', color: '#4CAF50', icon: 'checkmark-circle-outline' }
];

export default function KanbanScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  const [refreshing, setRefreshing] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [compactView, setCompactView] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date' o 'priority'
  const [contextMenu, setContextMenu] = useState({ visible: false, task: null, position: { x: 0, y: 0 } });
  
  // Animaciones
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const columnsSlide = useRef(new Animated.Value(100)).current;

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Calcular ancho de columnas según tamaño de pantalla
  const getColumnWidth = () => {
    const screenWidth = dimensions.width;
    const isWeb = Platform.OS === 'web';
    const padding = 32; // 16px a cada lado
    const gap = 16;
    
    if (isWeb && screenWidth > 1400) {
      // Desktop grande: 4 columnas
      return (screenWidth - padding - (gap * 3)) / 4;
    } else if (isWeb && screenWidth > 1024) {
      // Desktop: 3 columnas
      return (screenWidth - padding - (gap * 2)) / 3;
    } else if (screenWidth > 768) {
      // Tablet: 2 columnas
      return (screenWidth - padding - gap) / 2;
    } else {
      // Móvil: 1 columna casi completa
      return screenWidth - padding;
    }
  };

  const columnWidth = getColumnWidth();

  // Obtener rol del usuario
  useEffect(() => {
    getCurrentSession().then(result => {
      if (result.success) {
        setCurrentUserRole(result.session.role);
        setCurrentUser(result.session);
      }
    });
  }, []);

  // Animación de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(columnsSlide, {
        toValue: 0,
        delay: 150,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    let unsubscribe;
    
    subscribeToTasks((updatedTasks) => {
      console.log('[Kanban] Tareas recibidas:', updatedTasks.length, updatedTasks);
      setTasks(updatedTasks);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const changeStatus = useCallback(async (taskId, newStatus) => {
    try {
      hapticMedium(); // Haptic on status change
      await updateTask(taskId, { status: newStatus });
      setToastMessage('✅ Estado actualizado correctamente');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      setToastMessage('❌ Error al actualizar estado');
      setToastType('error');
      setToastVisible(true);
      console.error('Error updating task status:', error);
    }
  }, []);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    await changeStatus(taskId, newStatus);
  }, [changeStatus]);

  const openDetail = useCallback((task) => navigation.navigate('TaskDetail', { task }), [navigation]);

  // Función para detectar en qué columna se soltó la tarjeta
  const getColumnAtPosition = (x) => {
    // Aproximación: cada columna tiene 300px de ancho + 16px de margen
    const columnWidth = 316;
    const columnIndex = Math.floor((x + 16) / columnWidth);
    if (columnIndex >= 0 && columnIndex < STATUSES.length) {
      return STATUSES[columnIndex].key;
    }
    return null;
  };

  const handleDragEnd = (task, event) => {
    const { absoluteX } = event.nativeEvent;
    const targetStatus = getColumnAtPosition(absoluteX);
    
    if (targetStatus && targetStatus !== task.status) {
      changeStatus(task.id, targetStatus);
    }
    
    setDraggingTask(null);
  };

  // Componente de tarjeta arrastrable
  const DraggableCard = ({ item, status }) => {
    const isOverdue = isTaskOverdue(item);
    const priorityColors = { alta: '#EF4444', media: '#F59E0B', baja: '#10B981' };
    const priorityColor = priorityColors[item.priority] || '#94A3B8';
    
    return (
      <SpringCard
        onPress={() => {
          hapticLight();
          openDetail(item);
        }}
        onLongPress={() => {
          hapticMedium();
          setContextMenu({ visible: true, task: item, position: { x: 0, y: 0 } });
        }}
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
          draggingTask?.id === item.id && styles.cardDragging,
          compactView && { paddingVertical: 8, paddingHorizontal: 12 }
        ]}
      >
        {/* Header con badges - Solo en vista expandida */}
        {!compactView && (
          <View style={styles.cardTopRow}>
            <View style={[
              styles.priorityChip,
              item.priority === 'alta' && { backgroundColor: '#DC2626' },
              item.priority === 'media' && { backgroundColor: '#F59E0B' },
              item.priority === 'baja' && { backgroundColor: '#10B981' }
            ]}>
              <Ionicons 
                name={item.priority === 'alta' ? 'flash' : item.priority === 'media' ? 'warning' : 'checkmark-circle'} 
                size={12} 
                color="#FFFFFF" 
              />
              <Text style={styles.priorityChipText}>
                {item.priority === 'alta' ? 'URGENTE' : item.priority === 'media' ? 'MEDIA' : 'BAJA'}
              </Text>
            </View>
            
            {isOverdue && (
              <View style={styles.overdueChip}>
                <Ionicons name="time" size={12} color="#FFFFFF" />
                <Text style={styles.overdueChipText}>VENCIDA</Text>
              </View>
            )}
          </View>
        )}

        {/* Título con indicador de prioridad en vista compacta */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {compactView && (
            <View style={[styles.compactPriorityDot, { backgroundColor: priorityColor }]} />
          )}
          <Text 
            style={[styles.cardTitle, { color: theme.text }]} 
            numberOfLines={compactView ? 1 : 3}
          >
            {item.title}
          </Text>
          {compactView && isOverdue && (
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
          )}
        </View>
        
        {/* Meta información - Solo en vista expandida */}
        {!compactView && (
          <View style={styles.cardInfoGrid}>
            <View style={[styles.cardInfoItem, { backgroundColor: theme.surface }]}>
              <Ionicons name="person" size={14} color={status.color} />
              <Text style={[styles.cardInfoText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.assignedTo || 'Sin asignar'}
              </Text>
            </View>
            
            <View style={[styles.cardInfoItem, { backgroundColor: theme.surface }]}>
              <Ionicons name="calendar-outline" size={14} color={status.color} />
              <Text style={[styles.cardInfoText, { color: theme.textSecondary }]}>
                {new Date(item.dueAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
        )}
        
        {/* Botones de cambio de estado */}
        {currentUserRole === 'operativo' && !compactView && (
          <TaskStatusButtons
            currentStatus={item.status}
            taskId={item.id}
            onStatusChange={handleStatusChange}
          />
        )}
      </SpringCard>
    );
  };

  // Aplicar filtros con memoización
  const applyFilters = useCallback((taskList) => {
    return taskList.filter(task => {
      if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      if (filters.area && task.area !== filters.area) return false;
      if (filters.responsible && task.assignedTo !== filters.responsible) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.overdue && task.dueAt >= Date.now()) return false;
      return true;
    });
  }, [filters]);

  // Ordenar tareas
  const sortTasks = useCallback((taskList) => {
    const sorted = [...taskList];
    if (sortBy === 'priority') {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      // Ordenar por fecha (más reciente primero)
      sorted.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
    }
    return sorted;
  }, [sortBy]);

  // Verificar si una tarea está vencida
  const isTaskOverdue = (task) => {
    if (!task.dueAt || task.status === 'cerrada') return false;
    try {
      const dueDate = task.dueAt.toDate ? task.dueAt.toDate() : new Date(task.dueAt);
      return dueDate < new Date();
    } catch (e) {
      return false;
    }
  };

  // Cambiar prioridad rápidamente
  const changePriority = async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      hapticMedium();
      setToastMessage(`✅ Prioridad cambiada a ${priority}`);
      setToastType('success');
      setToastVisible(true);
      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
    } catch (error) {
      console.error('Error cambiando prioridad:', error);
    }
  };

  // Memoizar tareas por estado para evitar recalcular en cada render
  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(status => {
      const byStatus = tasks.filter(t => {
        const taskStatus = t.status || 'pendiente';
        return taskStatus === status.key;
      });
      const filtered = applyFilters(byStatus);
      const sorted = sortTasks(filtered);
      grouped[status.key] = { byStatus, filtered, sorted };
    });
    return grouped;
  }, [tasks, applyFilters, sortTasks]);

  const renderColumn = (status) => {
    const { byStatus, filtered, sorted } = tasksByStatus[status.key] || { byStatus: [], filtered: [], sorted: [] };
    const completionRate = byStatus.length > 0 ? (filtered.length / byStatus.length) * 100 : 0;

    return (
      <View key={status.key} style={[styles.column, { backgroundColor: theme.surface }]}>
        <View style={[styles.columnHeader, { backgroundColor: status.color + '20' }]}>
          <View style={styles.columnTitleContainer}>
            <View style={[styles.columnIconCircle, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
          </View>
          <View style={[styles.columnCount, { backgroundColor: status.color }]}>
            <Text style={styles.columnCountText}>{sorted.length}</Text>
          </View>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DraggableCard item={item} status={status} />}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      </View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, columnWidth), [theme, isDark, columnWidth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.headerGradient, { backgroundColor: isDark ? '#1A1A1A' : '#9F2241' }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingContainer}>
                <Ionicons name="apps" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.greeting}>Vista de tablero</Text>
              </View>
              <Text style={styles.heading}>Kanban</Text>
            </View>
            <View style={styles.headerActions}>
              {/* Toggle vista compacta */}
              <TouchableOpacity 
                onPress={() => {
                  setCompactView(!compactView);
                  hapticLight();
                }}
                style={[styles.iconButton, compactView && styles.iconButtonActive]}
              >
                <Ionicons 
                  name={compactView ? 'list' : 'grid-outline'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              {/* Toggle ordenamiento */}
              <TouchableOpacity 
                onPress={() => {
                  setSortBy(sortBy === 'date' ? 'priority' : 'date');
                  hapticLight();
                }}
                style={styles.iconButton}
              >
                <Ionicons 
                  name={sortBy === 'date' ? 'time-outline' : 'flag-outline'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              {/* Estadísticas */}
              <TouchableOpacity 
                onPress={() => setShowStats(!showStats)}
                style={styles.iconButton}
              >
                <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Alerta de tareas vencidas */}
        <OverdueAlert 
          tasks={tasks} 
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
        />
        
        <FilterBar onFilterChange={setFilters} />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.board}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#9F2241"
              colors={['#9F2241']}
            />
          }
        >
          {STATUSES.map(renderColumn)}
        </ScrollView>
        
        {/* Indicador visual de drag en proceso */}
        {draggingTask && (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={20} color="#9F2241" />
            <Text style={styles.dragIndicatorText}>
              Arrastra a una columna para cambiar estado
            </Text>
          </View>
        )}

        {/* FAB para crear tarea */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => {
            hapticMedium();
            navigation.navigate('TaskDetail', { task: null });
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Menú contextual */}
        {contextMenu.visible && contextMenu.task && (
          <BottomSheet
            visible={contextMenu.visible}
            onClose={() => setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } })}
            height={300}
            title="Edición Rápida"
          >
            <View style={styles.contextMenuContent}>
              <Text style={[styles.contextTaskTitle, { color: theme.text }]}>
                {contextMenu.task.title}
              </Text>
              
              <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Cambiar prioridad:</Text>
              <View style={styles.priorityOptions}>
                {['alta', 'media', 'baja'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: theme.surface },
                      contextMenu.task.priority === priority && { backgroundColor: theme.primary + '20' }
                    ]}
                    onPress={() => changePriority(contextMenu.task.id, priority)}
                  >
                    <Text style={[styles.priorityOptionText, { color: theme.text }]}>
                      {priority === 'alta' ? '🔴 Alta' : priority === 'media' ? '🟡 Media' : '🟢 Baja'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.contextLabel, { color: theme.textSecondary, marginTop: 16 }]}>Cambiar estado:</Text>
              <View style={styles.statusOptions}>
                {STATUSES.map(status => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusOption,
                      { backgroundColor: status.color + '20' },
                      contextMenu.task.status === status.key && { borderWidth: 2, borderColor: status.color }
                    ]}
                    onPress={() => {
                      changeStatus(contextMenu.task.id, status.key);
                      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
                    }}
                  >
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={[styles.statusOptionText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BottomSheet>
        )}

        {/* BottomSheet para estadísticas */}
        <BottomSheet
          visible={showStats}
          onClose={() => setShowStats(false)}
          height={400}
          title="Estadísticas del Tablero"
        >
          <View style={styles.statsContainer}>
            {STATUSES.map(status => {
              const statusTasks = tasks.filter(t => t.status === status.key);
              const total = tasks.length;
              const percentage = total > 0 ? (statusTasks.length / total) * 100 : 0;
              
              return (
                <View key={status.key} style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={styles.statLabel}>{status.label}</Text>
                  </View>
                  <View style={styles.statProgress}>
                    <CircularProgress
                      size={60}
                      strokeWidth={6}
                      progress={percentage}
                      color={status.color}
                    />
                    <View style={styles.statNumbers}>
                      <Text style={styles.statCount}>{statusTasks.length}</Text>
                      <Text style={styles.statPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </BottomSheet>

        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (theme, isDark, columnWidth = 300) => StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: theme.background
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  heading: { 
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  priorityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120
  },
  areaText: {
    fontSize: 11,
    fontWeight: '600'
  },
  contextMenuContent: {
    padding: 16
  },
  contextTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600'
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  board: { paddingHorizontal: 16, paddingVertical: 20 },
  column: { 
    width: columnWidth, 
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: theme.card,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  columnHeader: { 
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  columnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  columnTitle: { 
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  columnCount: { 
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  columnCountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  card: { 
    margin: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.2 : 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  cardDragging: {
    opacity: 0.8,
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.25,
    shadowRadius: 15
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap'
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2
  },
  priorityChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  compactPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  overdueChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  cardTitle: { 
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 14,
    lineHeight: 22,
    letterSpacing: -0.2
  },
  cardInfoGrid: {
    gap: 8,
    marginBottom: 14
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12
  },
  cardInfoText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  dragIndicator: {
    position: 'absolute',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.primary
  },
  dragIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F2241',
    letterSpacing: 0.3
  },
  statsContainer: {
    padding: 16,
  },
  statItem: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    color: theme.text,
  },
  statProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statNumbers: {
    alignItems: 'flex-end',
  },
  statCount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
  },
  statPercentage: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
