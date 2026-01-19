// screens/HomeScreen.SIMPLE.js - Versión simplificada para debugging
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTasks } from '../services/tasks';

export default function HomeScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('🏠 HomeScreen montado', { isDark, tasksCount: tasks.length });

  useEffect(() => {
    console.log('📡 Suscribiendo a tareas...');
    let unsubscribe;
    
    subscribeToTasks((updatedTasks) => {
      console.log('📦 Tareas recibidas:', updatedTasks.length);
      setTasks(updatedTasks);
      setLoading(false);
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch(err => {
      console.error('❌ Error al suscribir:', err);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.text, { color: theme.text }]}>Cargando tareas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View>
          <Text style={styles.greeting}>Hola!</Text>
          <Text style={styles.title}>Mis Tareas</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
          <Ionicons 
            name={isDark ? 'sunny' : 'moon'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      {/* Contador */}
      <View style={styles.counter}>
        <Text style={[styles.counterText, { color: theme.text }]}>
          Total: {tasks.length} tareas
        </Text>
      </View>

      {/* Lista de tareas */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.taskCard, { 
              backgroundColor: theme.card,
              borderColor: theme.borderLight
            }]}
            onPress={() => navigation?.navigate('TaskDetail', { task: item })}
          >
            <View style={styles.taskHeader}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[
                styles.priorityBadge, 
                { backgroundColor: getPriorityColor(item.priority) }
              ]}>
                <Text style={styles.priorityText}>
                  {item.priority?.toUpperCase() || 'NORMAL'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.taskArea, { color: theme.textSecondary }]}>
              {item.area || 'Sin área'}
            </Text>
            
            <View style={styles.taskFooter}>
              <Text style={[styles.taskAssigned, { color: theme.textSecondary }]}>
                {item.assignedTo || 'Sin asignar'}
              </Text>
              <Text style={[styles.taskStatus, { 
                color: item.status === 'cerrada' ? theme.success : theme.warning 
              }]}>
                {item.status || 'pendiente'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No hay tareas
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Crea una nueva tarea con el botón +
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation?.navigate('TaskDetail')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'alta': return '#FF3B30';
    case 'media': return '#FF9500';
    case 'baja': return '#34C759';
    default: return '#8E8E93';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  themeButton: {
    padding: 8,
  },
  counter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  taskCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskArea: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskAssigned: {
    fontSize: 12,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
