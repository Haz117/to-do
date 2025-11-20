// screens/HomeScreen.js
// Lista simple de tareas, añade tareas de ejemplo y persiste con AsyncStorage.
// Usa navigation para ir a detalle y chat.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import FilterBar from '../components/FilterBar';
import { saveTasks } from '../storage';
import { subscribeToTasks, deleteTask as deleteTaskFirebase, updateTask } from '../services/tasks';
import * as Notifications from 'expo-notifications';

export default function HomeScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });

  // Suscribirse a cambios en tiempo real de Firebase
  useEffect(() => {
    const unsubscribe = subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
    });

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
  }, []);

  // Navegar a pantalla para crear nueva tarea
  const goToCreate = () => navigation.navigate('TaskDetail');

  const openDetail = (task) => {
    navigation.navigate('TaskDetail', { task });
  };

  const openChat = (task) => {
    navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
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
            // La actualización del estado se hace automáticamente por el listener
          }
        }
      ]
    );
  };

  const toggleComplete = async (task) => {
    const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
    await updateTask(task.id, { status: newStatus });
    // La actualización del estado se hace automáticamente por el listener
  };

  // Aplicar filtros
  const filteredTasks = tasks.filter(task => {
    // Búsqueda por título
    if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    // Filtro por área
    if (filters.area && task.area !== filters.area) return false;
    // Filtro por responsable
    if (filters.responsible && task.assignedTo !== filters.responsible) return false;
    // Filtro por prioridad
    if (filters.priority && task.priority !== filters.priority) return false;
    // Filtro por vencidas
    if (filters.overdue && task.dueAt >= Date.now()) return false;
    return true;
  });

  // Estadísticas Bento
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B0000', '#6B0000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Hola!</Text>
            </View>
            <Text style={styles.heading}>Mis Tareas</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
            <LinearGradient
              colors={['#FFFFFF', '#FFF8DC']}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={36} color="#DAA520" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FilterBar onFilterChange={setFilters} />

      <FlatList
        data={filteredTasks}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.bentoGrid}>
            {/* Fila 1: Bloque grande (Hoy) + Bloque mediano (Vencidas) */}
            <View style={styles.bentoRow}>
              <TouchableOpacity style={[styles.bentoCard, styles.bentoLarge]} activeOpacity={0.9}>
                <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.bentoGradient}>
                  <View style={styles.bentoIconCircle}>
                    <Ionicons name="calendar" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.bentoContent}>
                    <Text style={styles.bentoTitleLarge}>Hoy</Text>
                    <Text style={styles.bentoNumberLarge}>{todayTasks.length}</Text>
                    <Text style={styles.bentoSubtext}>tareas para hoy</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoCard, styles.bentoMedium]} activeOpacity={0.9}>
                <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.bentoGradient}>
                  <View style={styles.bentoIconCircle}>
                    <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.bentoContent}>
                    <Text style={styles.bentoTitleSmall}>Vencidas</Text>
                    <Text style={styles.bentoNumberMedium}>{overdueTasks.length}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Fila 2: 3 bloques pequeños (Total, Prioritarias, Mis tareas) */}
            <View style={styles.bentoRow}>
              <TouchableOpacity style={[styles.bentoCard, styles.bentoSmall]} activeOpacity={0.9}>
                <LinearGradient colors={['#34C759', '#28A745']} style={styles.bentoGradientSmall}>
                  <View style={styles.bentoIconCircleSmall}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.bentoNumberSmall}>{filteredTasks.length}</Text>
                  <Text style={styles.bentoLabel}>Total</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoCard, styles.bentoSmall]} activeOpacity={0.9}>
                <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.bentoGradientSmall}>
                  <View style={styles.bentoIconCircleSmall}>
                    <Ionicons name="flame" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.bentoNumberSmall}>{highPriorityTasks.length}</Text>
                  <Text style={styles.bentoLabel}>Urgentes</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoCard, styles.bentoSmall]} activeOpacity={0.9}>
                <LinearGradient colors={['#5856D6', '#4842C2']} style={styles.bentoGradientSmall}>
                  <View style={styles.bentoIconCircleSmall}>
                    <Ionicons name="person" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.bentoNumberSmall}>{myTasks.length}</Text>
                  <Text style={styles.bentoLabel}>Asignadas</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Fila 3: Bloque ancho para áreas principales */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoCard, styles.bentoWide]}>
                <View style={styles.bentoHeader}>
                  <Ionicons name="business" size={20} color="#1A1A1A" />
                  <Text style={[styles.bentoTitle, { color: '#1A1A1A' }]}>Áreas Principales</Text>
                </View>
                <View style={styles.areasContainer}>
                  {topAreas.map(([area, count], index) => (
                    <View key={area} style={styles.areaTag}>
                      <Text style={styles.areaName}>{area}</Text>
                      <View style={styles.areaBadge}>
                        <Text style={styles.areaCount}>{count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Todas las Tareas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskItem 
            task={item} 
            onPress={() => openDetail(item)}
            onDelete={() => deleteTask(item.id)}
            onToggleComplete={() => toggleComplete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#C7C7CC" style={{ marginBottom: 20 }} />
            <Text style={styles.emptyText}>Sin tareas pendientes</Text>
            <Text style={styles.emptySubtext}>Toca el botón + para crear una nueva tarea</Text>
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
    backgroundColor: '#FFFAF0',
    borderWidth: 2.5,
    borderColor: '#F5DEB3',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  bentoTitleSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  bentoNumberLarge: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  bentoNumberMedium: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  bentoNumberSmall: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  bentoSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    letterSpacing: 0.3
  },
  bentoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: '#F5DEB3',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  areaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3
  },
  areaBadge: {
    backgroundColor: '#8B0000',
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
    color: '#1A1A1A',
    letterSpacing: -0.8,
    marginBottom: 16,
    marginTop: 12
  }
});
