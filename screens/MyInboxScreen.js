// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, SectionList, Modal, ScrollView } from 'react-native';
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
import { scheduleOverdueTasksNotification, scheduleMultipleDailyOverdueNotifications } from '../services/notifications';
import OverdueAlert from '../components/OverdueAlert';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';

export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [recentMessages, setRecentMessages] = useState([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

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

  // Filtrar tareas asignadas al usuario actual y ordenar por fecha
  const filtered = tasks
    .filter(task => {
      // Si no hay usuario, no mostrar nada
      if (!currentUser) return false;
      
      // Mostrar tareas asignadas al email del usuario
      return task.assignedTo === currentUser.email;
    })
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  // Contar tareas vencidas
  const overdueTasks = filtered.filter(task => task.dueAt < Date.now() && task.status !== 'cerrada');
  const overdueCount = overdueTasks.length;

  // Ref para evitar programar notificaciones múltiples veces
  const lastScheduledRef = useRef(null);

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
        <TouchableOpacity style={[styles.actionBtn, { marginRight: 8 }]} onPress={() => markClosed(item)}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#9F2241" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginRight: 8 }]} onPress={() => postponeOneDay(item)}>
          <Ionicons name="time-outline" size={18} color="#DAA520" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Posponer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginRight: 8 }]} onPress={() => openChat(item)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, {color: '#fff'}]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteTask(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, {color: '#fff'}]}>Borrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      
      <View style={[styles.headerGradient, { backgroundColor: isDark ? '#1A1A1A' : theme.primary }]}>
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
    fontSize: 32, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2
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
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
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
    marginHorizontal: padding,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
    flexShrink: 1
  },
  currentUserHint: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
    flexShrink: 1
  },
  listContent: {
    padding: 12
  },
  messagesSection: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  messagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageCard: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageTaskTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    ...SHADOWS.xl
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  modalScroll: {
    padding: SPACING.md
  },
  actionsRow: { 
    flexDirection: 'row', 
    marginTop: 12
  },
  actionBtn: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
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
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444'
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
