import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, RefreshControl, Animated, Platform, StatusBar } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getSwipeable } from '../utils/platformComponents';
import TaskItem from '../components/TaskItem';
import SearchBar from '../components/SearchBar';
import AdvancedFilters from '../components/AdvancedFilters';
import ThemeToggle from '../components/ThemeToggle';
import EmptyState from '../components/EmptyState';
import ConnectionIndicator from '../components/ConnectionIndicator';
import ConfettiCelebration from '../components/ConfettiCelebration';
import Toast from '../components/Toast';
import AnimatedBadge from '../components/AnimatedBadge';
import ShimmerEffect from '../components/ShimmerEffect';
import SkeletonLoader from '../components/SkeletonLoader';
import LoadingIndicator from '../components/LoadingIndicator';
import Button from '../components/Button';
import Card from '../components/Card';
import SyncIndicator from '../components/SyncIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTasks, deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { getCurrentSession, refreshSession } from '../services/authFirestore';

const Swipeable = getSwipeable();

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
    tags: [],
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

  // Suscribirse a cambios en tiempo real de Firebase (optimizado)
  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;
    
    console.log('🔄 HomeScreen: Iniciando suscripción...');
    
    // Función async para manejar la suscripción
    const setupSubscription = async () => {
      try {
        unsubscribe = await subscribeToTasks((updatedTasks) => {
          if (!mounted) return;
          
          console.log('📦 Tareas recibidas:', updatedTasks.length);
          setTasks(updatedTasks);
          setIsLoading(false);
          
          // Animar entrada de la lista solo la primera vez
          if (fadeAnim._value !== 1) {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();
          }
        });
      } catch (error) {
        console.error('❌ Error en suscripción:', error);
        setIsLoading(false);
      }
    };
    
    setupSubscription();

    // Limpiar suscripción al desmontar
    return () => {
      mounted = false;
      console.log('🧹 HomeScreen: Limpiando suscripción');
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Solo ejecutar una vez al montar

  // Navegar a pantalla para crear nueva tarea (solo admin y jefe)
  const goToCreate = useCallback(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe')) {
      navigation.navigate('TaskDetail');
    } else {
      Alert.alert('Sin permisos', 'Solo administradores y jefes pueden crear tareas');
    }
  }, [currentUser, navigation]);

  const openDetail = useCallback((task) => {
    // Solo admin y jefe pueden editar tareas
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe')) {
      navigation.navigate('TaskDetail', { task });
    } else {
      setToastMessage('Solo administradores y jefes pueden editar tareas');
      setToastType('info');
      setToastVisible(true);
    }
  }, [currentUser, navigation]);

  const openChat = useCallback((task) => {
    navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  }, [navigation]);

  const deleteTask = useCallback(async (taskId, skipConfirm = false) => {
    // Solo admin puede eliminar tareas
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('Solo los administradores pueden eliminar tareas');
      setToastType('warning');
      setToastVisible(true);
      return;
    }

    // Guardar tarea antes de eliminar para undo
    const taskToDelete = tasks.find(t => t.id === taskId);

    const performDelete = async () => {
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
    };

    if (skipConfirm) {
      performDelete();
    } else {
      Alert.alert(
        'Eliminar tarea',
        '¿Estás seguro de que quieres eliminar esta tarea?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
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

  const changeTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      hapticMedium();
      await updateTask(taskId, { status: newStatus });
      
      const statusLabels = {
        'pendiente': 'Pendiente',
        'en_proceso': 'En Proceso', 
        'en_revision': 'En Revisión',
        'cerrada': 'Completada'
      };
      
      setToastMessage(`Estado cambiado a: ${statusLabels[newStatus]}`);
      setToastType('success');
      setToastVisible(true);
      
      // Confetti si se completa
      if (newStatus === 'cerrada') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        hapticHeavy();
      }
    } catch (error) {
      setToastMessage(`Error: ${error.message}`);
      setToastType('error');
      setToastVisible(true);
    }
  }, []);

  const duplicateTask = useCallback((task) => {
    hapticMedium();
    navigation.navigate('TaskDetail', { 
      task: {
        title: `${task.title} (copia)`,
        description: task.description || '',
        status: 'pendiente',
        priority: task.priority || 'media',
        area: task.area || '',
        department: task.department || '',
        assignedTo: task.assignedTo || '',
        dueAt: task.dueAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        id: `temp-${Date.now()}`
      }
    });
    setToastMessage('✏️ Editando copia de la tarea');
    setToastType('info');
    setToastVisible(true);
  }, [navigation]);

  const shareTask = useCallback(async (task) => {
    hapticLight();
    const shareText = `📋 Tarea: ${task.title}\n📅 Vence: ${new Date(task.dueAt).toLocaleDateString()}\n👤 Asignado: ${task.assignedTo || 'Sin asignar'}\n🏢 Área: ${task.area || 'Sin área'}\n⚡ Prioridad: ${task.priority || 'media'}\n📊 Estado: ${task.status || 'pendiente'}`;
    
    try {
      await Clipboard.setStringAsync(shareText);
      setToastMessage('✅ Tarea copiada al portapapeles');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      setToastMessage('❌ Error al copiar');
      setToastType('error');
      setToastVisible(true);
    }
  }, []);

  // Renderizar acción de deslizar para eliminar
  const renderRightActions = useCallback((progress, dragX, task) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          transform: [{ translateX: trans }],
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => deleteTask(task.id, true)}
          style={{
            backgroundColor: '#FF3B30',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Eliminar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [deleteTask]);

  // Calcular tareas urgentes (vencen en menos de 48 horas)
  const urgentTasks = useMemo(() => {
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return tasks.filter(task => {
      if (task.status === 'cerrada') return false;
      const dueDate = task.dueAt;
      const timeUntilDue = dueDate - now;
      return timeUntilDue > 0 && timeUntilDue <= fortyEightHours;
    });
  }, [tasks]);

  // Aplicar filtros con memoización
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search text filter (title, description, assignedTo, tags)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(search);
        const matchDescription = task.description?.toLowerCase().includes(search);
        const matchAssigned = task.assignedTo?.toLowerCase().includes(search);
        const matchTags = task.tags?.some(tag => tag.toLowerCase().includes(search));
        if (!matchTitle && !matchDescription && !matchAssigned && !matchTags) return false;
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
      
      // Filter by tags (multi-select)
      if (advancedFilters.tags && advancedFilters.tags.length > 0) {
        const hasMatchingTag = advancedFilters.tags.some(filterTag => task.tags?.includes(filterTag));
        if (!hasMatchingTag) return false;
      }
      
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
        <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
          <View style={styles.header}>
            <View>
              <ShimmerEffect width={150} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
              <ShimmerEffect width={200} height={32} borderRadius={10} />
            </View>
            <ShimmerEffect width={56} height={56} borderRadius={28} />
          </View>
        </View>
        
        <View style={{ padding: 20, gap: 16 }}>
          <SkeletonLoader type="card" count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ConnectionIndicator />
      
      <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingContainer}>
              <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Hola!</Text>
            </View>
            <Text style={styles.heading}>Mis Tareas</Text>
          </View>
          <View style={styles.headerActions}>
            {urgentTasks.length > 0 && (
              <View style={styles.urgentBadge}>
                <Ionicons name="alarm" size={16} color="#FFF" />
                <Text style={styles.urgentBadgeText}>{urgentTasks.length}</Text>
              </View>
            )}
            <AdvancedFilters
              filters={advancedFilters}
              onApplyFilters={handleApplyFilters}
              areas={uniqueAreas}
              users={uniqueUsers}
              tasks={tasks}
            />
            <ThemeToggle size={22} />
          </View>
        </View>
      </View>

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
            {/* Alerta de tareas urgentes */}
            {urgentTasks.length > 0 && (
              <TouchableOpacity 
                style={[styles.urgentAlert, { backgroundColor: theme.error + '15', borderColor: theme.error }]}
                onPress={() => {
                  hapticMedium();
                  // Scroll a la primera tarea urgente
                  const firstUrgentIndex = filteredTasks.findIndex(t => urgentTasks.some(ut => ut.id === t.id));
                  if (firstUrgentIndex >= 0) {
                    flatListRef.current?.scrollToIndex({ index: firstUrgentIndex, animated: true });
                  }
                }}
              >
                <View style={styles.urgentAlertContent}>
                  <Ionicons name="warning" size={24} color={theme.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.urgentAlertTitle, { color: theme.error }]}>
                      {urgentTasks.length} {urgentTasks.length === 1 ? 'tarea vence' : 'tareas vencen'} pronto
                    </Text>
                    <Text style={[styles.urgentAlertText, { color: theme.textSecondary }]}>
                      Tareas que vencen en las próximas 48 horas
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.error} />
                </View>
              </TouchableOpacity>
            )}
            
            {/* Fila 1: Estadísticas principales */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoCard, styles.bentoLarge]}>
                <View style={[styles.bentoGradient, { backgroundColor: theme.primary }]}>
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
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Todas las Tareas</Text>
          </View>
          )
        }
        renderItem={({ item, index }) => {
          const content = (
            <TaskItem 
              task={item}
              index={index}
              onPress={() => openDetail(item)}
              onDelete={() => deleteTask(item.id)}
              onToggleComplete={() => toggleComplete(item)}
              onDuplicate={() => duplicateTask(item)}
              onShare={() => shareTask(item)}
              onChangeStatus={(newStatus) => changeTaskStatus(item.id, newStatus)}
              currentUserRole={currentUser?.role || 'operativo'}
            />
          );

          // En web, no usar swipe
          if (Platform.OS === 'web' || !currentUser || currentUser.role !== 'admin') {
            return content;
          }

          // En móvil con admin, usar swipe
          return (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
              friction={2}
              overshootRight={false}
            >
              {content}
            </Swipeable>
          );
        }}
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
      
      {/* Sync Indicator */}
      <SyncIndicator />
      
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
      
      {/* Botón para crear tarea */}
      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe') && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('TaskDetail')}
          activeOpacity={0.8}
        >
          <View style={[styles.fabGradient, { backgroundColor: '#9F2241' }]}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}
      
      {/* Loading Indicator */}
      {savingProgress !== null && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12
          }}>
            <LoadingIndicator type="spinner" color="#9F2241" size={12} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {savingProgress === 100 ? 'Completado!' : 'Guardando...'}
            </Text>
          </View>
        </View>
      )}
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
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginRight: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  urgentBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  urgentAlert: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgentAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  urgentAlertText: {
    fontSize: 13,
    fontWeight: '500',
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
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
