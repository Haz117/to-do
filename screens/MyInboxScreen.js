// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import { loadTasks, saveTasks } from '../storage';
import { loadCurrentUser, saveCurrentUser } from '../services/user';
import { scheduleNotificationForTask, cancelNotification } from '../services/notifications';

export default function MyInboxScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [editingUser, setEditingUser] = useState('');

  useEffect(() => {
    (async () => {
      const t = await loadTasks();
      setTasks(t || []);
      const u = await loadCurrentUser();
      setCurrentUser(u);
      setEditingUser(u);
    })();
  }, []);

  // Guarda usuario
  const saveUser = async () => {
    await saveCurrentUser(editingUser.trim() || 'Usuario A');
    setCurrentUser(editingUser.trim() || 'Usuario A');
    Alert.alert('Usuario guardado', `Usuario actual: ${editingUser.trim() || 'Usuario A'}`);
  };

  // Actualiza tareas en storage y estado
  const persistTasks = async (newTasks) => {
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const filtered = tasks
    .filter(t => t.assignedTo && t.assignedTo.toLowerCase() === (currentUser || '').toLowerCase())
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  const markClosed = async (task) => {
    try {
      const all = tasks.map(t => (t.id === task.id ? { ...t, status: 'cerrada', updatedAt: Date.now() } : t));
      // cancelar notificación existente
      if (task.notificationId) await cancelNotification(task.notificationId);
      await persistTasks(all);
    } catch (e) {
      console.warn('Error marcando cerrada', e);
    }
  };

  const postponeOneDay = async (task) => {
    try {
      const newDue = (task.dueAt || Date.now()) + 24 * 3600 * 1000; // +1 día
      const updatedTask = { ...task, dueAt: newDue, updatedAt: Date.now() };
      // cancelar notificación previa
      if (task.notificationId) await cancelNotification(task.notificationId);
      // reprogramar notificación 10 minutos antes
      const notifId = await scheduleNotificationForTask(updatedTask, { minutesBefore: 10 });
      if (notifId) updatedTask.notificationId = notifId;

      const all = tasks.map(t => (t.id === task.id ? updatedTask : t));
      await persistTasks(all);
    } catch (e) {
      console.warn('Error posponiendo tarea', e);
    }
  };

  const openDetail = (task) => navigation.navigate('TaskDetail', { task });
  const openChat = (task) => navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  const goToCreate = () => navigation.navigate('TaskDetail');

  const renderItem = ({ item }) => (
    <View style={{ marginBottom: 12 }}>
      <TaskItem task={item} onPress={() => openDetail(item)} />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => markClosed(item)}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#8B0000" style={{ marginRight: 6 }} />
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="mail" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Tus tareas pendientes</Text>
            </View>
            <Text style={styles.heading}>Mi Bandeja</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
            <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.addButtonGradient}>
              <Ionicons name="add" size={32} color="#8B0000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.userSection}>
        <View style={styles.userLabelContainer}>
          <Ionicons name="person-circle-outline" size={16} color="#8B0000" style={{ marginRight: 6 }} />
          <Text style={styles.userLabel}>USUARIO ACTUAL</Text>
        </View>
        <View style={styles.userRow}>
          <TextInput style={styles.input} value={editingUser} onChangeText={setEditingUser} placeholder="Tu nombre" placeholderTextColor="#C7C7CC" />
          <TouchableOpacity style={styles.saveBtn} onPress={saveUser}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.currentUser}>{currentUser || 'No configurado'}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={80} color="#AEAEB2" style={{ marginBottom: 20, opacity: 0.3 }} />
            <Text style={styles.emptyText}>Sin tareas</Text>
            <Text style={styles.emptySubtext}>No tienes tareas asignadas en este momento</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA'
  },
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
    color: '#8B0000',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  },
  userSection: {
    backgroundColor: '#FFFAF0',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  userLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  userLabel: {
    fontSize: 12,
    color: '#8B0000',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12
  },
  input: { 
    flex: 1, 
    padding: 14, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12,
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  saveBtn: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  currentUser: {
    marginTop: 12,
    fontSize: 15,
    color: '#6E6E73',
    fontWeight: '500'
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
    backgroundColor: '#FFFAF0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5DEB3',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  actionBtnPrimary: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 0.2
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.8
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500'
  }
});
