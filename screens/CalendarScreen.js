// screens/CalendarScreen.js
// Vista de calendario mensual con tareas por día - GLASSMORPHISM UI
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Platform, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import SpringCard from '../components/SpringCard';
import FadeInView from '../components/FadeInView';
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import AnimatedBadge from '../components/AnimatedBadge';
import RippleButton from '../components/RippleButton';
import { subscribeToTasks } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import Toast from '../components/Toast';
import OverdueAlert from '../components/OverdueAlert';
import { getCurrentSession } from '../services/authFirestore';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [currentUser, setCurrentUser] = useState(null);
  const [monthDirection, setMonthDirection] = useState(0); // -1 prev, 1 next
  
  // Animaciones de entrada mejoradas
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const calendarSlide = useRef(new Animated.Value(100)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const monthTransition = useRef(new Animated.Value(0)).current;
  const legendSlide = useRef(new Animated.Value(50)).current;
  const legendOpacity = useRef(new Animated.Value(0)).current;

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    // Cargar usuario actual
    getCurrentSession().then(result => {
      if (result.success) {
        setCurrentUser(result.session);
      }
    });
  }, []);
  
  // Animar elementos de entrada con stagger effect
  useEffect(() => {
    Animated.stagger(100, [
      // Header con spring suave
      Animated.parallel([
        Animated.spring(headerSlide, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Calendario con efecto de bounce
      Animated.parallel([
        Animated.spring(calendarSlide, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(calendarOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Leyenda con slide up
      Animated.parallel([
        Animated.spring(legendSlide, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(legendOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // FAB con retraso y bounce
    Animated.spring(fabScale, {
      toValue: 1,
      delay: 600,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Animación de transición de mes
  const animateMonthChange = useCallback((direction) => {
    setMonthDirection(direction);
    monthTransition.setValue(direction * 30);
    Animated.spring(monthTransition, {
      toValue: 0,
      friction: 12,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [monthTransition]);

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
    animateMonthChange(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate, animateMonthChange]);

  const nextMonth = useCallback(() => {
    animateMonthChange(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate, animateMonthChange]);

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
    hapticMedium(); // Haptic feedback when modal opens ✨
  };

  const renderDay = (date, index) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayTasks = getTasksForDate(date);
    const hasHighPriority = dayTasks.some(t => t.priority === 'alta');
    const hasMediumPriority = dayTasks.some(t => t.priority === 'media');
    const isOverdue = dayTasks.some(t => t.dueAt < Date.now() && t.status !== 'cerrada');
    const today = isToday(date);
    const hasTasks = dayTasks.length > 0;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
      <FadeInView 
        key={date.toISOString()} 
        duration={350} 
        delay={Math.min(index * 20, 350)}
        style={styles.dayWrapper}
      >
        <SpringCard
          style={[
            styles.day,
            today && styles.dayToday,
            hasTasks && !today && styles.dayWithTasks,
            hasHighPriority && !today && styles.dayHighPriority,
            isOverdue && !today && styles.dayOverdue,
            isWeekend && !today && !hasTasks && styles.dayWeekend,
          ]}
          onPress={() => {
            if (hasTasks) {
              hapticLight();
              openDayDetail(date);
            } else {
              setToastMessage('No hay tareas para este día');
              setToastType('info');
              setToastVisible(true);
            }
          }}
          scaleDown={isDesktop ? 0.96 : 0.92}
          springConfig={{ tension: isDesktop ? 300 : 350, friction: 15 }}
        >
          {/* Círculo de fondo para día actual */}
          {today && <View style={styles.todayCircle} />}
          
          <View style={styles.dayContent}>
            <Text style={[
              styles.dayNumber,
              { color: theme.text },
              isWeekend && !today && styles.dayNumberWeekend,
              today && styles.dayNumberToday,
              (hasHighPriority || isOverdue) && !today && styles.dayNumberAlert,
              hasMediumPriority && !hasHighPriority && !isOverdue && !today && styles.dayNumberWarning,
            ]}>
              {date.getDate()}
            </Text>
            
            {hasTasks && (
              <View style={styles.taskIndicators}>
                {dayTasks.slice(0, 3).map((task, idx) => (
                  <View
                    key={task.id}
                    style={[
                      styles.taskDot,
                      task.priority === 'alta' && styles.taskDotHigh,
                      task.priority === 'media' && styles.taskDotMedium,
                      task.priority === 'baja' && styles.taskDotLow,
                      today && styles.taskDotToday,
                    ]}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <View style={[styles.moreTasksBadge, today && styles.moreTasksBadgeToday]}>
                    <Text style={[styles.moreTasks, today && { color: theme.primary }]}>
                      +{dayTasks.length - 3}
                    </Text>
                  </View>
                )}
                {/* Indicador pulsante para urgentes */}
                {hasHighPriority && !today && <PulsingDot size={8} color="#EF4444" />}
              </View>
            )}
          </View>
        </SpringCard>
      </FadeInView>
    );
  };

  const renderTaskItem = (task, index) => (
    <FadeInView duration={350} delay={index * 80} style={{ marginBottom: 12 }}>
      <RippleButton
        key={task.id}
        style={[
          styles.modalTaskCard, 
          { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.glass,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.borderLight,
          }
        ]}
        onPress={() => {
          hapticLight();
          setModalVisible(false);
          navigation.navigate('TaskDetail', { task });
        }}
        rippleColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
      >
        <View style={styles.modalTaskHeader}>
          <View style={[
            styles.modalTaskPriority,
            task.priority === 'alta' && styles.modalTaskPriorityHigh,
            task.priority === 'media' && styles.modalTaskPriorityMedium,
            task.priority === 'baja' && styles.modalTaskPriorityLow
          ]} />
          <View style={styles.modalTaskContent}>
            <Text style={[styles.modalTaskTitle, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
            
            <View style={styles.modalTaskMeta}>
              <View style={styles.modalTaskMetaItem}>
                <Ionicons name="business-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.area}</Text>
              </View>
              <View style={styles.modalTaskMetaItem}>
                <Ionicons name="person-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.assignedTo || 'Sin asignar'}</Text>
              </View>
              <View style={styles.modalTaskMetaItem}>
                <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>
                  {new Date(task.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.modalTaskFooter}>
          <View style={[
            styles.modalTaskStatus,
            task.status === 'cerrada' && styles.modalTaskStatusClosed,
            task.status === 'en_proceso' && styles.modalTaskStatusInProgress,
            task.status === 'en_revision' && styles.modalTaskStatusReview,
          ]}>
            <Text style={[
              styles.modalTaskStatusText,
              task.status === 'cerrada' && { color: '#10B981' },
              task.status === 'en_proceso' && { color: '#3B82F6' },
              task.status === 'en_revision' && { color: '#8B5CF6' },
            ]}>
              {task.status === 'en_proceso' ? 'En proceso' : 
               task.status === 'en_revision' ? 'En revisión' : 
               task.status === 'cerrada' ? 'Completada' : 'Pendiente'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </View>
      </RippleButton>
    </FadeInView>
  );

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);
  
  // Estilos animados mejorados con glassmorphism
  const headerAnimatedStyle = {
    transform: [{ translateY: headerSlide }],
    opacity: headerOpacity,
  };
  
  const calendarAnimatedStyle = {
    opacity: calendarOpacity,
    transform: [
      { translateY: calendarSlide },
      { translateX: monthTransition },
    ],
  };
  
  const legendAnimatedStyle = {
    transform: [{ translateY: legendSlide }],
    opacity: legendOpacity,
  };
  
  const fabAnimatedStyle = {
    transform: [{ scale: fabScale }],
    opacity: fabScale,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Header con gradiente mejorado */}
      <Animated.View style={[styles.headerGradient, headerAnimatedStyle]}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradientInner}
        >
          <View style={styles.header}>
            <View>
              <View style={styles.greetingContainer}>
                <View style={styles.iconBadge}>
                  <Ionicons name="calendar" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.greeting}>Vista mensual</Text>
              </View>
              <Text style={styles.heading}>Calendario</Text>
            </View>
            <RippleButton 
              style={styles.todayButton}
              onPress={() => {
                hapticMedium();
                animateMonthChange(0);
                setCurrentDate(new Date());
                setToastMessage('✨ ¡Vista actualizada a hoy!');
                setToastType('success');
                setToastVisible(true);
                hapticSuccess();
              }}
              rippleColor="rgba(255,255,255,0.3)"
            >
              <Ionicons name="today-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.todayButtonText}>HOY</Text>
            </RippleButton>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={tasks} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Controles de mes con glassmorphism */}
        <Animated.View style={[styles.monthControlsWrapper, calendarAnimatedStyle]}>
          <View style={[styles.monthControls, { backgroundColor: theme.glass }]}>
            <TouchableOpacity 
              onPress={() => {
                hapticLight();
                previousMonth();
              }} 
              style={[styles.monthButton, { backgroundColor: isDark ? 'rgba(159, 34, 65, 0.9)' : '#9F2241' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.monthDisplay}>
              <Text style={[styles.monthText, { color: theme.text }]}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => {
                hapticLight();
                nextMonth();
              }} 
              style={[styles.monthButton, { backgroundColor: isDark ? 'rgba(159, 34, 65, 0.9)' : '#9F2241' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Calendario con glassmorphism */}
        <Animated.View style={[styles.calendarContainer, calendarAnimatedStyle, { backgroundColor: theme.glass }]}>
          {/* Encabezado de días */}
          <View style={styles.weekHeader}>
            {DAYS.map((day, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <View key={day} style={styles.weekDay}>
                  <Text style={[
                    styles.weekDayText, 
                    isWeekend && styles.weekDayWeekend
                  ]}>{day}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid de calendario */}
          <View style={styles.calendar}>
            {calendarDays.map((date, index) => renderDay(date, index))}
          </View>
        </Animated.View>

        {/* Leyenda con glassmorphism */}
        <Animated.View style={[styles.legend, legendAnimatedStyle, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
          <View style={styles.legendHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.legendTitle, { color: theme.text }]}>Leyenda de prioridades</Text>
          </View>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotHigh]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Alta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotMedium]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotLow]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Baja</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de tareas del día con BlurView */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          hapticLight();
          setModalVisible(false);
        }}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 50 : 100} style={styles.modalBlurOverlay} tint={isDark ? 'dark' : 'light'}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => {
              hapticLight();
              setModalVisible(false);
            }}
          />
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalDateBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.modalDateDay, { color: theme.primary }]}>
                    {selectedDate?.getDate()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', month: 'long' })}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'tarea programada' : 'tareas programadas'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  hapticLight();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDateTasks.map((task, index) => renderTaskItem(task, index))}
            </ScrollView>
          </Animated.View>
        </BlurView>
      </Modal>
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
    width: '100%',
    maxWidth: isDesktop ? 900 : '100%'
  },
  // Header con glassmorphism
  headerGradient: {
    overflow: 'hidden',
  },
  headerGradientInner: {
    borderBottomLeftRadius: RADIUS.xl + 4,
    borderBottomRightRadius: RADIUS.xl + 4,
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 52,
    paddingBottom: SPACING.xl
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heading: { 
    fontSize: isDesktop ? 36 : Platform.OS === 'android' ? 32 : 30, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isDesktop ? 18 : 14,
    paddingVertical: isDesktop ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: isDesktop ? 24 : isTablet ? 16 : 14,
    paddingBottom: isDesktop ? 48 : 40,
  },
  // Month controls con glassmorphism premium
  monthControlsWrapper: {
    marginBottom: SPACING.xl,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isDesktop ? 12 : 8,
    paddingVertical: isDesktop ? 12 : 10,
    borderRadius: isDesktop ? 24 : 20,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#9F2241',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.35 : 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  monthButton: {
    width: isDesktop ? 56 : isTablet ? 50 : 48,
    height: isDesktop ? 56 : isTablet ? 50 : 48,
    borderRadius: isDesktop ? 18 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#9F2241',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  monthText: {
    fontSize: isDesktop ? 26 : isTablet ? 24 : 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  // Calendario principal con glassmorphism premium
  calendarContainer: {
    borderRadius: isDesktop ? 28 : 24,
    padding: isDesktop ? 24 : isTablet ? 20 : 16,
    marginBottom: SPACING.xl,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#9F2241',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: isDark ? 0.4 : 0.15,
        shadowRadius: 28,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: isDesktop ? 20 : 16,
    paddingVertical: isDesktop ? 14 : 12,
    paddingHorizontal: isDesktop ? 8 : 4,
    borderRadius: isDesktop ? 16 : 12,
    backgroundColor: isDark ? 'rgba(159,34,65,0.15)' : 'rgba(159,34,65,0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(159,34,65,0.3)' : 'rgba(159,34,65,0.15)',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekDayText: {
    fontSize: isDesktop ? 13 : 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: isDark ? 'rgba(255,255,255,0.9)' : '#9F2241',
  },
  weekDayWeekend: {
    color: isDark ? 'rgba(159,34,65,0.9)' : 'rgba(159,34,65,0.7)',
    fontWeight: '600',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayWrapper: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: isDesktop ? 3 : 2,
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: isDesktop ? 3 : 2,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: isDesktop ? 18 : 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
  },
  dayWithTasks: {
    backgroundColor: isDark ? 'rgba(159,34,65,0.15)' : 'rgba(159,34,65,0.06)',
    borderColor: isDark ? 'rgba(159,34,65,0.4)' : 'rgba(159,34,65,0.2)',
    borderWidth: 1.5,
  },
  dayWeekend: {
    backgroundColor: isDark ? 'rgba(159,34,65,0.08)' : 'rgba(159,34,65,0.03)',
  },
  dayToday: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  todayCircle: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dayHighPriority: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  dayOverdue: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isDesktop ? 8 : 6,
    zIndex: 1,
  },
  dayNumber: {
    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  dayNumberWeekend: {
    color: theme.primary,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
  },
  dayNumberAlert: {
    color: '#EF4444',
    fontWeight: '800',
  },
  dayNumberWarning: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  taskIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isDesktop ? 5 : 4,
    marginTop: isDesktop ? 6 : 4,
    minHeight: isDesktop ? 14 : 12,
  },
  taskDot: {
    width: isDesktop ? 10 : 8,
    height: isDesktop ? 10 : 8,
    borderRadius: isDesktop ? 5 : 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  taskDotHigh: {
    backgroundColor: '#EF4444',
  },
  taskDotMedium: {
    backgroundColor: '#F59E0B',
  },
  taskDotLow: {
    backgroundColor: '#22C55E',
  },
  taskDotToday: {
    borderColor: 'rgba(255,255,255,0.95)',
    width: isDesktop ? 12 : 10,
    height: isDesktop ? 12 : 10,
  },
  moreTasksBadge: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  moreTasksBadgeToday: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  moreTasks: {
    fontSize: isDesktop ? 11 : 10,
    fontWeight: '800',
    color: theme.textSecondary,
  },
  // Leyenda con glassmorphism premium
  legend: {
    marginTop: SPACING.md,
    padding: isDesktop ? 24 : 20,
    borderRadius: isDesktop ? 20 : 16,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#9F2241',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159,34,65,0.08)',
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  legendText: {
    fontSize: 14,
    fontWeight: '700',
    fontWeight: '600',
  },
  // Modal con glassmorphism
  modalBlurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl + 8,
    borderTopRightRadius: RADIUS.xl + 8,
    padding: isDesktop ? 28 : 22,
    paddingBottom: isDesktop ? 40 : 34,
    maxHeight: '85%',
    ...SHADOWS.xl,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  modalDateBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDateDay: {
    fontSize: 24,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: isDesktop ? 18 : 17,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 450,
  },
  // Modal Task Cards con glassmorphism
  modalTaskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  modalTaskHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  modalTaskPriority: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#34C759',
    alignSelf: 'stretch',
  },
  modalTaskPriorityHigh: {
    backgroundColor: '#EF4444',
  },
  modalTaskPriorityMedium: {
    backgroundColor: '#F97316',
  },
  modalTaskPriorityLow: {
    backgroundColor: '#22C55E',
  },
  modalTaskContent: {
    flex: 1,
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 10,
  },
  modalTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalTaskMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  modalTaskStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.2)' : 'rgba(159, 34, 65, 0.1)',
  },
  modalTaskStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9F2241',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTaskStatusClosed: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  modalTaskStatusInProgress: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
  },
  modalTaskStatusReview: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
  },
});
