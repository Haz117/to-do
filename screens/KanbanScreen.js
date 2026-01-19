// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Implementa Drag & Drop para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada - Compatible con web
import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const GestureHandlerRootView = getGestureHandlerRootView();
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { subscribeToTasks, updateTask } from '../services/tasks';
import { hapticMedium, hapticHeavy, hapticLight } from '../utils/haptics';
import Toast from '../components/Toast';
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
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  const [refreshing, setRefreshing] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  // Animaciones
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const columnsSlide = useRef(new Animated.Value(100)).current;

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
    // Manejar diferentes formatos de fecha de forma segura
    let isOverdue = false;
    if (item.dueAt && item.status !== 'cerrada') {
      try {
        const dueDate = item.dueAt.toDate ? item.dueAt.toDate() : new Date(item.dueAt);
        isOverdue = dueDate < new Date();
      } catch (error) {
        console.log('Error parseando fecha:', error);
      }
    }
    
    return (
      <SpringCard
        onPress={() => {
          hapticLight();
          openDetail(item);
        }}
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
          draggingTask?.id === item.id && styles.cardDragging
        ]}
      >
        {/* Header con badges */}
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

        {/* Título */}
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={3}>{item.title}</Text>
        
        {/* Meta información con iconos mejorados */}
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

  const renderColumn = (status) => {
    const byStatus = tasks.filter(t => (t.status || 'pendiente') === status.key);
    const filtered = applyFilters(byStatus);
    const completionRate = byStatus.length > 0 ? (filtered.length / byStatus.length) * 100 : 0;

    return (
      <View key={status.key} style={[styles.column, { backgroundColor: theme.surface, width: columnWidth }]}>
        <View style={[styles.columnHeader, { backgroundColor: status.color + '20' }]}>
          <View style={styles.columnTitleContainer}>
            <View style={[styles.columnIconCircle, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
          </View>
          <View style={[styles.columnCount, { backgroundColor: status.color }]}>
            <Text style={styles.columnCountText}>{filtered.length}</Text>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DraggableCard item={item} status={status} />}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      </View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Calcular ancho de columna responsive
  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const columnWidth = isWeb 
    ? Math.max(350, (screenWidth - 80) / 4) // En web: 4 columnas o mínimo 350px
    : Math.max(300, screenWidth * 0.85); // En móvil: 85% del ancho o mínimo 300px

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
            <TouchableOpacity 
              onPress={() => setShowStats(!showStats)}
              style={styles.statsButton}
            >
              <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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

const createStyles = (theme, isDark) => StyleSheet.create({
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
  statsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  board: { 
    paddingHorizontal: 16, 
    paddingVertical: 20,
    flexGrow: 1
  },
  column: { 
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
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.2  { width: 0, height: 3 },
    shadowOpacity: 0.12,
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
    fontWeight: '700',,
    color: theme.text
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
  cardInfoT,
    color: theme.textSecondaryext: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  dragIndicator: {
    position: 'absoluisDark ? theme.surface : '#FFFAF0',
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
    color: theme.primary
  dragIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F2241',
    letterSpacing: 0.3
  },
  statsContainer: {
    padding: 16,
  },
  statItem: {theme.surface,
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
    color: theme.text',
    marginLeft: 8,
    color: '#1A1A1A',
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
    fontSiztheme.text,
  },
  statPercentage: {
    fontSize: 14,
    color: theme.textSecondary
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
