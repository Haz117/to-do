// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, SectionList, Modal, ScrollView, TextInput, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToTasks, updateTask, deleteTask as deleteTaskFirebase } from '../services/tasks';
import { scheduleNotificationForTask, cancelNotification } from '../services/notifications';
import { getCurrentSession } from '../services/authFirestore';
import { hapticMedium } from '../utils/haptics';
import Toast from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { scheduleOverdueTasksNotification, scheduleMultipleDailyOverdueNotifications } from '../services/notifications';
import OverdueAlert from '../components/OverdueAlert';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';

export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks, markAsDeleting, unmarkAsDeleting } = useTasks();
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [recentMessages, setRecentMessages] = useState([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    area: [],
    overdue: false,
  });
  const [deletingTaskIds, setDeletingTaskIds] = useState(new Set());

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const userCardOpacity = useRef(new Animated.Value(0)).current;
  const userCardSlide = useRef(new Animated.Value(20)).current;
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

    // User card animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(userCardOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(userCardSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay);

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
    }, staggerDelay * 2);

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
    }, staggerDelay * 3);
  }, []);

  useEffect(() => {
    loadCurrentUser();
    
    // 💾 al montar: restaurar tareas en proceso de borrado
    restoreDeletingTasks();
  }, []);

  const loadCurrentUser = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Cargar mensajes recientes de tareas donde el usuario está involucrado
  useEffect(() => {
    if (!currentUser?.email || !db) return;

    const loadRecentMessages = async () => {
      try {
        const messages = [];
        
        // Obtener tareas donde el usuario está involucrado
        let userTasks = tasks.filter(task =>
          task && 
          task.id && 
          (task.assignedTo === currentUser.email || 
          task.createdBy === currentUser.email)
        );

        // Si es admin, agregar tareas donde haya actividad reciente (máximo 20)
        if (currentUser.role === 'admin' && userTasks.length < 10) {
          const otherTasks = tasks
            .filter(task => 
              task && 
              task.id && 
              task.assignedTo !== currentUser.email && 
              task.createdBy !== currentUser.email
            )
            .slice(0, 10 - userTasks.length);
          userTasks = [...userTasks, ...otherTasks];
        }

        // Si es jefe, agregar tareas de su departamento
        if (currentUser.role === 'jefe' && userTasks.length < 10) {
          const deptTasks = tasks
            .filter(task => 
              task && 
              task.id && 
              task.area === currentUser.department &&
              task.assignedTo !== currentUser.email && 
              task.createdBy !== currentUser.email
            )
            .slice(0, 10 - userTasks.length);
          userTasks = [...userTasks, ...deptTasks];
        }

        // Por cada tarea, obtener los últimos 3 mensajes
        for (const task of userTasks.slice(0, 10)) { // Limitar a 10 tareas para no sobrecargar
          try {
            if (!task.id) continue;
            
            const messagesRef = collection(db, 'tasks', task.id, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(3));
            const snapshot = await getDocs(q);
            
            snapshot.forEach(doc => {
              const msgData = doc.data();
              // Solo incluir mensajes de otros usuarios con datos válidos
              if (msgData && 
                  typeof msgData.text === 'string' && 
                  msgData.text.trim() !== '' &&
                  msgData.author && 
                  msgData.author !== currentUser.displayName && 
                  msgData.author !== currentUser.email) {
                messages.push({
                  id: `${doc.id}-${Date.now()}`,
                  taskId: task.id,
                  taskTitle: task.title || 'Sin título',
                  author: msgData.author || 'Anónimo',
                  text: msgData.text || '',
                  createdAt: msgData.createdAt || null
                });
              }
            });
          } catch (err) {
            // Silenciar errores de tareas individuales
          }
        }

        // Ordenar por fecha y tomar los 5 más recientes
        messages.sort((a, b) => {
          try {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
          } catch {
            return 0;
          }
        });

        setRecentMessages(messages.slice(0, 5));
      } catch (error) {
        // Silenciar error pero no cargar mensajes
        setRecentMessages([]);
      }
    };

    if (tasks.length > 0) {
      loadRecentMessages();
    }
  }, [currentUser, tasks]);

  // Filtrar y ordenar tareas con búsqueda y filtros avanzados
  const filtered = tasks
    .filter(task => {
      // Si no hay usuario, no mostrar nada
      if (!currentUser) return false;
      
      // Si es operativo, mostrar solo sus tareas asignadas
      if (currentUser.role === 'operativo') {
        if (task.assignedTo !== currentUser.email) return false;
      }
      
      // Filtro de búsqueda (título, descripción)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(search);
        const matchDesc = task.description?.toLowerCase().includes(search);
        if (!matchTitle && !matchDesc) return false;
      }
      
      // Filtro de estado
      if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
      
      // Filtro de prioridad
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
      
      // Filtro de dirección/área
      if (filters.area.length > 0 && !filters.area.includes(task.area)) return false;
      
      // Filtro de vencidas
      if (filters.overdue && (task.dueAt >= Date.now() || task.status === 'cerrada')) return false;
      
      return true;
    })
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  // Contar tareas vencidas
  const overdueTasks = filtered.filter(task => task.dueAt < Date.now() && task.status !== 'cerrada');
  const overdueCount = overdueTasks.length;

  // Ref para evitar programar notificaciones múltiples veces
  const lastScheduledRef = useRef(null);

  // Ref para evitar eliminar la misma tarea múltiples veces
  const deletingTasksRef = useRef(new Set());

  // Programar notificación diaria de tareas vencidas (solo una vez al día)
  useEffect(() => {
    if (overdueCount > 0) {
      const today = new Date().toDateString();
      
      // Solo programar si no se ha hecho hoy
      if (lastScheduledRef.current !== today) {
        // Notificación diaria a las 9 AM
        scheduleOverdueTasksNotification(overdueTasks);
        // Notificaciones múltiples (9 AM, 2 PM, 6 PM)
        scheduleMultipleDailyOverdueNotifications(overdueTasks);
        
        lastScheduledRef.current = today;
      }
    }
  }, [overdueCount > 0]); // Solo cuando cambia de 0 a >0 o viceversa

  const markClosed = async (task) => {
    try {
      hapticMedium();
      // Cancelar notificación existente
      if (task.notificationId) await cancelNotification(task.notificationId);
      await updateTask(task.id, { status: 'cerrada' });
      setToastMessage('Tarea completada exitosamente');
      setToastType('success');
      setToastVisible(true);
      // La actualización del estado se hace automáticamente por el listener
    } catch (e) {
      setToastMessage('Error al marcar como cerrada: ' + e.message);
      setToastType('error');
      setToastVisible(true);
    }
  };

  const postponeOneDay = async (task) => {
    try {
      hapticMedium();
      const newDue = (task.dueAt || Date.now()) + 24 * 3600 * 1000; // +1 día
      const updatedTask = { ...task, dueAt: newDue };
      
      // Cancelar notificación previa
      if (task.notificationId) await cancelNotification(task.notificationId);
      
      // Reprogramar notificación 10 minutos antes
      const notifId = await scheduleNotificationForTask(updatedTask, { minutesBefore: 10 });
      
      await updateTask(task.id, { 
        dueAt: newDue,
        notificationId: notifId || task.notificationId
      });
      Toast.show({
        type: 'success',
        text1: 'Pospuesta',
        text2: 'Tarea pospuesta 1 día',
        position: 'top',
        visibilityTime: 2000,
      });
      // La actualización del estado se hace automáticamente por el listener
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error al posponer: ' + e.message,
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  // 💾 Guardar tareas en proceso de borrado en AsyncStorage
  const saveDeletingTasks = async (taskIds) => {
    try {
      const tasksToDelete = Array.from(taskIds);
      await AsyncStorage.setItem('deletingTasks', JSON.stringify(tasksToDelete));
    } catch (error) {
      // Silent fail - AsyncStorage is optional
    }
  };

  // 🔄 Restaurar tareas en proceso de borrado al recargar
  const restoreDeletingTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('deletingTasks');
      if (stored) {
        const taskIds = JSON.parse(stored);
        
        // Marcar como en proceso nuevamente
        const taskIdSet = new Set(taskIds);
        setDeletingTaskIds(taskIdSet);
        deletingTasksRef.current = taskIdSet;

        // ✅ INMEDIATAMENTE: Remover estas tareas de la lista UI para que no reaparezcan
        setTasks(prevTasks => prevTasks.filter(t => !taskIdSet.has(t.id)));

        // Continuar el proceso de borrado para cada tarea en background
        for (const taskId of taskIds) {
          // Intentar borrar de Firebase nuevamente
          deleteTaskFirebase(taskId)
            .then(() => {
              // Éxito
            })
            .catch(error => {
              // Firebase delete failed - task remains marked as deleted locally
            })
            .finally(() => {
              // Limpiar del tracking
              deletingTasksRef.current.delete(taskId);
              setDeletingTaskIds(prev => {
                const updated = new Set(prev);
                updated.delete(taskId);
                return updated;
              });
            });
        }

        // Limpiar AsyncStorage después de restaurar
        await AsyncStorage.removeItem('deletingTasks');
      }
    } catch (error) {
      // AsyncStorage restore failed - continue with fresh state
    }
  };

  const deleteTask = async (taskId) => {
    // 🛡️ GUARD: Prevenir eliminación múltiple del mismo task
    if (deletingTasksRef.current.has(taskId)) {
      return;
    }
    
    // Verificar permisos ANTES de intentar
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage(`Solo admins pueden eliminar. Tu rol: ${currentUser?.role || 'desconocido'}`);
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Guardar tarea para posible undo
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    // ✅ MARCAR COMO EN PROCESO (en state, ref Y context global)
    deletingTasksRef.current.add(taskId);
    setDeletingTaskIds(prev => new Set([...prev, taskId]));
    markAsDeleting(taskId);  // 🛡️ Evitar que el listener restaure la tarea
    
    // 💾 GUARDAR EN ASYNCSTORAGE para persistir si recarga
    await saveDeletingTasks(deletingTasksRef.current);
    
    // ✅ MOSTRAR TOAST INMEDIATAMENTE
    setToastMessage('🔴 ¡BORRANDO TAREA! Espera un momento...');
    setToastType('info');
    setToastVisible(true);

    // Esperar 600ms para que el usuario vea el INDICADOR ROJO
    // Luego remover de la lista UI
    setTimeout(() => {
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    }, 600);
    
    // 🔄 FASE 2: EJECUTAR DELETE EN FIREBASE EN BACKGROUND (fire-and-forget)
    deleteTaskFirebase(taskId)
      .then(() => {
        setToastMessage('✅ ¡TAREA ELIMINADA! Ya no aparecerá');
        setToastType('success');
        setToastVisible(true);
        // ✅ Solo desmarcar después de éxito confirmado
        unmarkAsDeleting(taskId);
      })
      .catch(error => {
        setToastMessage('Error: No se pudo eliminar la tarea');
        setToastType('error');
        setToastVisible(true);
        // Mantener marcado para evitar que reaparezca
      })
      .finally(() => {
        // ✅ LIMPIAR MARCA LOCAL DE EN PROCESO
        deletingTasksRef.current.delete(taskId);
        setDeletingTaskIds(prev => {
          const updated = new Set(prev);
          updated.delete(taskId);
          return updated;
        });
      });
  };

  // Función para borrar múltiples tareas seleccionadas
  const deleteSelectedTasks = async () => {
    if (selectedTaskIds.size === 0) {
      setToastMessage('⚠️ Selecciona al menos una tarea');
      setToastType('warning');
      setToastVisible(true);
      return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('❌ Solo admins pueden eliminar tareas');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    const count = selectedTaskIds.size;
    setToastMessage(`🔴 ¡ELIMINANDO ${count} TAREA${count > 1 ? 'S' : ''}! Espera...`);
    setToastType('info');
    setToastVisible(true);

    // Marcar todas como eliminando (local + context global)
    const newDeletingSet = new Set([...deletingTasksRef.current, ...selectedTaskIds]);
    deletingTasksRef.current = newDeletingSet;
    setDeletingTaskIds(newDeletingSet);
    
    // 🛡️ Marcar en context global para evitar restauración por listener
    selectedTaskIds.forEach(taskId => markAsDeleting(taskId));

    // 💾 GUARDAR EN ASYNCSTORAGE para persistir si recarga
    await saveDeletingTasks(newDeletingSet);

    // Esperar 800ms para que el usuario vea el INDICADOR ROJO con "ELIMINANDO"
    // Luego remover de la lista UI
    setTimeout(() => {
      setTasks(prevTasks => prevTasks.filter(t => !selectedTaskIds.has(t.id)));
    }, 800);

    // Eliminar todas en background
    const taskIdsToDelete = Array.from(selectedTaskIds);
    const deletePromises = taskIdsToDelete.map(taskId => 
      deleteTaskFirebase(taskId)
        .then(() => {
          unmarkAsDeleting(taskId); // Desmarcar solo las que se eliminaron correctamente
          return taskId;
        })
        .catch(err => {
          // Firebase delete failed
          return null; // Mantener marcado para evitar que reaparezca
        })
    );

    Promise.all(deletePromises)
      .then((results) => {
        const successCount = results.filter(r => r !== null).length;
        setToastMessage(`✅ ¡${successCount} TAREA${successCount > 1 ? 'S' : ''} ELIMINADA${successCount > 1 ? 'S' : ''}! Ya no aparecerán`);
        setToastType('success');
        setToastVisible(true);
        setSelectedTaskIds(new Set());
      })
      .catch(err => {
        setToastMessage('❌ Error: No se pudieron eliminar todas las tareas');
        setToastType('error');
        setToastVisible(true);
      })
      .finally(() => {
        setDeletingTaskIds(prev => {
          const updated = new Set(prev);
          taskIdsToDelete.forEach(id => updated.delete(id));
          return updated;
        });
      });
  };

  // Toggle selección de tarea
  const toggleTaskSelection = (taskId) => {
    const updated = new Set(selectedTaskIds);
    if (updated.has(taskId)) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setSelectedTaskIds(updated);
    hapticMedium();
  };

  // Obtener áreas únicas disponibles para filtros
  const uniqueAreas = [...new Set(tasks.map(t => t.area).filter(Boolean))].sort();

  const toggleComplete = async (task) => {
    // Validar permisos: solo admin puede reabrir
    if (task.status === 'cerrada' && currentUser?.role !== 'admin') {
      setToastMessage('Solo administradores pueden reabrir tareas');
      setToastType('warning');
      setToastVisible(true);
      return;
    }
    
    const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
    await updateTask(task.id, { status: newStatus });
  };

  const openDetail = (task) => {
    // Solo admin y jefe pueden editar tareas
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'jefe')) {
      setToastMessage('Solo administradores y jefes pueden editar tareas');
      setToastType('info');
      setToastVisible(true);
      return;
    }
    navigation.navigate('TaskDetail', { task });
  };
  
  const openChat = (task) => navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  
  const goToCreate = () => {
    // Solo admin y jefe pueden crear tareas
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'jefe')) {
      setToastMessage('Solo administradores y jefes pueden crear tareas');
      setToastType('warning');
      setToastVisible(true);
      return;
    }
    navigation.navigate('TaskDetail');
  };

  const renderItem = ({ item }) => {
    // Solo admin puede eliminar tareas
    const isAdmin = currentUser?.role === 'admin';
    const isSelected = selectedTaskIds.has(item.id);
    const isDeleting = deletingTaskIds.has(item.id);
    
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'flex-start',
          backgroundColor: isDeleting ? '#FFE5E5' : (isSelected ? '#E3F2FD' : 'transparent'),
          borderRadius: 8,
          padding: 8,
          gap: 8
        }}>
          {/* Checkbox para multi-select */}
          {isAdmin && (
            <TouchableOpacity 
              onPress={() => toggleTaskSelection(item.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isSelected ? theme.primary : '#DDD',
                backgroundColor: isSelected ? theme.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 4
              }}
            >
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </TouchableOpacity>
          )}

          {/* Indicador visual prominente de "Borrando..." */}
          {isDeleting && (
            <View style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 69, 69, 0.9)',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100,
              flexDirection: 'row',
              gap: 12
            }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: '#FFF',
                borderTopColor: 'transparent',
                transform: [{ rotate: '45deg' }]
              }} />
              <Text style={{ 
                color: '#FFF', 
                fontSize: 16, 
                fontWeight: '700',
                letterSpacing: 0.5
              }}>ELIMINANDO...</Text>
            </View>
          )}

          {/* TaskItem */}
          <View style={{ flex: 1 }}>
            <TaskItem 
              task={item} 
              onPress={() => !isDeleting && openDetail(item)}
              onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
              onToggleComplete={() => !isDeleting && toggleComplete(item)}
              onReopen={isAdmin ? () => !isDeleting && updateTask(item.id, { status: 'pendiente' }) : undefined}
              isDeleting={isDeleting}
            />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { marginRight: isTablet ? 8 : 0 }]} onPress={() => markClosed(item)}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#9F2241" style={{ marginRight: 4 }} />
            <Text style={styles.actionText} numberOfLines={1}>Cerrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { marginRight: isTablet ? 8 : 0 }]} onPress={() => postponeOneDay(item)}>
            <Ionicons name="time-outline" size={16} color="#DAA520" style={{ marginRight: 4 }} />
            <Text style={styles.actionText} numberOfLines={1}>Posponer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { marginRight: isTablet ? 8 : 0, backgroundColor: '#00B4D8' }]} 
            onPress={() => openChat(item)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={[styles.actionText, {color: '#fff'}]} numberOfLines={1}>Comentar</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteTask(item.id)}>
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={[styles.actionText, {color: '#fff'}]} numberOfLines={1}>Borrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={filtered} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />
      
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <View style={styles.greetingContainer}>
                <Ionicons name="file-tray-full" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Tus tareas pendientes</Text>
              </View>
              <Text style={styles.heading}>Mi Bandeja</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {/* Botón de mensajes con badge */}
              {recentMessages.length > 0 && (
                <TouchableOpacity 
                  style={[styles.messagesButton, { marginRight: 12 }]} 
                  onPress={() => {
                    hapticMedium();
                    setShowMessagesModal(true);
                  }}
                >
                  <View style={[styles.addButtonGradient, { backgroundColor: '#FFFFFF' }]}>
                    <Ionicons name="chatbubbles" size={24} color="#DAA520" />
                    {recentMessages.length > 0 && (
                      <View style={styles.messageBadge}>
                        <Text style={styles.messageBadgeText}>{recentMessages.length}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
                <View style={[styles.addButtonGradient, { backgroundColor: '#FFFFFF' }]}>
                  <Ionicons name="add" size={32} color="#9F2241" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: userCardOpacity, transform: [{ translateY: userCardSlide }] }}>
        <View style={[
          styles.userSection,
          {
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(159, 34, 65, 0.3)' : 'rgba(159, 34, 65, 0.15)',
          }
        ]}>
          <LinearGradient
            colors={[theme.primary, isDark ? '#7F1D35' : '#C53860']}
            style={styles.userIconBadge}
          >
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.userInfoContent}>
            <Text style={styles.userLabel}>
              {currentUser?.role === 'admin' ? 'TODAS LAS TAREAS' : 
               currentUser?.role === 'jefe' ? 'TAREAS DE MI ÁREA' : 
               'MIS TAREAS ASIGNADAS'}
            </Text>
            <Text style={[styles.currentUserName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
              {currentUser?.displayName || 'Cargando...'}
            </Text>
            <Text style={[styles.currentUserHint, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
              {currentUser?.email || 'Iniciando sesión...'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* 🔍 BÚSQUEDA Y FILTROS */}
      <Animated.View style={{ opacity: searchOpacity, transform: [{ translateY: searchSlide }] }}>
        <View style={[
          styles.filterSection, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar tareas..."
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

        {/* Botón de filtros */}
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: showFilters ? theme.primary : theme.card }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons 
            name="funnel" 
            size={18} 
            color={showFilters ? '#FFFFFF' : theme.text} 
          />
        </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Filtros expandibles - MEJORADO */}
      {/* 🎨 MODAL DE FILTROS AVANZADOS */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* HeaderModal */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="funnel" size={24} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filtros Avanzados</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close-circle" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Contenido con scroll */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
              {/* Estado */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Ionicons name="bookmark-outline" size={16} color={theme.primary} />
                  <Text style={[styles.filterTitle, { color: theme.text }]}>ESTADO DE TAREA</Text>
                  <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.filterBadgeText}>{filters.status.length}</Text>
                  </View>
                </View>
                <View style={styles.filterOptions}>
                  {['pendiente', 'en progreso', 'cerrada'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.status.includes(status) && { ...styles.filterOptionActive, backgroundColor: theme.primary }
                      ]}
                      onPress={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status.includes(status)
                            ? prev.status.filter(s => s !== status)
                            : [...prev.status, status]
                        }));
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {filters.status.includes(status) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                        <Text style={[
                          styles.filterOptionText,
                          filters.status.includes(status) && { color: '#FFFFFF', fontWeight: '700' }
                        ]}>
                          {status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Separador visual */}
              <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />

              {/* Prioridad */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Ionicons name="flash-outline" size={16} color={theme.primary} />
                  <Text style={[styles.filterTitle, { color: theme.text }]}>NIVEL DE PRIORIDAD</Text>
                  <View style={[styles.filterBadge, { backgroundColor: '#FF9500' }]}>
                    <Text style={styles.filterBadgeText}>{filters.priority.length}</Text>
                  </View>
                </View>
                <View style={styles.filterOptions}>
                  {['baja', 'media', 'alta'].map(priority => {
                    const colors = { baja: '#4CAF50', media: '#FF9500', alta: '#FF3B30' };
                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.filterOption,
                          filters.priority.includes(priority) && { 
                            ...styles.filterOptionActive, 
                            backgroundColor: colors[priority] 
                          }
                        ]}
                        onPress={() => {
                          setFilters(prev => ({
                            ...prev,
                            priority: prev.priority.includes(priority)
                              ? prev.priority.filter(p => p !== priority)
                              : [...prev.priority, priority]
                          }));
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {filters.priority.includes(priority) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                          <Text style={[
                            styles.filterOptionText,
                            filters.priority.includes(priority) && { color: '#FFFFFF', fontWeight: '700' }
                          ]}>
                            {priority}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Separador visual */}
              <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />

              {/* Dirección / Área */}
              {uniqueAreas.length > 0 && (
                <>
                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Ionicons name="business-outline" size={16} color={theme.primary} />
                      <Text style={[styles.filterTitle, { color: theme.text }]}>DIRECCIÓN O ÁREA</Text>
                      <View style={[styles.filterBadge, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.filterBadgeText}>{filters.area.length}</Text>
                      </View>
                    </View>
                    <View style={styles.filterOptions}>
                      {uniqueAreas.map(area => (
                        <TouchableOpacity
                          key={area}
                          style={[
                            styles.filterOption,
                            filters.area.includes(area) && { ...styles.filterOptionActive, backgroundColor: '#3B82F6' }
                          ]}
                          onPress={() => {
                            setFilters(prev => ({
                              ...prev,
                              area: prev.area.includes(area)
                                ? prev.area.filter(a => a !== area)
                                : [...prev.area, area]
                            }));
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {filters.area.includes(area) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                            <Text style={[
                              styles.filterOptionText,
                              filters.area.includes(area) && { color: '#FFFFFF', fontWeight: '700' }
                            ]}>
                              {area}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Separador visual */}
                  <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />
                </>
              )}

              {/* Tareas vencidas */}
              <View style={styles.filterGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    styles.filterOptionLarge,
                    { marginTop: 0 },
                    filters.overdue && { 
                      ...styles.filterOptionActive, 
                      backgroundColor: '#FF3B30' 
                    }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons 
                      name={filters.overdue ? "alert-circle" : "alert-circle-outline"} 
                      size={18} 
                      color={filters.overdue ? '#FFFFFF' : '#FF3B30'} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      styles.filterOptionLargeText,
                      filters.overdue && { color: '#FFFFFF', fontWeight: '700' }
                    ]}>
                      {filters.overdue ? '✓ MOSTRAR SOLO VENCIDAS' : 'MOSTRAR SOLO TAREAS VENCIDAS'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Botón para limpiar filtros */}
              {(filters.status.length > 0 || filters.priority.length > 0 || filters.area.length > 0 || filters.overdue) && (
                <>
                  <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />
                  <TouchableOpacity
                    style={[styles.clearFiltersBtn, { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(159, 34, 65, 0.05)' }]}
                    onPress={() => setFilters({ status: [], priority: [], area: [], overdue: false })}
                  >
                    <Ionicons name="refresh" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.clearFiltersBtnText, { color: theme.primary }]}>RESETEAR TODOS LOS FILTROS</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Footer con acciones */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalFooterBtnSecondary, { borderColor: theme.textSecondary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalFooterBtnText, { color: theme.text }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalFooterBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.modalFooterBtnText, { color: '#FFFFFF' }]}>APLICAR FILTROS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contador de tareas + Botón de borrar múltiples */}
      <View style={[styles.counterSection, { backgroundColor: theme.backgroundSecondary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.counterText, { color: theme.text }]}>
            {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'} 
            {searchText && ` encontradas`}
            {Object.values(filters).some(v => (Array.isArray(v) && v.length > 0) || v === true) && ` (filtradas)`}
          </Text>
          {selectedTaskIds.size > 0 && (
            <Text style={[styles.counterText, { color: theme.primary, fontSize: 12, marginTop: 4 }]}>
              {selectedTaskIds.size} seleccionada{selectedTaskIds.size > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Botón para borrar seleccionadas */}
        {selectedTaskIds.size > 0 && (
          <TouchableOpacity
            style={[styles.deleteSelectedBtn, { backgroundColor: '#FF3B30' }]}
            onPress={deleteSelectedTasks}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
              BORRAR ({selectedTaskIds.size})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de mensajes */}
      <Modal
        visible={showMessagesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessagesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chatbubbles" size={24} color="#DAA520" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Mensajes Recientes</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMessagesModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {recentMessages.map((msg, idx) => (
                <TouchableOpacity
                  key={`msg-${msg.taskId}-${msg.id}-${idx}`}
                  style={[styles.messageCard, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3'
                  }]}
                  onPress={() => {
                    setShowMessagesModal(false);
                    navigation.navigate('TaskChat', { taskId: msg.taskId, taskTitle: msg.taskTitle });
                  }}
                >
                  <View style={styles.messageHeader}>
                    <Ionicons name="document-text-outline" size={14} color={isDark ? '#AAA' : '#666'} style={{ marginRight: 6 }} />
                    <Text style={[styles.messageTaskTitle, { color: theme.text }]} numberOfLines={1}>
                      {msg.taskTitle || 'Sin título'}
                    </Text>
                  </View>
                  <Text style={[styles.messageAuthor, { color: theme.primary }]}>
                    {msg.author || 'Anónimo'}
                  </Text>
                  <Text style={[styles.messageText, { color: isDark ? '#AAA' : '#666' }]} numberOfLines={2}>
                    {msg.text || ''}
                  </Text>
                  <Text style={[styles.messageTime, { color: isDark ? '#888' : '#999' }]}>
                    {(() => {
                      try {
                        if (msg.createdAt?.toDate) {
                          return new Date(msg.createdAt.toDate()).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } else if (msg.createdAt?.seconds) {
                          return new Date(msg.createdAt.seconds * 1000).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        }
                        return 'Reciente';
                      } catch {
                        return 'Reciente';
                      }
                    })()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9F2241"
            colors={['#9F2241']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="inbox-outline"
            title="¡Bandeja vacía!"
            message="No tienes tareas en este momento. ¡Descansa y disfruta! 🎉"
            variant="success"
          />
        }
      />
      </View>
      
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
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
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 48,
    paddingBottom: SPACING.lg
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  greeting: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 16,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4
  },
  heading: { 
    fontSize: isDesktop ? 36 : isTablet ? 32 : 36, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 4
  },
  addButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md
  },
  messagesButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  addButtonGradient: {
    width: isDesktop ? 56 : isTablet ? 54 : 60,
    height: isDesktop ? 56 : isTablet ? 54 : 60,
    borderRadius: isDesktop ? 28 : isTablet ? 27 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  addButtonText: {
    color: '#9F2241',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: padding,
    marginTop: isDesktop ? SPACING.xxxl : isTablet ? SPACING.xxl : SPACING.xxl,
    marginBottom: isDesktop ? SPACING.lg : isTablet ? SPACING.md : SPACING.md,
    padding: isDesktop ? SPACING.lg : isTablet ? SPACING.md : SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#9F2241',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#9F2241',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userInfoContent: {
    flex: 1,
  },
  userLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  userLabel: {
    fontSize: isDesktop ? 10 : 11,
    color: '#9F2241',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentUserName: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 18,
    fontWeight: '800',
    marginBottom: 2,
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  currentUserHint: {
    fontSize: isDesktop ? 13 : 14,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.1
  },
  listContent: {
    padding: isDesktop ? 20 : isTablet ? 16 : 16,
    paddingTop: isDesktop ? 32 : 24,
    paddingBottom: 80
  },
  messagesSection: {
    marginHorizontal: isDesktop ? 20 : isTablet ? 16 : 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    backgroundColor: isDark ? 'rgba(218, 165, 32, 0.15)' : 'rgba(218, 165, 32, 0.1)',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3
  },
  messagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#DAA520',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  messageCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageTaskTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    color: '#9F2241',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: theme.textSecondary,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  messageTime: {
    fontSize: 11,
    fontStyle: 'italic',
    color: isDark ? '#888' : '#999',
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xxl || 32,
    borderTopRightRadius: RADIUS.xxl || 32,
    maxHeight: '85%',
    padding: 0,
    paddingBottom: 32,
    ...SHADOWS.xl,
    backgroundColor: theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isDesktop ? SPACING.xl : SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.15)' : '#F3E5F5'
  },
  modalTitle: {
    fontSize: isDesktop ? 24 : 26,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  modalScroll: {
    padding: isDesktop ? SPACING.xl : SPACING.lg
  },
  actionsRow: { 
    flexDirection: 'row', 
    flexWrap: isTablet ? 'nowrap' : 'wrap',
    marginTop: 18,
    gap: isDesktop ? 14 : isTablet ? 12 : 10,
    justifyContent: 'space-between'
  },
  actionBtn: {
    flex: isTablet ? 1 : 0.48,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0',
    paddingVertical: isDesktop ? SPACING.md : isTablet ? 12 : 12,
    paddingHorizontal: isDesktop ? SPACING.md : isTablet ? SPACING.sm : SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.3)' : '#F5DEB3',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: isDesktop ? 48 : isTablet ? 44 : 44,
    marginBottom: isTablet ? 0 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  actionBtnPrimary: {
    backgroundColor: '#9F2241',
    borderColor: '#9F2241'
  },
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444'
  },
  actionText: {
    fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 0.2,
    flexShrink: 0,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: isDesktop ? 140 : 120,
    paddingHorizontal: isDesktop ? 80 : 60
  },
  emptyText: {
    fontSize: isDesktop ? 32 : 30,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 18,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  emptySubtext: {
    fontSize: isDesktop ? 17 : 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  // 🔍 ESTILOS DE BÚSQUEDA Y FILTROS
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: padding,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
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
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0',
  },
  filtersPanel: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  filterSeparator: {
    height: 1,
    marginVertical: SPACING.md,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterGroup: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0',
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  filterOptionLarge: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  filterOptionActive: {
    borderColor: 'transparent',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.3,
  },
  filterOptionLargeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  counterSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FF3B30',
  },
  // 🎨 ESTILOS DEL FOOTER DEL MODAL
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    backgroundColor: theme.card,
    borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  modalFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  modalFooterBtnSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.textSecondary,
  },
  modalFooterBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  modalFooterBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
