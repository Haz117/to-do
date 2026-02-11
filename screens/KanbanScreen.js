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
import FadeInView from '../components/FadeInView';

const GestureHandlerRootView = getGestureHandlerRootView();
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { subscribeToTasks, updateTask } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { getCurrentSession } from '../services/authFirestore';
import { hapticMedium, hapticHeavy, hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
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
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks } = useTasks();
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
  
  // Animaciones para cada columna (entrada escalonada)
  const columnAnimations = useRef({
    pendiente: new Animated.Value(0),
    en_proceso: new Animated.Value(0),
    en_revision: new Animated.Value(0),
    cerrada: new Animated.Value(0)
  }).current;
  
  // Animación para drag feedback
  const dragScaleAnim = useRef(new Animated.Value(1)).current;
  const dragOpacityAnim = useRef(new Animated.Value(1)).current;
  const dragShadowAnim = useRef(new Animated.Value(4)).current;
  
  // Animación del FAB
  const fabScale = useRef(new Animated.Value(0)).current;

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
    
    // Animar columnas con retraso escalonado
    const delays = [300, 400, 500, 600];
    STATUSES.forEach((status, index) => {
      Animated.timing(columnAnimations[status.key], {
        toValue: 1,
        duration: 500,
        delay: delays[index],
        useNativeDriver: true,
      }).start();
    });
    
    // Animar FAB con entrada spring
    Animated.spring(fabScale, {
      toValue: 1,
      delay: 700,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Suscribirse a cambios en tiempo real con debounce
  useEffect(() => {
    // Ya no necesitamos suscribirse, el TasksContext se encarga
    console.log('📊 KANBAN: Usando contexto global de tareas');
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
      
      // 🎨 ANIMACIÓN: Feedback visual de transición
      Animated.sequence([
        Animated.timing(new Animated.Value(0), {
          toValue: 1,
          duration: 0, // Imperceptible, solo para sincronización
          useNativeDriver: false,
        }),
      ]).start();
      
      await updateTask(taskId, { status: newStatus });
      setToastMessage('✨ Estado actualizado correctamente');
      setToastType('success');
      setToastVisible(true);
      
      // Haptic de éxito
      hapticSuccess();
    } catch (error) {
      setToastMessage('Error al actualizar estado');
      setToastType('error');
      setToastVisible(true);
      hapticWarning();
    }
  }, []);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    await changeStatus(taskId, newStatus);
  }, [changeStatus]);

  const openDetail = useCallback((task) => {
    // Solo admin y jefe pueden editar tareas
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'jefe')) {
      setToastMessage('Solo administradores y jefes pueden editar tareas');
      setToastType('info');
      setToastVisible(true);
      return;
    }
    navigation.navigate('TaskDetail', { task });
  }, [navigation, currentUser, setToastMessage, setToastType, setToastVisible]);

  // Función para detectar en qué columna se soltó la tarjeta
  const getColumnAtPosition = (x) => {
    // Usar columnWidth dinámico en lugar de valores hardcodeados
    const gap = 16;
    const actualColumnWidth = columnWidth + gap;
    const columnIndex = Math.floor((x + gap) / actualColumnWidth);
    if (columnIndex >= 0 && columnIndex < STATUSES.length) {
      return STATUSES[columnIndex].key;
    }
    return null;
  };

  const handleDragEnd = (task, event) => {
    const { absoluteX } = event.nativeEvent;
    const targetStatus = getColumnAtPosition(absoluteX);
    
    if (targetStatus && targetStatus !== task.status) {
      // 🎨 ANIMACIÓN: Scale down y fade out
      Animated.parallel([
        Animated.timing(dragScaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dragOpacityAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Cambiar estado
        changeStatus(task.id, targetStatus);
        
        // 🎨 ANIMACIÓN: Spring bounce de vuelta
        Animated.parallel([
          Animated.spring(dragScaleAnim, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(dragOpacityAnim, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });
      
      // Haptic feedback mejorado
      hapticHeavy(); // Feedback más fuerte al arrastrar
    }
    
    // Reset dragging state
    setDraggingTask(null);
    
    // Reset animaciones si no hubo cambio de estado
    if (!targetStatus || targetStatus === task.status) {
      Animated.parallel([
        Animated.spring(dragScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(dragOpacityAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Componente de tarjeta arrastrable con mejoras visuales
  const DraggableCard = ({ item, status }) => {
    const isOverdue = isTaskOverdue(item);
    const priorityColors = { alta: '#EF4444', media: '#F59E0B', baja: '#10B981' };
    const priorityColor = priorityColors[item.priority] || '#94A3B8';
    
    // Calcular días en el estado actual
    const daysInStatus = item.statusChangedAt ? 
      Math.floor((Date.now() - item.statusChangedAt) / (1000 * 60 * 60 * 24)) : 0;
    const statusAgeColor = daysInStatus > 10 ? '#DC2626' : daysInStatus > 5 ? '#F59E0B' : theme.textSecondary;
    
    // Borde según prioridad
    const borderColor = item.priority === 'alta' ? '#EF4444' : 
                        item.priority === 'media' ? '#F59E0B' : theme.border;
    
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
          { 
            backgroundColor: theme.cardBackground, 
            borderColor: borderColor,
            borderWidth: item.priority === 'alta' ? 2 : 1,
            borderLeftWidth: 4,
            borderLeftColor: priorityColor
          },
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
              {/* Pulsación para prioridad alta */}
              {item.priority === 'alta' && <PulsingDot size={6} color="#FFFFFF" />}
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
            <>
              <View style={[styles.compactPriorityDot, { backgroundColor: priorityColor }]} />
              {item.priority === 'alta' && <PulsingDot size={4} color={priorityColor} />}
            </>
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
          <>
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
            
            {/* Indicador de días en estado actual */}
            {daysInStatus > 0 && (
              <View style={[styles.statusAgeIndicator, { backgroundColor: theme.surface }]}>
                <Ionicons name="time-outline" size={12} color={statusAgeColor} />
                <Text style={[styles.statusAgeText, { color: statusAgeColor }]}>
                  {daysInStatus === 1 ? 'Hace 1 día' : `Hace ${daysInStatus} días`}
                </Text>
                {daysInStatus > 10 && <Ionicons name="warning" size={12} color={statusAgeColor} />}
              </View>
            )}
          </>
        )}
        
        {/* Botones de cambio de estado - Disponible para todos los roles */}
        {!compactView && (
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
      setToastMessage(`Prioridad cambiada a ${priority}`);
      setToastType('success');
      setToastVisible(true);
      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
    } catch (error) {
      // Error silencioso
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
    
    // Calcular tareas vencidas en esta columna
    const overdueTasks = sorted.filter(task => task.dueAt < Date.now()).length;
    
    // Calcular tareas de alta prioridad
    const highPriorityTasks = sorted.filter(task => task.priority === 'alta').length;

    const columnAnimation = columnAnimations[status.key];
    const animatedStyle = {
      opacity: columnAnimation,
      transform: [
        {
          translateY: columnAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }
      ]
    };

    return (
      <Animated.View key={status.key} style={[styles.column, { backgroundColor: theme.surface }, animatedStyle]}>
        <View style={[styles.columnHeader, { backgroundColor: status.color + '20' }]}>
          <View style={styles.columnTitleContainer}>
            <View style={[styles.columnIconCircle, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
          </View>
          
          {/* Badges y estadísticas mejoradas */}
          <View style={styles.columnBadges}>
            {/* Contador principal con pulso si hay urgentes */}
            <View style={styles.columnCountContainer}>
              <View style={[styles.columnCount, { backgroundColor: status.color }]}>
                <Text style={styles.columnCountText}>{sorted.length}</Text>
              </View>
              {highPriorityTasks > 0 && <PulsingDot size={8} color={status.color} />}
            </View>
            
            {/* Badge de vencidas si hay - CON PULSO */}
            {overdueTasks > 0 && (
              <View style={styles.badgeContainer}>
                <View style={[styles.overdueColumnBadge, { backgroundColor: '#DC2626' }]}>
                  <Ionicons name="alert-circle" size={12} color="#FFFFFF" />
                  <Text style={styles.columnCountText}>{overdueTasks}</Text>
                </View>
                <PulsingDot size={6} color="#DC2626" />
              </View>
            )}
            
            {/* Badge de alta prioridad - CON PULSO */}
            {highPriorityTasks > 0 && (
              <View style={styles.badgeContainer}>
                <View style={[styles.priorityColumnBadge, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="flag" size={12} color="#FFFFFF" />
                  <Text style={styles.columnCountText}>{highPriorityTasks}</Text>
                </View>
                <PulsingDot size={6} color="#F59E0B" />
              </View>
            )}
          </View>
        </View>
        
        {/* Barra de progreso */}
        {byStatus.length > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: status.color,
                    width: `${completionRate}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {Math.round(completionRate)}% ({sorted.length}/{byStatus.length})
            </Text>
          </View>
        )}

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DraggableCard item={item} status={status} />}
          contentContainerStyle={{ paddingBottom: 12 }}
          ListEmptyComponent={() => (
            <FadeInView duration={400} delay={200} style={styles.emptyColumnState}>
              <View style={styles.emptyStateContent}>
                <View style={[styles.emptyStateIconContainer, { backgroundColor: status.color + '15' }]}>
                  <Ionicons 
                    name={status.key === 'cerrada' ? 'checkmark-circle-outline' : 'document-text-outline'} 
                    size={52} 
                    color={status.color} 
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  {status.key === 'cerrada' ? '¡Todo listo! 🎉' : 'Columna vacía'}
                </Text>
                <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
                  {status.key === 'cerrada' 
                    ? 'Todas las tareas están completadas' 
                    : 'Aquí aparecerán las tareas \n del estado ' + status.label}
                </Text>
              </View>
            </FadeInView>
          )}
        />
      </Animated.View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, columnWidth), [theme, isDark, columnWidth]);

  // Estilo animado para FAB
  const fabAnimatedStyle = {
    transform: [{ scale: fabScale }],
    opacity: fabScale,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingContainer}>
                <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Hola!</Text>
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

        {/* Alerta de tareas vencidas - Compacta */}
        <OverdueAlert 
          tasks={tasks} 
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
          onTaskPress={(task) => {
            hapticLight();
            openDetail(task);
          }}
        />
        
        {/* Barra unificada: Filtros rápidos + Búsqueda */}
        <View style={[styles.unifiedFilterBar, { backgroundColor: theme.surface }]}>
          {/* Chips de filtro rápido horizontal */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.quickFiltersRow}
          >
            {/* Filtro: Vencidas */}
            {tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada').length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ ...filters, overdue: !filters.overdue });
                  hapticLight();
                }}
                style={[
                  styles.quickFilterChip,
                  { 
                    backgroundColor: filters.overdue ? '#DC2626' : theme.cardBackground,
                    borderColor: filters.overdue ? '#DC2626' : theme.border
                  }
                ]}
              >
                <Ionicons 
                  name="alert-circle" 
                  size={14} 
                  color={filters.overdue ? '#FFFFFF' : '#DC2626'} 
                />
                <Text style={[
                  styles.quickFilterText, 
                  { color: filters.overdue ? '#FFFFFF' : '#DC2626' }
                ]}>
                  Vencidas ({tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada').length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Filtro: Alta Prioridad */}
            {tasks.filter(t => t.priority === 'alta').length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ ...filters, priority: filters.priority === 'alta' ? '' : 'alta' });
                  hapticLight();
                }}
                style={[
                  styles.quickFilterChip,
                  { 
                    backgroundColor: filters.priority === 'alta' ? '#EF4444' : theme.cardBackground,
                    borderColor: filters.priority === 'alta' ? '#EF4444' : theme.border
                  }
                ]}
              >
                <Ionicons 
                  name="flash" 
                  size={14} 
                  color={filters.priority === 'alta' ? '#FFFFFF' : '#EF4444'} 
                />
                <Text style={[
                  styles.quickFilterText, 
                  { color: filters.priority === 'alta' ? '#FFFFFF' : '#EF4444' }
                ]}>
                  Urgente ({tasks.filter(t => t.priority === 'alta').length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Filtro: Mis tareas */}
            {currentUser && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ 
                    ...filters, 
                    responsible: filters.responsible === currentUser.email ? '' : currentUser.email 
                  });
                  hapticLight();
                }}
                style={[
                  styles.quickFilterChip,
                  { 
                    backgroundColor: filters.responsible === currentUser.email ? theme.primary : theme.cardBackground,
                    borderColor: filters.responsible === currentUser.email ? theme.primary : theme.border
                  }
                ]}
              >
                <Ionicons 
                  name="person" 
                  size={14} 
                  color={filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary} 
                />
                <Text style={[
                  styles.quickFilterText, 
                  { color: filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary }
                ]}>
                  Mis tareas
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Botón limpiar filtros si hay alguno activo */}
            {(filters.overdue || filters.priority || filters.responsible) && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
                  hapticLight();
                }}
                style={[
                  styles.clearFilterButton,
                  { backgroundColor: theme.border }
                ]}
              >
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                <Text style={[styles.clearFilterText, { color: theme.textSecondary }]}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
        
        {/* FilterBar solo para búsqueda avanzada - oculto por defecto */}
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
        <Animated.View style={fabAnimatedStyle}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }]}
            onPress={() => {
              // Solo admin y jefe pueden crear tareas
              if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'jefe')) {
                setToastMessage('Solo administradores y jefes pueden crear tareas');
                setToastType('warning');
                setToastVisible(true);
                return;
              }
              hapticMedium();
              navigation.navigate('TaskDetail', { task: null });
            }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

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
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.3
  },
  heading: { 
    fontSize: 40, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)'
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)'
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
    padding: 12
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
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  columnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  columnTitle: { 
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  columnCount: { 
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  columnBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  columnCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'relative'
  },
  overdueColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  priorityColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center'
  },
  emptyColumnState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: 12
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  emptyStateDescription: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7
  },
  emptyColumnText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6
  },
  statusAgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  statusAgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  unifiedFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  columnCountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  card: { 
    margin: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.18 : 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  cardDragging: {
    opacity: 0.95,
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 2,
    borderColor: theme.primary
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 5,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  overdueChipText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  cardTitle: { 
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 16,
    lineHeight: 24,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  cardInfoGrid: {
    gap: 8,
    marginBottom: 14
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
  },
  cardInfoText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2
  },
  dragIndicator: {
    position: 'absolute',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2.5,
    borderColor: theme.primary
  },
  dragIndicatorText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#9F2241',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  statsContainer: {
    padding: 12,
  },
  statItem: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
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
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statPercentage: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
