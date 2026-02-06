// screens/ReportScreen.js
// Reporte para reunión: tarjetas por área con contadores, lista de críticas (alta prioridad) y vencidas.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToTasks, deleteTask } from '../services/tasks';
import { exportTasksToCSV, exportStatsToCSV } from '../services/export';
import { calculateProductivityStreak, calculateAverageCompletionTime, formatAverageTime } from '../services/productivity';
import { getActivityHeatmap, getWeeklyProductivityChart, getEstimatedVsRealTime } from '../services/productivityAdvanced';
import { getFocusTimeStats } from '../services/pomodoro';
import { getCurrentSession } from '../services/authFirestore';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium } from '../utils/haptics';
import Toast from '../components/Toast';
import Heatmap from '../components/Heatmap';
import OverdueAlert from '../components/OverdueAlert';
import StatCard from '../components/StatCard';

const screenWidth = Dimensions.get('window').width;

const AREAS = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
const STATUSES = [
  { key: 'pendiente', label: 'Pendientes', color: '#FF9800', icon: 'hourglass' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196F3', icon: 'play-circle' },
  { key: 'en_revision', label: 'En revisión', color: '#9C27B0', icon: 'eye' },
  { key: 'cerrada', label: 'Cerradas', color: '#4CAF50', icon: 'checkmark-circle' }
];

export default function ReportScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [selectedModal, setSelectedModal] = useState(null); // 'estados', 'areas', null
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [productivity, setProductivity] = useState({ currentStreak: 0, longestStreak: 0, averageTime: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [estimatedVsReal, setEstimatedVsReal] = useState(null);
  const [pomodoroStats, setPomodoroStats] = useState(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(true);
  const [personalStats, setPersonalStats] = useState({
    completedToday: 0,
    completedWeek: 0,
    completedMonth: 0,
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
    onTimeRate: 0
  });

  // Suscribirse a cambios en tiempo real de Firebase
  useEffect(() => {
    let unsubscribe;
    
    subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    // Cargar sesión del usuario
    getCurrentSession().then(result => {
      if (result.success) {
        setCurrentUser(result.session);
        loadAdvancedMetrics(result.session.email);
      }
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  
  // Cargar métricas avanzadas
  const loadAdvancedMetrics = async (userEmail) => {
    setLoadingAdvanced(true);
    try {
      const [heatmap, weekly, estimated, pomodoro] = await Promise.all([
        getActivityHeatmap(userEmail, 90),
        getWeeklyProductivityChart(userEmail),
        getEstimatedVsRealTime(userEmail),
        getFocusTimeStats(userEmail, 30)
      ]);
      
      setHeatmapData(heatmap);
      setWeeklyData(weekly);
      setEstimatedVsReal(estimated);
      setPomodoroStats(pomodoro);
    } catch (error) {
      // Error silencioso
    } finally {
      setLoadingAdvanced(false);
    }
  };

  // Agrupar por área
  const groupByArea = () => {
    const groups = {};
    AREAS.forEach(area => {
      groups[area] = {
        pendiente: 0,
        en_proceso: 0,
        en_revision: 0,
        cerrada: 0,
        vencidas: 0,
        total: 0
      };
    });

    tasks.forEach(task => {
      const area = task.area || 'Administración';
      if (!groups[area]) groups[area] = { pendiente: 0, en_proceso: 0, en_revision: 0, cerrada: 0, vencidas: 0, total: 0 };
      
      const status = task.status || 'pendiente';
      groups[area][status]++;
      groups[area].total++;
      
      // Contar vencidas
      if (task.dueAt && task.dueAt < Date.now() && status !== 'cerrada') {
        groups[area].vencidas++;
      }
    });

    return groups;
  };

  // Tareas críticas (alta prioridad que no están cerradas)
  const getCriticalTasks = () => {
    return tasks.filter(t => 
      t.priority === 'alta' && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  };

  // Tareas vencidas (no cerradas y fecha pasada)
  const getOverdueTasks = () => {
    return tasks.filter(t => 
      t.dueAt && 
      t.dueAt < Date.now() && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  };

  const areaData = groupByArea();
  const criticalTasks = getCriticalTasks();
  const overdueTasks = getOverdueTasks();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Calcular estadísticas personales
  const calculatePersonalStats = () => {
    if (!currentUser || tasks.length === 0) return;

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Filtrar tareas del usuario actual
    const userTasks = tasks.filter(t => 
      t.assignedTo === currentUser.email || 
      currentUser.role === 'admin'
    );

    // Tareas completadas en períodos
    const completedToday = userTasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= todayStart
    ).length;
    
    const completedWeek = userTasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= weekAgo
    ).length;
    
    const completedMonth = userTasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= monthAgo
    ).length;

    // Calcular racha de días productivos
    const tasksByDay = {};
    userTasks
      .filter(t => t.status === 'cerrada' && t.completedAt)
      .forEach(task => {
        const date = new Date(task.completedAt);
        const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        if (!tasksByDay[dayKey]) tasksByDay[dayKey] = [];
        tasksByDay[dayKey].push(task);
      });
    
    const days = Object.keys(tasksByDay).sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    
    // Racha actual
    for (let i = 0; i < days.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedKey = `${expectedDate.getFullYear()}-${expectedDate.getMonth() + 1}-${expectedDate.getDate()}`;
      
      if (days[i] === expectedKey) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Racha más larga
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < days.length; i++) {
      const prevDay = new Date(days[i - 1]);
      const currentDay = new Date(days[i]);
      const diffDays = Math.floor((prevDay - currentDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    // Tasa de cumplimiento
    const completed = userTasks.filter(t => t.status === 'cerrada').length;
    const completionRate = userTasks.length > 0 
      ? (completed / userTasks.length * 100).toFixed(1) 
      : 0;

    // Tasa de cumplimiento a tiempo
    const completedOnTime = userTasks.filter(t => 
      t.status === 'cerrada' && 
      t.completedAt && 
      t.dueAt && 
      t.completedAt <= t.dueAt
    ).length;
    const onTimeRate = completed > 0 
      ? (completedOnTime / completed * 100).toFixed(1) 
      : 0;

    setPersonalStats({
      completedToday,
      completedWeek,
      completedMonth,
      currentStreak,
      longestStreak,
      completionRate: parseFloat(completionRate),
      onTimeRate: parseFloat(onTimeRate)
    });
  };

  // Actualizar estadísticas cuando cambien las tareas
  React.useEffect(() => {
    calculatePersonalStats();
  }, [tasks, currentUser]);

  // Data para gráfica de pie (estados)
  const statusChartData = STATUSES.map(status => ({
    name: status.label,
    count: tasks.filter(t => t.status === status.key).length,
    color: status.color,
    legendFontColor: '#1A1A1A',
    legendFontSize: 12
  })).filter(item => item.count > 0);

  // Data para gráfica de barras (áreas)
  const areaChartData = {
    labels: AREAS.map(a => a.substring(0, 8)),
    datasets: [{
      data: AREAS.map(area => areaData[area].total)
    }]
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#F8F9FA',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForLabels: {
      fontSize: 10
    }
  };

  const renderAreaCard = (area) => {
    const data = areaData[area];
    return (
      <View key={area} style={[styles.areaCard, { backgroundColor: theme.card }]}>
        {/* Area Header */}
        <View style={styles.areaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.areaTitle, { color: theme.text }]}>{area}</Text>
            <Text style={[styles.areaTotalBadge, { color: theme.primary }]}>
              {data.total} {data.total === 1 ? 'tarea' : 'tareas'}
            </Text>
          </View>
          <View style={[styles.totalBadgeCircle, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.totalBadgeNumber, { color: theme.primary }]}>{data.total}</Text>
          </View>
        </View>

        {/* Stats Grid with StatCard-like items */}
        <View style={styles.statsGrid}>
          {STATUSES.map(status => (
            <View key={status.key} style={styles.statItemContainer}>
              <View style={[styles.statCard, { 
                backgroundColor: status.color + '15',
                borderColor: status.color + '30',
              }]}>
                <View style={[styles.statBadge, { backgroundColor: status.color }]}>
                  <Ionicons name={status.icon} size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.statNumber, { color: theme.text }]}>{data[status.key]}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{status.label}</Text>
              </View>
            </View>
          ))}
          {data.vencidas > 0 && (
            <View style={styles.statItemContainer}>
              <View style={[styles.statCard, { 
                backgroundColor: '#EF4444' + '15',
                borderColor: '#EF4444' + '30',
              }]}>
                <View style={[styles.statBadge, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.statNumber, { color: theme.text }]}>{data.vencidas}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Vencidas</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTaskItem = (task) => {
    const handleDeleteTask = async () => {
      Alert.alert(
        'Eliminar Tarea',
        `¿Estás seguro de eliminar "${task.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTask(task.id);
                hapticMedium();
                setToastMessage('Tarea eliminada');
                setToastType('success');
                setToastVisible(true);
              } catch (error) {
                setToastMessage('Error al eliminar tarea');
                setToastType('error');
                setToastVisible(true);
              }
            }
          }
        ]
      );
    };

    return (
      <TouchableOpacity
        key={task.id}
        onPress={() => navigation.navigate('TaskDetail', { task })}
        style={styles.taskCard}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <View style={[
              styles.taskPriorityDot,
              task.priority === 'alta' && styles.taskPriorityHigh
            ]} />
            <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDeleteTask}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <View style={styles.taskMetaRow}>
          <Ionicons name="business-outline" size={14} color="#8E8E93" />
          <Text style={styles.taskMeta}>{task.area}</Text>
        </View>
        <View style={styles.taskMetaRow}>
          <Ionicons name="person-outline" size={14} color="#8E8E93" />
          <Text style={styles.taskMeta}>{task.assignedTo || 'Sin asignar'}</Text>
        </View>
        <View style={styles.taskMetaRow}>
          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
          <Text style={styles.taskDue}>Vence: {new Date(task.dueAt).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerGradient, { backgroundColor: isDark ? '#1A1A1A' : '#9F2241' }]}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="stats-chart" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Análisis y métricas</Text>
            </View>
            <Text style={styles.heading}>Reportes</Text>
          </View>
        </View>
      </View>

      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={tasks} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</Text>

        {/* ESTADÍSTICAS PERSONALES */}
        <View style={styles.personalStatsSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-circle" size={28} color="#9F2241" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.personalStatsTitle, { color: theme.text }]}>
                Mi Desempeño Personal
              </Text>
              <Text style={[styles.personalStatsSubtitle, { color: theme.textSecondary }]}>
                Estadísticas y progreso
              </Text>
            </View>
          </View>

          {/* Tarjetas de Estadísticas con StatCard */}
          <View style={styles.statsCardsGrid}>
            {/* Racha de días productivos */}
            <StatCard
              icon="flame"
              value={personalStats.currentStreak.toString()}
              label="Racha Actual"
              variant="warning"
              trend={{ direction: 'up', value: `Mejor: ${personalStats.longestStreak} días` }}
            />

            {/* Completadas Hoy */}
            <StatCard
              icon="checkmark-circle"
              value={personalStats.completedToday.toString()}
              label="Hoy"
              variant="success"
            />

            {/* Completadas Esta Semana */}
            <StatCard
              icon="calendar"
              value={personalStats.completedWeek.toString()}
              label="Esta Semana"
              variant="info"
            />

            {/* Completadas Este Mes */}
            <StatCard
              icon="bar-chart"
              value={personalStats.completedMonth.toString()}
              label="Este Mes"
              variant="info"
            />

            {/* Tasa de Completitud */}
            <View style={[styles.statCard, styles.statCardWide, { backgroundColor: theme.card }]}>
              <View style={styles.statCardWideContent}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(175, 82, 222, 0.15)' }]}>
                  <Ionicons name="pie-chart" size={28} color="#AF52DE" />
                </View>
                <View style={styles.statWideInfo}>
                  <Text style={[styles.statValue, { color: '#AF52DE' }]}>
                    {personalStats.completionRate}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>Tasa de Completitud</Text>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[styles.progressBarFill, { 
                        width: `${personalStats.completionRate}%`,
                        backgroundColor: '#AF52DE'
                      }]} 
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Cumplimiento a Tiempo */}
            <View style={[styles.statCard, styles.statCardWide, { backgroundColor: theme.card }]}>
              <View style={styles.statCardWideContent}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255, 45, 85, 0.15)' }]}>
                  <Ionicons name="timer" size={28} color="#FF2D55" />
                </View>
                <View style={styles.statWideInfo}>
                  <Text style={[styles.statValue, { color: '#FF2D55' }]}>
                    {personalStats.onTimeRate}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>Cumplimiento a Tiempo</Text>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[styles.progressBarFill, { 
                        width: `${personalStats.onTimeRate}%`,
                        backgroundColor: '#FF2D55'
                      }]} 
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Motivacional */}
          {personalStats.currentStreak >= 3 && (
            <View style={[styles.motivationalBanner, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
              <Text style={styles.motivationalText}>
                🎉 ¡Increíble! Llevas {personalStats.currentStreak} días seguidos siendo productivo
              </Text>
            </View>
          )}
        </View>

        {/* BENTO GRID - Dashboard de Métricas */}
        <View style={styles.bentoGrid}>
          {/* Fila 1: 3 bloques - Total, Vencidas, Críticas */}
          <View style={styles.bentoRow}>
            <TouchableOpacity style={[styles.bentoCard, styles.bentoThird]} activeOpacity={0.9}>
              <View style={[styles.bentoGradient, { backgroundColor: '#5856D6' }]}>
                <Ionicons name="document-text" size={28} color="#FFFFFF" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoNumber}>{tasks.length}</Text>
                <Text style={styles.bentoLabel}>Total</Text>
                <View style={styles.bentoSubMetrics}>
                  <Text style={styles.bentoSubMetricText}>
                    ✓ {tasks.filter(t => t.status === 'cerrada').length}
                  </Text>
                  <Text style={styles.bentoSubMetricText}>
                    ⏱ {tasks.filter(t => t.status !== 'cerrada').length}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoCard, styles.bentoThird]} activeOpacity={0.9}>
              <View style={[styles.bentoGradient, { backgroundColor: '#9F2241' }]}>
                <Ionicons name="alert-circle" size={28} color="#FFFFFF" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoNumber}>{overdueTasks.length}</Text>
                <Text style={styles.bentoLabel}>Vencidas</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoCard, styles.bentoThird]} activeOpacity={0.9}>
              <View style={[styles.bentoGradient, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="warning" size={28} color="#FFFFFF" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoNumber}>{criticalTasks.length}</Text>
                <Text style={styles.bentoLabel}>Críticas</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Fila 2: Gráfico de estado (táctil para abrir modal) + Productividad */}
          <View style={styles.bentoRow}>
            <TouchableOpacity 
              style={[styles.bentoCard, styles.bentoHalf]} 
              activeOpacity={0.9}
              onPress={() => setSelectedModal('estados')}
            >
              <View style={styles.bentoContentPadding}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="pie-chart" size={20} color={theme.text} />
                  <Text style={[styles.bentoTitle, { flex: 1, marginLeft: 8 }]}>Por Estado</Text>
                  <Ionicons name="expand" size={16} color={theme.textSecondary} />
                </View>
                <View style={styles.statusBarsCompact}>
                  {STATUSES.slice(0, 3).map(status => {
                    const count = tasks.filter(t => t.status === status.key).length;
                    return (
                      <View key={status.key} style={styles.statusItemCompact}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={styles.statusCountCompact}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.bentoHint}>Toca para detalles</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoCard, styles.bentoHalf]} activeOpacity={0.9}>
              <View style={[styles.bentoGradient, { backgroundColor: '#34C759' }]}>
                <Ionicons name="trending-up" size={24} color="#FFFFFF" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoNumber}>
                  {tasks.length > 0 
                    ? Math.round((tasks.filter(t => t.status === 'cerrada').length / tasks.length) * 100)
                    : 0}%
                </Text>
                <Text style={styles.bentoLabel}>Completitud</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Fila 3: Top áreas (táctil para abrir modal) */}
          <View style={styles.bentoRow}>
            <TouchableOpacity 
              style={[styles.bentoCard, styles.bentoWide]}
              activeOpacity={0.9}
              onPress={() => setSelectedModal('areas')}
            >
              <View style={styles.bentoContentPadding}>
                <View style={styles.bentoHeaderRow}>
                  <Ionicons name="business" size={20} color={theme.text} />
                  <Text style={[styles.bentoTitle, { flex: 1, marginLeft: 8 }]}>Top Áreas</Text>
                  <Ionicons name="expand" size={16} color={theme.textSecondary} />
                </View>
                <View style={styles.topAreasCompact}>
                  {AREAS.slice(0, 3).map(area => {
                    const data = areaData[area];
                    return (
                      <View key={area} style={styles.topAreaItemCompact}>
                        <Text style={styles.topAreaNameCompact} numberOfLines={1}>{area}</Text>
                        <View style={styles.topAreaBadgeCompact}>
                          <Text style={styles.topAreaTotalCompact}>{data.total}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.bentoHint}>Toca para ver todos</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjetas por área */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por Área</Text>
          {AREAS.map(renderAreaCard)}
        </View>

        {/* Tareas críticas */}
        {criticalTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="warning" size={24} color="#9F2241" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Tareas Críticas (Alta Prioridad)</Text>
            </View>
            {criticalTasks.map(renderTaskItem)}
          </View>
        )}

        {/* Tareas vencidas */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="alert-circle" size={24} color="#9F2241" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Tareas Vencidas</Text>
            </View>
            {overdueTasks.map(renderTaskItem)}
          </View>
        )}

        {/* Gráfico de Tendencia Semanal */}
        {personalStats.completedWeek > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="analytics" size={24} color="#5856D6" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tendencia de Completitud</Text>
            </View>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: ['Hoy', 'Semana', 'Mes'],
                  datasets: [{
                    data: [
                      personalStats.completedToday || 1,
                      personalStats.completedWeek || 1,
                      personalStats.completedMonth || 1
                    ]
                  }]
                }}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(88, 86, 214, ${opacity})`,
                  labelColor: (opacity = 1) => theme.text,
                  style: {
                    borderRadius: 16
                  },
                  propsForLabels: {
                    fontSize: 12,
                    fontWeight: '600'
                  }
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                fromZero={true}
              />
            </View>
          </View>
        )}

        {/* Heatmap de Actividad */}
        {!loadingAdvanced && heatmapData.length > 0 && (
          <View style={styles.section}>
            <Heatmap 
              data={heatmapData}
              onDayPress={(day) => {
                if (day.count > 0) {
                  setToastMessage(`${day.date}: ${day.count} tarea${day.count > 1 ? 's' : ''} completada${day.count > 1 ? 's' : ''}`);
                  setToastType('info');
                  setToastVisible(true);
                }
              }}
            />
          </View>
        )}
        
        {/* Productividad Semanal */}
        {!loadingAdvanced && weeklyData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="trending-up" size={24} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Productividad Semanal</Text>
            </View>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: weeklyData.slice(-8).map(w => `S${w.week.split('-W')[1]}`),
                  datasets: [
                    {
                      data: weeklyData.slice(-8).map(w => w.tasksCompleted),
                      color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
                      strokeWidth: 3
                    },
                    {
                      data: weeklyData.slice(-8).map(w => w.tasksCreated),
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      strokeWidth: 2
                    }
                  ],
                  legend: ['Completadas', 'Creadas']
                }}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  decimalPlaces: 0,
                  color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.7})` : `rgba(0, 0, 0, ${opacity * 0.7})`,
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  backgroundGradientFrom: isDark ? '#1A1A1A' : '#FFFFFF',
                  backgroundGradientTo: isDark ? '#262626' : '#F8F9FA',
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}
        
        {/* Estadísticas de Pomodoro */}
        {!loadingAdvanced && pomodoroStats && pomodoroStats.totalSessions > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="timer" size={24} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Focus Time</Text>
            </View>
            <View style={styles.pomodoroStatsGrid}>
              <View style={[styles.pomodoroStatCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="timer-outline" size={32} color="#EF4444" />
                <Text style={[styles.pomodoroStatValue, { color: theme.text }]}>
                  {pomodoroStats.totalSessions}
                </Text>
                <Text style={[styles.pomodoroStatLabel, { color: theme.textSecondary }]}>
                  Sesiones
                </Text>
              </View>
              <View style={[styles.pomodoroStatCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="time-outline" size={32} color="#10B981" />
                <Text style={[styles.pomodoroStatValue, { color: theme.text }]}>
                  {Math.round(pomodoroStats.totalFocusTime / 60 * 10) / 10}h
                </Text>
                <Text style={[styles.pomodoroStatLabel, { color: theme.textSecondary }]}>
                  Focus Time
                </Text>
              </View>
              <View style={[styles.pomodoroStatCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#3B82F6" />
                <Text style={[styles.pomodoroStatValue, { color: theme.text }]}>
                  {pomodoroStats.completionRate}%
                </Text>
                <Text style={[styles.pomodoroStatLabel, { color: theme.textSecondary }]}>
                  Completadas
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Tiempo Estimado vs Real */}
        {!loadingAdvanced && estimatedVsReal && estimatedVsReal.totalTasks > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="speedometer" size={24} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Precisión de Estimaciones</Text>
            </View>
            <View style={[styles.estimationCard, { backgroundColor: theme.surface }]}>
              <View style={styles.estimationRow}>
                <View style={styles.estimationItem}>
                  <Text style={[styles.estimationLabel, { color: theme.textSecondary }]}>
                    Promedio Estimado
                  </Text>
                  <Text style={[styles.estimationValue, { color: theme.text }]}>
                    {estimatedVsReal.avgEstimated}h
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color={theme.textSecondary} />
                <View style={styles.estimationItem}>
                  <Text style={[styles.estimationLabel, { color: theme.textSecondary }]}>
                    Promedio Real
                  </Text>
                  <Text style={[styles.estimationValue, { color: theme.text }]}>
                    {estimatedVsReal.avgReal}h
                  </Text>
                </View>
              </View>
              <View style={styles.accuracyBar}>
                <View 
                  style={[
                    styles.accuracyFill, 
                    { 
                      width: `${estimatedVsReal.accuracy}%`,
                      backgroundColor: estimatedVsReal.accuracy >= 80 ? '#10B981' : estimatedVsReal.accuracy >= 60 ? '#F59E0B' : '#EF4444'
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.accuracyText, { color: theme.text }]}>
                Precisión: {estimatedVsReal.accuracy}%
              </Text>
              <Text style={[styles.accuracySubtext, { color: theme.textSecondary }]}>
                Basado en {estimatedVsReal.totalTasks} tarea{estimatedVsReal.totalTasks > 1 ? 's' : ''} completada{estimatedVsReal.totalTasks > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Estados */}
      <Modal
        visible={selectedModal === 'estados'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Distribución por Estado</Text>
              <TouchableOpacity onPress={() => setSelectedModal(null)}>
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Gráfica de Pie */}
            {statusChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <PieChart
                  data={statusChartData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}

            <View style={styles.statusBars}>
              {STATUSES.map(status => {
                const count = tasks.filter(t => t.status === status.key).length;
                const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                return (
                  <View key={status.key} style={styles.statusBarContainer}>
                    <View style={styles.statusBarLabel}>
                      <Ionicons name={status.icon} size={16} color={status.color} />
                      <Text style={styles.statusBarText}>{status.label}</Text>
                    </View>
                    <View style={styles.statusBarTrack}>
                      <View 
                        style={[
                          styles.statusBarFill, 
                          { width: `${percentage}%`, backgroundColor: status.color }
                        ]} 
                      />
                    </View>
                    <Text style={styles.statusBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Áreas */}
      <Modal
        visible={selectedModal === 'areas'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Todas las Áreas</Text>
              <TouchableOpacity onPress={() => setSelectedModal(null)}>
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Gráfica de Barras */}
            <View style={styles.chartContainer}>
              <BarChart
                data={areaChartData}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                fromZero
                showBarTops={false}
                showValuesOnTopOfBars
              />
            </View>

            <ScrollView>
              {AREAS.map(area => {
                const data = areaData[area];
                return (
                  <View key={area} style={styles.modalAreaCard}>
                    <View style={styles.modalAreaHeader}>
                      <Text style={styles.modalAreaName}>{area}</Text>
                      <Text style={styles.modalAreaTotal}>{data.total}</Text>
                    </View>
                    <View style={styles.modalAreaStats}>
                      <View style={styles.modalAreaStatItem}>
                        <Ionicons name="hourglass" size={14} color="#FF9800" />
                        <Text style={styles.modalAreaStatText}>{data.pendiente} Pendientes</Text>
                      </View>
                      <View style={styles.modalAreaStatItem}>
                        <Ionicons name="play-circle" size={14} color="#2196F3" />
                        <Text style={styles.modalAreaStatText}>{data.en_proceso} En proceso</Text>
                      </View>
                      <View style={styles.modalAreaStatItem}>
                        <Ionicons name="eye" size={14} color="#9C27B0" />
                        <Text style={styles.modalAreaStatText}>{data.en_revision} En revisión</Text>
                      </View>
                      <View style={styles.modalAreaStatItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.modalAreaStatText}>{data.cerrada} Cerradas</Text>
                      </View>
                      {data.vencidas > 0 && (
                        <View style={styles.modalAreaStatItem}>
                          <Ionicons name="alert-circle" size={14} color="#9F2241" />
                          <Text style={[styles.modalAreaStatText, { color: '#9F2241', fontWeight: '700' }]}>
                            {data.vencidas} Vencidas
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  header: { 
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20
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
  scrollContent: {
    padding: 12
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6E6E73', 
    fontWeight: '500',
    marginBottom: 24,
    letterSpacing: 0.2
  },
  // Estilos de Estadísticas Personales
  personalStatsSection: {
    marginBottom: 28,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 34, 65, 0.05)'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  personalStatsTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  personalStatsSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2
  },
  statsCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statCard: {
    width: '48%',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5
  },
  statCardWide: {
    width: '100%',
    alignItems: 'stretch'
  },
  statCardWideContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statWideInfo: {
    flex: 1,
    marginLeft: 16
  },
  statIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  statEmoji: {
    fontSize: 36
  },
  statValue: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: 6
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center'
  },
  statSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.65,
    textAlign: 'center'
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  motivationalBanner: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8
  },
  motivationalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9500',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  section: { marginBottom: 20 },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: -0.4
  },
  summaryRow: { flexDirection: 'row', gap: 14 },
  summaryCard: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 14, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  summaryNumber: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: '#fff', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  areaCard: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  },
  areaTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 4
  },
  areaTotalBadge: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2
  },
  totalBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  totalBadgeNumber: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12
  },
  statItemContainer: {
    width: '22%',
    minWidth: 80
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center'
  },
  statBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  taskCard: { 
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderLeftWidth: 3, 
    borderLeftColor: '#9F2241',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3'
  },
  taskHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10 
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    marginLeft: 8
  },
  taskPriorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    marginTop: 4
  },
  taskPriorityHigh: {
    backgroundColor: '#9F2241'
  },
  taskTitle: { fontSize: 17, fontWeight: '700', flex: 1, color: theme.text, letterSpacing: -0.3 },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  taskMeta: { fontSize: 14, color: '#6E6E73', fontWeight: '500' },
  taskDue: { fontSize: 14, color: '#8E8E93', fontWeight: '500', letterSpacing: 0.2 },
  // Bento Grid Styles
  bentoGrid: {
    gap: 12,
    marginBottom: 20
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  bentoColumn: {
    gap: 12,
    flex: 1
  },
  bentoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  bentoThird: {
    flex: 1,
    minHeight: 160
  },
  bentoHalf: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3',
    minHeight: 140
  },
  bentoWide: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3',
    minHeight: 120
  },
  bentoContentPadding: {
    padding: 18
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  bentoGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between'
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  bentoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? theme.text : '#1A1A1A',
    letterSpacing: 0.3
  },
  bentoHugeNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    marginVertical: 8
  },
  bentoNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  bentoSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.2
  },
  bentoSubMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  bentoSubMetricText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoHint: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center'
  },
  statusBarsCompact: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-around',
    marginVertical: 12
  },
  statusItemCompact: {
    alignItems: 'center',
    gap: 6
  },
  statusCountCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text
  },
  topAreasCompact: {
    gap: 10,
    marginVertical: 12
  },
  topAreaItemCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0'
  },
  topAreaNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    flex: 1
  },
  topAreaBadgeCompact: {
    backgroundColor: '#9F2241',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center'
  },
  topAreaTotalCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  bentoLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoFooter: {
    gap: 8
  },
  bentoMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  bentoMetricText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },
  statusBars: {
    marginTop: 16,
    gap: 14
  },
  statusBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110
  },
  statusBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  statusBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden'
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 5
  },
  statusBarCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    width: 30,
    textAlign: 'right'
  },
  topAreasContainer: {
    marginTop: 16,
    gap: 12
  },
  topAreaItem: {
    gap: 8
  },
  topAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topAreaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1
  },
  topAreaTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#9F2241'
  },
  topAreaStats: {
    flexDirection: 'row',
    gap: 6
  },
  topAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  topAreaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  // Modal Styles
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
    maxHeight: '75%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0'
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.5
  },
  modalAreaCard: {
    backgroundColor: '#FFFAF0',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  modalAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modalAreaName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1
  },
  modalAreaTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#9F2241'
  },
  modalAreaStats: {
    gap: 8
  },
  modalAreaStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalAreaStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6E73'
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  pomodoroStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  pomodoroStatCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  pomodoroStatValue: {
    fontSize: 28,
    fontWeight: '800'
  },
  pomodoroStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  estimationCard: {
    padding: 24,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  estimationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  estimationItem: {
    flex: 1,
    alignItems: 'center'
  },
  estimationLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  estimationValue: {
    fontSize: 32,
    fontWeight: '800'
  },
  accuracyBar: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 6
  },
  accuracyText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4
  },
  accuracySubtext: {
    fontSize: 13,
    textAlign: 'center'
  }
});
