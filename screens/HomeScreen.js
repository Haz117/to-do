// screens/HomeScreen.js
// Lista simple de tareas, añade tareas de ejemplo y persiste con AsyncStorage.
// Usa navigation para ir a detalle y chat.
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, Alert, TouchableOpacity, RefreshControl, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import SearchBar from '../components/SearchBar';
import AdvancedFilters from '../components/AdvancedFilters';
import ThemeToggle from '../components/ThemeToggle';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import ConnectionIndicator from '../components/ConnectionIndicator';
import ConfettiCelebration from '../components/ConfettiCelebration';
import Toast from '../components/Toast';
import ScrollToTop from '../components/ScrollToTop';
import RefreshHeader from '../components/RefreshHeader';
import PressableButton from '../components/PressableButton';
import AnimatedBadge from '../components/AnimatedBadge';
import ProgressLoader from '../components/ProgressLoader';
import SkeletonLoader from '../components/SkeletonLoader';
import FloatingActionButton from '../components/FloatingActionButton';
import SpringCard from '../components/SpringCard';
import CircularProgress from '../components/CircularProgress';
import RippleButton from '../components/RippleButton';
import WaveLoader from '../components/WaveLoader';
import PulsingDot from '../components/PulsingDot';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTasks, deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import * as Notifications from 'expo-notifications';
import { getCurrentSession, refreshSession } from '../services/authFirestore';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [searchText, setSearchText] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    areas: [],
    responsible: [],
    priorities: [],
    statuses: [],
    overdue: false,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastAction, setToastAction] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [savingProgress, setSavingProgress] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);


  // Cargar usuario actual
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const result = await getCurrentSession();
    if (result.success) {
      console.log('👤 Usuario actual:', result.session);
      setCurrentUser(result.session);
      
      // Refrescar sesión desde Firestore para asegurar datos actualizados
      const refreshResult = await refreshSession();
      if (refreshResult.success) {
        console.log('🔄 Sesión refrescada correctamente');
        setCurrentUser(refreshResult.session);
      }
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium(); // Haptic feedback on pull-to-refresh
    // Las tareas se actualizan automáticamente por el listener
    // Solo simulamos el tiempo de refresco
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Suscribirse a cambios en tiempo real de Firebase
  useEffect(() => {
    let unsubscribe;
    
    subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
      setIsLoading(false);
      
      // Animar entrada de la lista
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    // Limpiar suscripción al desmontar
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Navegar a pantalla para crear nueva tarea (solo admin y jefe)
  const goToCreate = useCallback(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe')) {
      navigation.navigate('TaskDetail');
    } else {
      Alert.alert('Sin permisos', 'Solo administradores y jefes pueden crear tareas');
    }
  }, [currentUser, navigation]);

  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);

  const openChat = useCallback((task) => {
    navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  }, [navigation]);

  const deleteTask = useCallback(async (taskId) => {
    // Solo admin puede eliminar tareas
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('Solo los administradores pueden eliminar tareas');
      setToastType('warning');
      setToastVisible(true);
      return;
    }

    // Guardar tarea antes de eliminar para undo
    const taskToDelete = tasks.find(t => t.id === taskId);

    Alert.alert(
      'Eliminar tarea',
      '¿Estás seguro de que quieres eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticHeavy();
              await deleteTaskFirebase(taskId);
              setToastMessage('Tarea eliminada');
              setToastType('success');
              setToastAction({
                label: 'Deshacer',
                onPress: async () => {
                  // Recrear la tarea
                  if (taskToDelete) {
                    await createTask(taskToDelete);
                    setToastMessage('Tarea restaurada');
                    setToastType('info');
                    setToastVisible(true);
                  }
                }
              });
              setToastVisible(true);
            } catch (error) {
              setToastMessage(`Error al eliminar: ${error.message}`);
              setToastType('error');
              setToastVisible(true);
            }
          }
        }
      ]
    );
  }, [currentUser, tasks]);

  const toggleComplete = useCallback(async (task) => {
    try {
      const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
      hapticMedium(); // Haptic feedback on toggle
      await updateTask(task.id, { status: newStatus });
      
      // Show toast with feedback
      if (newStatus === 'cerrada') {
        // Confetti para tareas urgentes completadas
        if (task.priority === 'alta') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          hapticHeavy(); // Extra haptic for urgent tasks
        }
        setToastMessage('Tarea marcada como completada');
        setToastType('success');
        setToastVisible(true);
      } else {
        setToastMessage('Tarea reabierta');
        setToastType('info');
        setToastVisible(true);
      }
    } catch (error) {
      setToastMessage(`Error al actualizar: ${error.message}`);
      setToastType('error');
      setToastVisible(true);
    }
    // La actualización del estado se hace automáticamente por el listener
  }, []);

  const duplicateTask = useCallback((task) => {
    hapticMedium();
    navigation.navigate('TaskDetail', { 
      task: {
        ...task,
        id: undefined,
        title: `${task.title} (copia)`,
        status: 'pendiente',
        createdAt: undefined
      }
    });
    setToastMessage('Editando copia de la tarea');
    setToastType('info');
    setToastVisible(true);
  }, [navigation]);

  const shareTask = useCallback((task) => {
    hapticLight();
    const shareText = `Tarea: ${task.title}\nVence: ${new Date(task.dueAt).toLocaleDateString()}\nAsignado: ${task.assignedTo || 'Sin asignar'}\nÁrea: ${task.area || 'Sin área'}`;
    
    setToastMessage('Funcionalidad de compartir próximamente');
    setToastType('info');
    setToastAction({
      label: 'Copiar',
      onPress: () => {
        // TODO: Implementar copiar al portapapeles
        console.log('Compartir:', shareText);
      }
    });
    setToastVisible(true);
  }, []);

  // Aplicar filtros con memoización
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search text filter (title, description, assignedTo)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(search);
        const matchDescription = task.description?.toLowerCase().includes(search);
        const matchAssigned = task.assignedTo?.toLowerCase().includes(search);
        if (!matchTitle && !matchDescription && !matchAssigned) return false;
      }
      
      // Advanced filters
      // Filter by areas (multi-select)
      if (advancedFilters.areas.length > 0 && !advancedFilters.areas.includes(task.area)) return false;
      
      // Filter by responsible (multi-select)
      if (advancedFilters.responsible.length > 0 && !advancedFilters.responsible.includes(task.assignedTo)) return false;
      
      // Filter by priorities (multi-select)
      if (advancedFilters.priorities.length > 0 && !advancedFilters.priorities.includes(task.priority)) return false;
      
      // Filter by statuses (multi-select)
      if (advancedFilters.statuses.length > 0 && !advancedFilters.statuses.includes(task.status)) return false;
      
      // Filter by overdue
      if (advancedFilters.overdue && task.dueAt >= Date.now()) return false;
      
      return true;
    });
  }, [tasks, searchText, advancedFilters]);

  // Estadísticas Bento con memoización
  const statistics = useMemo(() => {
    const todayTasks = filteredTasks.filter(t => {
      const today = new Date().setHours(0,0,0,0);
      const dueDate = t.dueAt ? new Date(t.dueAt).setHours(0,0,0,0) : null;
      return dueDate === today;
    });

    const highPriorityTasks = filteredTasks.filter(t => t.priority === 'alta' && t.status !== 'cerrada');
    const overdueTasks = filteredTasks.filter(t => t.dueAt && t.dueAt < Date.now() && t.status !== 'cerrada');
    const myTasks = filteredTasks.filter(t => t.assignedTo && t.status !== 'cerrada');
    
    const tasksByArea = filteredTasks.reduce((acc, task) => {
      const area = task.area || 'Sin área';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});

    const topAreas = Object.entries(tasksByArea)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
      
    return {
      todayTasks,
      highPriorityTasks,
      overdueTasks,
      myTasks,
      topAreas
    };
  }, [filteredTasks]);

  const { todayTasks, highPriorityTasks, overdueTasks, myTasks, topAreas } = statistics;

  // Extract unique areas and users for filter options
  const uniqueAreas = useMemo(() => {
    const areas = new Set(tasks.map(t => t.area).filter(Boolean));
    return Array.from(areas).sort();
  }, [tasks]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(tasks.map(t => t.assignedTo).filter(Boolean));
    return Array.from(users).sort();
  }, [tasks]);

  // Callbacks
  const handleSearch = useCallback((text) => {
    setSearchText(text);
  }, []);

  const handleApplyFilters = useCallback((newFilters) => {
    setAdvancedFilters(newFilters);
  }, []);

  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  }, []);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Create theme-aware styles
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Show shimmer loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient colors={theme.gradientHeader} style={styles.headerGradient}>
          <View style={styles.header}>
            <View>
              <ShimmerEffect width={150} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
              <ShimmerEffect width={200} height={32} borderRadius={10} />
            </View>
            <ShimmerEffect width={56} height={56} borderRadius={28} />
          </View>
        </LinearGradient>
        
        <View style={{ padding: 20, gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <WaveLoader key={i} width="100%" height={100} borderRadius={16} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ConnectionIndicator />
      
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingContainer}>
              <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Hola!</Text>
            </View>
            <Text style={styles.heading}>Mis Tareas</Text>
          </View>
          <View style={styles.headerActions}>
            <AdvancedFilters
              filters={advancedFilters}
              onApplyFilters={handleApplyFilters}
              areas={uniqueAreas}
              users={uniqueUsers}
            />
            <ThemeToggle size={22} />
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} placeholder="Buscar tareas..." />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={flatListRef}
          data={filteredTasks}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          initialNumToRender={8}
          updateCellsBatchingPeriod={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
              title={refreshing ? 'Actualizando...' : ''}
              titleColor="#007AFF"
            />
          }
          contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isLoading ? (
            <SkeletonLoader type="bento" />
          ) : (
          <View style={styles.bentoGrid}>
            {/* Fila 1: Estadísticas principales */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoCard, styles.bentoLarge]}>
                <LinearGradient colors={theme.gradientSecondary} style={styles.bentoGradient}>
                  <View style={styles.bentoContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.bentoTitleLarge}>Tareas Activas</Text>
                      <AnimatedBadge 
                        count={filteredTasks.length} 
                        color="rgba(255, 255, 255, 0.3)"
                        textColor="#FFFFFF"
                        size={28}
                        showZero
                      />
                    </View>
                    <Text style={styles.bentoNumberLarge}>{filteredTasks.length}</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statItemContainer}>
                        <Ionicons name="flame" size={14} color="#FFFFFF" />
                        <Text style={styles.statItem}>{highPriorityTasks.length} urgentes</Text>
                      </View>
                      <View style={styles.statItemContainer}>
                        <Ionicons name="time" size={14} color="#FFFFFF" />
                        <Text style={styles.statItem}>{overdueTasks.length} vencidas</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Todas las Tareas</Text>
          </View>
          )
        }
        renderItem={({ item, index }) => (
          <TaskItem 
            task={item}
            index={index}
            onPress={() => openDetail(item)}
            onDelete={() => deleteTask(item.id)}
            onToggleComplete={() => toggleComplete(item)}
            onDuplicate={() => duplicateTask(item)}
            onShare={() => shareTask(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="checkbox-outline"
            title="Sin tareas"
            message={searchText || advancedFilters.areas.length > 0 || advancedFilters.responsible.length > 0 || advancedFilters.priorities.length > 0 || advancedFilters.statuses.length > 0 || advancedFilters.overdue
              ? "No hay tareas que coincidan con los filtros aplicados"
              : "No tienes tareas pendientes. ¡Toca el botón + para crear una nueva!"
            }
          />
        }
      />
      </Animated.View>
      
      {/* Confetti celebration */}
      <ConfettiCelebration trigger={showConfetti} />
      
      {/* Toast mejorado */}
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        action={toastAction}
        onHide={() => {
          setToastVisible(false);
          setToastAction(null);
        }}
        swipeToDismiss
      />
      
      {/* FAB con acciones rápidas */}
      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe') && (
        <FloatingActionButton
          mainIcon="add"
          mainColor={['#FF6B6B', '#FF8E53']}
          bottom={120}
          actions={[
            {
              icon: 'document-text',
              label: 'Nueva Tarea',
              color: ['#6366F1', '#8B5CF6'],
              onPress: () => navigation.navigate('TaskDetail'),
            },
            {
              icon: 'calendar',
              label: 'Ver Calendario',
              color: ['#10B981', '#34D399'],
              onPress: () => {}, // Se maneja en tabs
            },
            {
              icon: 'stats-chart',
              label: 'Reportes',
              color: ['#F59E0B', '#FBBF24'],
              onPress: () => {}, // Se maneja en tabs
            },
          ]}
        />
      )}
      
      {/* ScrollToTop button */}
      <ScrollToTop 
        visible={showScrollTop}
        onPress={scrollToTop}
      />
      
      {/* Progress Loader */}
      <ProgressLoader 
        visible={savingProgress !== null}
        progress={savingProgress}
        message={savingProgress === 100 ? 'Completado!' : 'Guardando...'}
      />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12
  },
  addButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  listContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
    letterSpacing: -0.8
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500'
  },
  // Bento Grid Styles
  bentoGrid: {
    gap: 14,
    marginBottom: 32
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14
  },
  bentoCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  bentoLarge: {
    flex: 2,
    minHeight: 180
  },
  bentoMedium: {
    flex: 1,
    minHeight: 180
  },
  bentoSmall: {
    flex: 1,
    minHeight: 140
  },
  bentoWide: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 2.5,
    borderColor: theme.border,
    padding: 20,
    minHeight: 110
  },
  bentoGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start'
  },
  bentoGradientSmall: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  bentoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoIconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoContent: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  bentoTitleLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoTitleSmall: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoNumberLarge: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoNumberMedium: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoNumberSmall: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  bentoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: '100%',
    flexShrink: 1
  },
  areaName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.3,
    flex: 1,
    flexShrink: 1
  },
  areaBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center'
  },
  areaCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.8,
    marginBottom: 16,
    marginTop: 12
  }
});
