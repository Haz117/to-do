// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Usa botones para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada
// NOTA: Drag-and-drop requiere un build personalizado (Expo Dev Client), por ahora usa botones.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import FilterBar from '../components/FilterBar';
import { loadTasks, saveTasks } from '../storage';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#FF9800', icon: 'hourglass-outline' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196F3', icon: 'play-circle-outline' },
  { key: 'en_revision', label: 'En revisión', color: '#9C27B0', icon: 'eye-outline' },
  { key: 'cerrada', label: 'Cerrada', color: '#4CAF50', icon: 'checkmark-circle-outline' }
];

export default function KanbanScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const t = await loadTasks();
    setTasks(t || []);
  };

  const persistTasks = async (newTasks) => {
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const changeStatus = (taskId, newStatus) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t));
    persistTasks(updated);
  };

  const openDetail = (task) => navigation.navigate('TaskDetail', { task });

  // Aplicar filtros
  const applyFilters = (taskList) => {
    return taskList.filter(task => {
      if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      if (filters.area && task.area !== filters.area) return false;
      if (filters.responsible && task.assignedTo !== filters.responsible) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.overdue && task.dueAt >= Date.now()) return false;
      return true;
    });
  };

  const renderColumn = (status) => {
    const byStatus = tasks.filter(t => (t.status || 'pendiente') === status.key);
    const filtered = applyFilters(byStatus);

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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetail(item)}
              style={styles.card}
            >
              <View style={styles.cardPriorityIndicator}>
                <View style={[
                  styles.priorityDot,
                  item.priority === 'alta' && styles.priorityDotHigh,
                  item.priority === 'media' && styles.priorityDotMedium,
                  item.priority === 'baja' && styles.priorityDotLow
                ]} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.cardMetaRow}>
                <Ionicons name="person-outline" size={14} color="#8E8E93" />
                <Text style={styles.cardMeta}>{item.assignedTo || 'Sin asignar'}</Text>
              </View>
              <View style={styles.cardMetaRow}>
                <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                <Text style={styles.cardDue}>{new Date(item.dueAt).toLocaleDateString()}</Text>
              </View>

              {/* Botones rápidos para cambiar estado */}
              <View style={styles.actionsRow}>
                {STATUSES.filter(s => s.key !== status.key).slice(0, 2).map(s => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => changeStatus(item.id, s.key)}
                    style={[styles.miniBtn, { borderColor: s.color }]}
                  >
                    <Ionicons name={s.icon} size={14} color={s.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      </View>
    );
  };

  return (
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {STATUSES.map(renderColumn)}
      </ScrollView>
    </View>
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
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.2
  },
  columnCount: { 
    fontSize: 13, 
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 28
  },
  columnCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  card: { 
    margin: 12, 
    padding: 14, 
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
    fontWeight: '700', 
    marginBottom: 10, 
    color: '#1A1A1A',
    letterSpacing: -0.3,
    paddingRight: 20
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6
  },
  cardMeta: { 
    fontSize: 14, 
    color: '#6E6E73', 
    fontWeight: '500'
  },
  cardDue: { 
    fontSize: 13, 
    color: '#8E8E93',
    fontWeight: '500'
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
  }
});
