// screens/CalendarScreen.js
// Vista de calendario mensual con tareas por día
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import SpringCard from '../components/SpringCard';
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import AnimatedBadge from '../components/AnimatedBadge';
import { subscribeToTasks } from '../services/tasks';
import { hapticLight } from '../utils/feedback';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Suscribirse a cambios en tiempo real
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

  // Generar días del mes con memoización para mejor rendimiento
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Agrupar tareas por fecha con memoización
  const tasksByDate = useMemo(() => {
    const grouped = {};
    
    tasks.forEach(task => {
      if (task.dueAt) {
        const date = new Date(task.dueAt);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDate[dateKey] || [];
  };

  const previousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate]);

  const nextMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate]);

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const openDayDetail = (date) => {
    hapticLight(); // Light haptic on date selection
    setSelectedDate(date);
    setModalVisible(true);
  };

  const renderDay = (date, index) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayTasks = getTasksForDate(date);
    const hasHighPriority = dayTasks.some(t => t.priority === 'alta');
    const isOverdue = dayTasks.some(t => t.dueAt < Date.now() && t.status !== 'cerrada');
    const today = isToday(date);

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.day,
          today && styles.dayToday,
          hasHighPriority && styles.dayHighPriority,
          isOverdue && styles.dayOverdue
        ]}
        onPress={() => dayTasks.length > 0 && openDayDetail(date)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dayNumber,
          today && styles.dayNumberToday,
          (hasHighPriority || isOverdue) && styles.dayNumberActive
        ]}>
          {date.getDate()}
        </Text>
        
        {dayTasks.length > 0 && (
          <View style={styles.taskIndicators}>
            {dayTasks.slice(0, 3).map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.taskDot,
                  task.priority === 'alta' && styles.taskDotHigh,
                  task.priority === 'media' && styles.taskDotMedium,
                  task.priority === 'baja' && styles.taskDotLow
                ]}
              />
            ))}
            {dayTasks.length > 3 && (
              <Text style={styles.moreTasks}>+{dayTasks.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTaskItem = (task) => (
    <TouchableOpacity
      key={task.id}
      style={styles.modalTaskCard}
      onPress={() => {
        setModalVisible(false);
        navigation.navigate('TaskDetail', { task });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.modalTaskHeader}>
        <View style={[
          styles.modalTaskPriority,
          task.priority === 'alta' && styles.modalTaskPriorityHigh,
          task.priority === 'media' && styles.modalTaskPriorityMedium,
          task.priority === 'baja' && styles.modalTaskPriorityLow
        ]} />
        <Text style={styles.modalTaskTitle} numberOfLines={2}>{task.title}</Text>
      </View>
      
      <View style={styles.modalTaskMeta}>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="business-outline" size={14} color="#6E6E73" />
          <Text style={styles.modalTaskMetaText}>{task.area}</Text>
        </View>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="person-outline" size={14} color="#6E6E73" />
          <Text style={styles.modalTaskMetaText}>{task.assignedTo || 'Sin asignar'}</Text>
        </View>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="time-outline" size={14} color="#6E6E73" />
          <Text style={styles.modalTaskMetaText}>
            {new Date(task.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
      <View style={styles.modalTaskStatus}>
        <Text style={[
          styles.modalTaskStatusText,
          task.status === 'cerrada' && styles.modalTaskStatusClosed
        ]}>
          {task.status === 'en_proceso' ? 'En proceso' : 
           task.status === 'en_revision' ? 'En revisión' : 
           task.status === 'cerrada' ? 'Cerrada' : 'Pendiente'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Vista mensual</Text>
            </View>
            <Text style={styles.heading}>Calendario</Text>
          </View>
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={() => setCurrentDate(new Date())}
          >
            <Text style={styles.todayButtonText}>HOY</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Controles de mes */}
        <View style={styles.monthControls}>
          <TouchableOpacity onPress={previousMonth} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color="#8B0000" />
          </TouchableOpacity>
          
          <View style={styles.monthDisplay}>
            <Text style={styles.monthText}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
          </View>
          
          <TouchableOpacity onPress={nextMonth} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color="#8B0000" />
          </TouchableOpacity>
        </View>

        {/* Encabezado de días */}
        <View style={styles.weekHeader}>
          {DAYS.map(day => (
            <View key={day} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Grid de calendario */}
        <View style={styles.calendar}>
          {calendarDays.map((date, index) => renderDay(date, index))}
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Leyenda:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotHigh]} />
              <Text style={styles.legendText}>Alta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotMedium]} />
              <Text style={styles.legendText}>Media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotLow]} />
              <Text style={styles.legendText}>Baja</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de tareas del día */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'tarea' : 'tareas'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedDateTasks.map(renderTaskItem)}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  todayButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFAF0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5DEB3'
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center'
  },
  monthText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.4
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#FFFAF0',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B0000',
    letterSpacing: 0.3
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4
  },
  dayToday: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    margin: 2
  },
  dayHighPriority: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    margin: 2
  },
  dayOverdue: {
    backgroundColor: '#FFE4E1',
    borderRadius: 12,
    margin: 2
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4
  },
  dayNumberToday: {
    color: '#FFFFFF'
  },
  dayNumberActive: {
    color: '#8B0000',
    fontWeight: '900'
  },
  taskIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34C759'
  },
  taskDotHigh: {
    backgroundColor: '#FF3B30'
  },
  taskDotMedium: {
    backgroundColor: '#FF9500'
  },
  taskDotLow: {
    backgroundColor: '#34C759'
  },
  moreTasks: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8E8E93',
    marginLeft: 2
  },
  legend: {
    marginTop: 24,
    backgroundColor: '#FFFAF0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: 0.3
  },
  legendItems: {
    flexDirection: 'row',
    gap: 20
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    textTransform: 'capitalize',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93'
  },
  modalScroll: {
    maxHeight: 500
  },
  modalTaskCard: {
    backgroundColor: '#FFFAF0',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F5DEB3',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  modalTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10
  },
  modalTaskPriority: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#34C759'
  },
  modalTaskPriorityHigh: {
    backgroundColor: '#FF3B30'
  },
  modalTaskPriorityMedium: {
    backgroundColor: '#FF9500'
  },
  modalTaskPriorityLow: {
    backgroundColor: '#34C759'
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 22
  },
  modalTaskMeta: {
    gap: 8,
    marginBottom: 12
  },
  modalTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  modalTaskMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73'
  },
  modalTaskStatus: {
    alignSelf: 'flex-start'
  },
  modalTaskStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B0000',
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  modalTaskStatusClosed: {
    color: '#34C759',
    backgroundColor: '#E8F5E9'
  }
});
