// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Implementa Drag & Drop para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import FloatingActionButton from '../components/FloatingActionButton';
import { subscribeToTasks, updateTask } from '../services/tasks';
import { hapticMedium, hapticHeavy } from '../utils/haptics';
import Toast from 'react-native-toast-message';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#FF9800', icon: 'hourglass-outline' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196F3', icon: 'play-circle-outline' },
  { key: 'en_revision', label: 'En revisión', color: '#9C27B0', icon: 'eye-outline' },
  { key: 'cerrada', label: 'Cerrada', color: '#4CAF50', icon: 'checkmark-circle-outline' }
];

export default function KanbanScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  const [refreshing, setRefreshing] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
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
    hapticMedium(); // Haptic on status change
    await updateTask(taskId, { status: newStatus });
    Toast.show({
      type: 'success',
      text1: 'Estado actualizado',
      text2: 'La tarea se movió correctamente',
      position: 'top',
      visibilityTime: 2000,
    });
    // La actualización del estado se hace automáticamente por el listener
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
    const isOverdue = item.dueAt && new Date(item.dueAt.toDate()) < new Date() && item.status !== 'cerrada';
    
    return (
      <SpringCard
        onPress={() => openDetail(item)}
        style={[
          styles.card,
          draggingTask?.id === item.id && styles.cardDragging
        ]}
      >
        <View style={styles.cardPriorityIndicator}>
          <View style={[
            styles.priorityDot,
            item.priority === 'alta' && styles.priorityDotHigh,
            item.priority === 'media' && styles.priorityDotMedium,
            item.priority === 'baja' && styles.priorityDotLow
          ]} />
          {isOverdue && (
            <PulsingDot size={8} color="#FF3B30" style={{ marginLeft: 6 }} />
          )}
        </View>
            
            {/* Icono de drag */}
            <View style={styles.dragHandle}>
              <Ionicons name="reorder-two" size={20} color="#C7C7CC" />
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardMetaRow}>
              <Ionicons name="person-outline" size={14} color="#8E8E93" />
              <Text style={styles.cardMeta} numberOfLines={1} ellipsizeMode="tail">{item.assignedTo || 'Sin asignar'}</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
              <Text style={styles.cardDue} numberOfLines={1}>{new Date(item.dueAt).toLocaleDateString()}</Text>
            </View>

            {/* Botones rápidos para cambiar estado (respaldo) */}
            <View style={styles.actionsRow}>
              {STATUSES.filter(s => s.key !== status.key).slice(0, 2).map(s => (
                <RippleButton
                  key={s.key}
                  onPress={() => changeStatus(item.id, s.key)}
                  style={[styles.miniBtn, { borderColor: s.color }]}
                  rippleColor={s.color}
                  size="small"
                >
                  <Ionicons name={s.icon} size={14} color={s.color} />
                </RippleButton>
              ))}
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
      <View key={status.key} style={styles.column}>
        <View style={[styles.columnHeader, { backgroundColor: status.color + '15' }]}>
          <View style={styles.columnTitleContainer}>
            <Ionicons name={status.icon} size={20} color={status.color} style={{ marginRight: 8 }} />
            <Text style={[styles.columnTitle, { color: status.color }]}>{status.label}</Text>
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.headerGradient}>
          <View style={styles.header}>
            <View>
              <View style={styles.greetingContainer}>
                <Ionicons name="grid" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Vista de tablero</Text>
              </View>
              <Text style={styles.heading}>Kanban</Text>
            </View>
          </View>
        </LinearGradient>
        <FilterBar onFilterChange={setFilters} />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.board}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B0000"
              colors={['#8B0000']}
            />
          }
        >
          {STATUSES.map(renderColumn)}
        </ScrollView>
        
        {/* Indicador visual de drag en proceso */}
        {draggingTask && (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={20} color="#8B0000" />
            <Text style={styles.dragIndicatorText}>
              Arrastra a una columna para cambiar estado
            </Text>
          </View>
        )}

        {/* FloatingActionButton con acciones rápidas */}
        <FloatingActionButton
          icon="add"
          color="#8B0000"
          actions={[
            {
              icon: 'add-circle',
              label: 'Nueva Tarea',
              onPress: () => navigation.navigate('TaskDetail')
            },
            {
              icon: 'stats-chart',
              label: 'Estadísticas',
              onPress: () => setShowStats(true)
            },
            {
              icon: 'filter',
              label: 'Filtros',
              onPress: () => {} // FilterBar ya está visible
            }
          ]}
        />

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
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 28
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.3
  },
  heading: { 
    fontSize: 42, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5
  },
  board: { paddingHorizontal: 16, paddingVertical: 20 },
  column: { 
    width: 300, 
    marginHorizontal: 8, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  columnHeader: { 
    padding: 18, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  columnTitle: { 
    fontWeight: '800', 
    fontSize: 17,
    letterSpacing: 0.2,
    flex: 1
  },
  columnCount: { 
    fontSize: 14, 
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 32
  },
  columnCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  },
  card: { 
    margin: 10, 
    padding: 12, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  cardDragging: {
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderColor: '#8B0000',
    borderWidth: 2,
    backgroundColor: '#FFFBF5'
  },
  dragHandle: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 4
  },
  cardPriorityIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C7C7CC'
  },
  priorityDotHigh: {
    backgroundColor: '#8B0000'
  },
  priorityDotMedium: {
    backgroundColor: '#DAA520'
  },
  priorityDotLow: {
    backgroundColor: '#4CAF50'
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    marginBottom: 10, 
    color: '#1A1A1A',
    letterSpacing: -0.2,
    paddingRight: 28,
    paddingLeft: 30,
    lineHeight: 22,
    flexShrink: 1
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'nowrap'
  },
  cardMeta: { 
    fontSize: 14, 
    color: '#1A1A1A', 
    fontWeight: '600',
    flex: 1,
    flexShrink: 1
  },
  cardDue: { 
    fontSize: 13, 
    color: '#6E6E73',
    fontWeight: '600'
  },
  actionsRow: { 
    flexDirection: 'row', 
    marginTop: 12, 
    gap: 8
  },
  miniBtn: { 
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dragIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#FFFAF0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#8B0000'
  },
  dragIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B0000',
    letterSpacing: 0.3
  },
  statsContainer: {
    padding: 16,
  },
  statItem: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
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
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statPercentage: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
