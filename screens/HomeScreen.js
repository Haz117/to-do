import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Animated, Platform, StatusBar, Modal, ScrollView, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import OverdueAlert from '../components/OverdueAlert';
import LoadingIndicator from '../components/LoadingIndicator';
import Button from '../components/Button';
import Card from '../components/Card';
import SyncIndicator from '../components/SyncIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { subscribeToTasks, deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { getCurrentSession, refreshSession } from '../services/authFirestore';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';

const Swipeable = getSwipeable();

// Debug and permission testing removed for production

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
  
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks, isLoading: tasksLoading, markAsDeleting, unmarkAsDeleting } = useTasks();
  const [isLoading, setIsLoading] = useState(tasksLoading);
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastAction, setToastAction] = useState(null);

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchSlide = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(30)).current;

  // Stagger animations on mount
  useEffect(() => {
    const staggerDelay = 100;
    
    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Search bar animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(searchSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay);

    // List animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(listSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay * 2);
  }, []);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [savingProgress, setSavingProgress] = useState(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const deletingTasksRef = useRef(new Set());


  // Cargar usuario actual
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session);
      
      // Refrescar sesión desde Firestore para asegurar datos actualizados
      const refreshResult = await refreshSession();
      if (refreshResult.success) {
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
    // Actualizar isLoading desde el contexto
    setIsLoading(tasksLoading);

    // Animar entrada de la lista cuando las tareas se cargan
    if (!tasksLoading && tasks.length > 0 && fadeAnim._value !== 1) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    // Detectar tareas urgentes y mostrar modal
    if (!tasksLoading && tasks.length > 0 && fadeAnim._value === 0) {
      setTimeout(() => {
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;
        const urgent = tasks.filter(task => {
          if (task.status === 'cerrada') return false;
          const due = new Date(task.dueAt).getTime();
          const timeLeft = due - now;
          return timeLeft > 0 && timeLeft < sixHours;
        });
        
        if (urgent.length > 0) {
          setShowUrgentModal(true);
        }
      }, 1200);
    }
  }, [tasks, tasksLoading]);

  // Navegar a pantalla para crear nueva tarea (solo admin y jefe)
  const goToCreate = useCallback(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe')) {
      navigation.navigate('TaskDetail');
    } else {
      Alert.alert('Sin permisos', 'Solo administradores y jefes pueden crear tareas');
    }
  }, [currentUser, navigation]);

  const openDetail = useCallback((task) => {
    // Todos pueden ver los detalles de las tareas
    // Admin/Jefe pueden editar, operativos ven solo el modal
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);

  const openChat = useCallback((task) => {
    navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  }, [navigation]);

  const deleteTask = useCallback((taskId) => {
    // 🛡️ GUARD: Prevenir eliminación múltiple del mismo task
    if (deletingTasksRef.current.has(taskId)) {
      return;
    }
    
    // Solo admin puede eliminar tareas
    if (!currentUser || currentUser.role !== 'admin') {
      const msg = `❌ Solo admins. Tu rol: ${currentUser?.role || 'desconocido'}`;
      setToastMessage(msg);
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Guardar tarea antes de eliminar para undo
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      setToastMessage('❌ Tarea no encontrada');
      setToastType('error');
      setToastVisible(true);
      return;
    }
    
    // ✅ MARCAR COMO EN PROCESO (local + context global)
    deletingTasksRef.current.add(taskId);
    markAsDeleting(taskId);  // 🛡️ Evitar que el listener restaure la tarea
    hapticHeavy();
    
    // 🚀 FASE 1: ELIMINAR DE LA UI INMEDIATAMENTE (optimistic update)
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    
    // ✅ MOSTRAR TOAST DE ÉXITO AL INSTANTE
    setToastMessage('✅ Tarea eliminada');
    setToastType('success');
    setToastAction({
      label: 'Deshacer',
      onPress: async () => {
        // Evitar múltiples clics del botón Deshacer
        if (isUndoing) return;
        setIsUndoing(true);
        
        try {
          // 🛡️ Desmarcar para permitir que el listener restaure
          unmarkAsDeleting(taskId);
          deletingTasksRef.current.delete(taskId);
          
          // Recrear la tarea SIN el ID para que se regenere
          if (taskToDelete) {
            const { id, ...taskWithoutId } = taskToDelete;
            await createTask(taskWithoutId);
            setToastMessage('✅ Tarea restaurada');
            setToastType('info');
            setToastVisible(true);
          }
        } catch (error) {
          setToastMessage('❌ Error al restaurar');
          setToastType('error');
          setToastVisible(true);
        } finally {
          setIsUndoing(false);
        }
      }
    });
    setToastVisible(true);
    
    // 🔄 FASE 2: EJECUTAR DELETE EN FIREBASE EN BACKGROUND (fire-and-forget)
    deleteTaskFirebase(taskId)
      .then(() => {
        // ✅ Solo desmarcar después de éxito confirmado
        unmarkAsDeleting(taskId);
      })
      .catch(error => {
        // Si falla en Firebase, mantener marcado para evitar que reaparezca
      })
      .finally(() => {
        // ✅ LIMPIAR MARCA LOCAL DE EN PROCESO
        deletingTasksRef.current.delete(taskId);
      });
  }, [currentUser, isUndoing, tasks, markAsDeleting, unmarkAsDeleting]);

  const toggleComplete = useCallback(async (task) => {
    try {
      const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
      
      // Validar permisos: solo admin puede reabrir (cerrada a pendiente)
      if (task.status === 'cerrada' && currentUser?.role !== 'admin') {
        setToastMessage('Solo administradores pueden reabrir tareas completadas');
        setToastType('warning');
        setToastVisible(true);
        return;
      }
      
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
  }, [currentUser]);

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

  const reopenTask = useCallback(async (task) => {
    // Solo admin puede reabrir
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('Solo los administradores pueden reabrir tareas');
      setToastType('warning');
      setToastVisible(true);
      return;
    }

    try {
      hapticMedium();
      await updateTask(task.id, { status: 'pendiente' });
      setToastMessage('Tarea reabierta');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      setToastMessage(`Error al reabrir: ${error.message}`);
      setToastType('error');
      setToastVisible(true);
    }
  }, [currentUser]);

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
    setToastMessage('Editando copia de la tarea');
    setToastType('info');
    setToastVisible(true);
  }, [navigation]);

  const shareTask = useCallback(async (task) => {
    hapticLight();
    const shareText = `Tarea: ${task.title}\nVence: ${new Date(task.dueAt).toLocaleDateString()}\nAsignado: ${task.assignedTo || 'Sin asignar'}\nÁrea: ${task.area || 'Sin área'}\nPrioridad: ${task.priority || 'media'}\nEstado: ${task.status || 'pendiente'}`;
    
    try {
      await Clipboard.setStringAsync(shareText);
      setToastMessage('Tarea copiada al portapapeles');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      setToastMessage('Error al copiar');
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

  // Create theme-aware and responsive styles
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding, columns), [theme, isDark, isDesktop, isTablet, width, padding, columns]);

  // Show shimmer loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <ShimmerEffect width={150} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
              <ShimmerEffect width={200} height={32} borderRadius={10} />
            </View>
            <ShimmerEffect width={56} height={56} borderRadius={28} />
          </View>
        </LinearGradient>
        
        <View style={{ padding: 20, gap: 16 }}>
          <SkeletonLoader type="card" count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ConnectionIndicator />
      
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
          <LinearGradient
            colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
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
                  tasks={tasks}
                />
                <ThemeToggle size={22} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Alerta de tareas urgentes dejada en el modal - comentada la alerta de tareas vencidas
        <OverdueAlert 
          tasks={tasks} 
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
          onTaskPress={(task) => {
            navigation.navigate('TaskDetail', { task });
          }}
        />
        */}

        {/* Modal de Tareas Urgentes */}
        <Modal
          visible={showUrgentModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowUrgentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.urgentModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.urgentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alarm" size={28} color="#FF3B30" style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.urgentModalTitle, { color: theme.text }]}>¡Tareas Urgentes!</Text>
                  <Text style={[styles.urgentModalSubtitle, { color: theme.textSecondary }]}>
                    Vencen en menos de 6 horas
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.urgentModalScroll}>
              {urgentTasks.filter(task => {
                const timeLeft = new Date(task.dueAt).getTime() - Date.now();
                return timeLeft < 6 * 60 * 60 * 1000; // Menos de 6 horas
              }).map((task) => {
                const timeLeft = new Date(task.dueAt).getTime() - Date.now();
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.urgentTaskCard, { 
                      backgroundColor: theme.surface,
                      borderColor: hoursLeft < 2 ? '#FF3B30' : '#FF9500'
                    }]}
                    onPress={() => {
                      setShowUrgentModal(false);
                      navigation.navigate('TaskDetail', { task });
                    }}
                  >
                    <View style={styles.urgentTaskHeader}>
                      <Ionicons 
                        name={hoursLeft < 2 ? "alert-circle" : "time"} 
                        size={24} 
                        color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} 
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.urgentTaskTitle, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                          {task.area} • {task.assignedTo}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.urgentTaskTimer, { 
                      backgroundColor: hoursLeft < 2 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 149, 0, 0.1)' 
                    }]}>
                      <Ionicons name="hourglass" size={16} color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? '#FF3B30' : '#FF9500' 
                      }]}>
                        {hoursLeft}h {minutesLeft}m restantes
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.urgentModalFooter}>
              <TouchableOpacity 
                style={[styles.urgentModalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowUrgentModal(false)}
              >
                <Text style={styles.urgentModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </Modal>

        {/* Search Bar */}
        <Animated.View style={{ 
          opacity: searchOpacity, 
          transform: [{ translateY: searchSlide }],
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
        }}>
          <View style={[
            styles.searchBarContainer,
            {
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <SearchBar onSearch={handleSearch} placeholder="Buscar tareas..." />
          </View>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
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
            
            {/* Alerta de información important con mejor diseño */}
            {urgentTasks.length > 0 && (
              <TouchableOpacity
                style={[styles.infoAlert, { backgroundColor: theme.primary + '95', borderColor: theme.primary }]}
                onPress={() => setShowUrgentModal(false)}
                activeOpacity={0.8}
              >
                <View style={styles.infoAlertContent}>
                  <View style={[styles.infoAlertIcon, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                    <Ionicons name="information-circle" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoAlertTitle}>Solo administradores y jefes pueden editar tareas</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowUrgentModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* Fila 1: Estadísticas principales - REMOVIDA para reducir alertas
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
            */}

            <View style={styles.sectionTitleContainer}>
              <LinearGradient
                colors={[theme.primary, isDark ? '#7F1D35' : '#C53860']}
                style={styles.sectionIconBadge}
              >
                <Ionicons name="list" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Todas las Tareas</Text>
              <View style={[styles.taskCountBadge, { backgroundColor: isDark ? 'rgba(159, 34, 65, 0.2)' : 'rgba(159, 34, 65, 0.1)' }]}>
                <Text style={[styles.taskCountText, { color: theme.primary }]}>{filteredTasks.length}</Text>
              </View>
            </View>
          </View>
          )
        }
        renderItem={({ item, index }) => {
          // Determinar permisos según el rol
          const isAdmin = currentUser?.role === 'admin';
          const isJefe = currentUser?.role === 'jefe';
          
          const content = (
            <TaskItem 
              task={item}
              index={index}
              onPress={() => openDetail(item)}
              // Solo admin puede eliminar tareas
              onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
              onToggleComplete={() => toggleComplete(item)}
              // Solo admin puede reabrir tareas
              onReopen={isAdmin ? reopenTask : undefined}
              // Solo admin y jefe pueden duplicar tareas
              onDuplicate={isAdmin || isJefe ? () => duplicateTask(item) : undefined}
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
      </View>
      
      {/* Toast mejorado */}
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        action={toastAction}
        duration={toastAction ? 8000 : 3000}
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

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding, columns) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%'
  },
  headerGradient: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 14,
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 52,
    paddingBottom: 28
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  heading: { 
    fontSize: 44, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    marginRight: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  urgentBadgeText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  urgentAlert: {
    marginHorizontal: padding,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    ...SHADOWS.sm
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
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  listContent: {
    padding: padding,
    paddingTop: SPACING.sm,
    paddingBottom: 80
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: padding * 2
  },
  emptyText: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 12,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  // Bento Grid Styles
  bentoGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingHorizontal: padding
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  bentoCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
    width: isDesktop ? (screenWidth > 1440 ? '23%' : '32%') : isTablet ? '48%' : '100%',
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.15,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
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
    borderWidth: 2,
    borderColor: theme.border,
    padding: 16,
    minHeight: 100,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.15 : 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  bentoGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-start'
  },
  bentoGradientSmall: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
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
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3
  },
  bentoTitleSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoNumberLarge: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3.2,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  bentoNumberMedium: {
    fontSize: 58,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoNumberSmall: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 12,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: '100%',
    flexShrink: 1
  },
  areaName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 0.2,
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
  // Estilos para la alerta información
  infoAlert: {
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.md,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  infoAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  infoAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  infoAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    letterSpacing: -0.3
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  taskCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  searchBarContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 104,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  urgentModalContent: {
    width: '100%',
    maxWidth: MAX_WIDTHS.modal,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    ...SHADOWS.xl
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  urgentModalSubtitle: {
    fontSize: 14,
    fontWeight: '500'
  },
  urgentModalScroll: {
    padding: 20
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  urgentTaskArea: {
    fontSize: 13,
    fontWeight: '500'
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6
  },
  urgentTaskTime: {
    fontSize: 14,
    fontWeight: '700'
  },
  urgentModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)'
  },
  urgentModalButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  }
});
