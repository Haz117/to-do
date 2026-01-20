// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToTasks, updateTask, deleteTask as deleteTaskFirebase } from '../services/tasks';
import { scheduleNotificationForTask, cancelNotification } from '../services/notifications';
import { getCurrentSession } from '../services/authFirestore';
import { hapticMedium } from '../utils/haptics';
import Toast from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';

export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentUser();
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

  // Suscribirse a cambios en tiempo real de Firebase
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

  // Filtrar tareas asignadas al usuario actual y ordenar por fecha
  const filtered = tasks
    .filter(task => {
      // Si no hay usuario, no mostrar nada
      if (!currentUser) return false;
      
      // Mostrar tareas asignadas al email del usuario
      return task.assignedTo === currentUser.email;
    })
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  const markClosed = async (task) => {
    try {
      hapticMedium();
      // Cancelar notificación existente
      if (task.notificationId) await cancelNotification(task.notificationId);
      await updateTask(task.id, { status: 'cerrada' });
      Toast.show({
        type: 'success',
        text1: 'Completada',
        text2: 'Tarea marcada como completada',
        position: 'top',
        visibilityTime: 2000,
      });
      // La actualización del estado se hace automáticamente por el listener
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error al marcar como cerrada: ' + e.message,
        position: 'top',
        visibilityTime: 3000,
      });
      console.warn('Error marcando cerrada', e);
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
      console.warn('Error posponiendo tarea', e);
    }
  };

  const deleteTask = async (taskId) => {
    Alert.alert(
      'Eliminar tarea',
      '¿Estás seguro de que quieres eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteTaskFirebase(taskId);
          }
        }
      ]
    );
  };

  const toggleComplete = async (task) => {
    const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
    await updateTask(task.id, { status: newStatus });
  };

  const openDetail = (task) => navigation.navigate('TaskDetail', { task });
  const openChat = (task) => navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  const goToCreate = () => navigation.navigate('TaskDetail');

  const renderItem = ({ item }) => (
    <View style={{ marginBottom: 12 }}>
      <TaskItem 
        task={item} 
        onPress={() => openDetail(item)}
        onDelete={() => deleteTask(item.id)}
        onToggleComplete={() => toggleComplete(item)}
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => markClosed(item)}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#9F2241" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => postponeOneDay(item)}>
          <Ionicons name="time-outline" size={18} color="#DAA520" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Posponer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => openChat(item)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, {color: '#fff'}]}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerGradient, { backgroundColor: isDark ? '#1A1A1A' : theme.primary }]}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="mail" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Tus tareas pendientes</Text>
            </View>
            <Text style={styles.heading}>Mi Bandeja</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
            <View style={[styles.addButtonGradient, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="add" size={32} color="#9F2241" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.userSection}>
        <View style={styles.userLabelContainer}>
          <Ionicons name="person-outline" size={16} color="#9F2241" style={{ marginRight: 6 }} />
          <Text style={styles.userLabel}>MIS TAREAS ASIGNADAS</Text>
        </View>
        <Text style={styles.currentUserName} numberOfLines={1} ellipsizeMode="tail">
          {currentUser?.displayName || 'Cargando...'}
        </Text>
        <Text style={styles.currentUserHint} numberOfLines={1} ellipsizeMode="tail">
          {currentUser?.email || 'Iniciando sesión...'}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
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
            icon="mail-open-outline"
            title="Sin tareas"
            message="No tienes tareas asignadas en este momento. ¡Disfruta tu tiempo libre!"
          />
        }
      />
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addButtonText: {
    color: '#9F2241',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  },
  userSection: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: isDark ? '#000' : '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3'
  },
  userLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  userLabel: {
    fontSize: 12,
    color: '#9F2241',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  currentUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 6,
    flexShrink: 1
  },
  currentUserHint: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
    flexShrink: 1
  },
  listContent: {
    padding: 20
  },
  actionsRow: { 
    flexDirection: 'row', 
    marginTop: 12,
    gap: 10
  },
  actionBtn: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  actionBtnPrimary: {
    backgroundColor: '#9F2241',
    borderColor: '#9F2241'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    letterSpacing: 0.2,
    flexShrink: 1
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
  }
});
