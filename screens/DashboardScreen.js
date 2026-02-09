// screens/DashboardScreen.js
// Dashboard con métricas estilo Kanban mejorado
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, FlatList, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentSession } from '../services/authFirestore';
import { getGeneralMetrics, getTrendData, getAreaStats, getTopPerformers, formatCompletionTime } from '../services/analytics';
import { subscribeToTasks } from '../services/tasks';
import { exportTasksToCSV, exportStatsToCSV } from '../services/export';
import { calculateProductivityStreak, calculateAverageCompletionTime, formatAverageTime } from '../services/productivity';
import { getActivityHeatmap, getWeeklyProductivityChart, getEstimatedVsRealTime } from '../services/productivityAdvanced';
import { getFocusTimeStats } from '../services/pomodoro';
import { hapticMedium } from '../utils/haptics';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import StateStatusCards from '../components/StateStatusCards';
import StatColumn from '../components/StatColumn';
import MetricCard from '../components/MetricCard';
import Heatmap from '../components/Heatmap';
import OverdueAlert from '../components/OverdueAlert';
import Toast from '../components/Toast';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, MAX_WIDTHS } from '../theme/tokens';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width: screenWidth, isDesktop, isTablet, columns, padding } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [areaStats, setAreaStats] = useState({});
  const [performers, setPerformers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  // Estados adicionales del Report
  const [tasks, setTasks] = useState([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [isExporting, setIsExporting] = useState(false);
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

  const AREAS = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];

  useEffect(() => {
    loadAllData();
    // Suscribirse a tareas en tiempo real
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

  const loadAllData = useCallback(async () => {
    try {
      const session = await getCurrentSession();
      if (session.success) {
        setCurrentUser(session.session);
        
        const [metricsRes, trendRes, areasRes, performersRes] = await Promise.all([
          getGeneralMetrics(session.session.userId, session.session.role),
          getTrendData(session.session.userId, session.session.role),
          session.session.role === 'admin' ? getAreaStats() : Promise.resolve({ success: true, areas: {} }),
          session.session.role === 'admin' ? getTopPerformers() : Promise.resolve({ success: true, performers: [] }),
        ]);

        if (metricsRes.success) setMetrics(metricsRes.metrics);
        if (trendRes.success) setTrendData(trendRes.data);
        if (areasRes.success) setAreaStats(areasRes.areas);
        if (performersRes.success) setPerformers(performersRes.performers);

        // Cargar métricas avanzadas
        loadAdvancedMetrics(session.session.email);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      console.error('Error cargando métricas avanzadas:', error);
    } finally {
      setLoadingAdvanced(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    hapticMedium();
    loadAllData();
  }, []);

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
      
      if (task.dueAt && task.dueAt < Date.now() && status !== 'cerrada') {
        groups[area].vencidas++;
      }
    });

    return groups;
  };

  // Tareas críticas
  const getCriticalTasks = () => {
    return tasks.filter(t => 
      t.priority === 'alta' && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  };

  // Tareas por prioridad
  const getPriorityStats = () => {
    const stats = { alta: 0, media: 0, baja: 0 };
    tasks.forEach(task => {
      const priority = task.priority || 'media';
      stats[priority]++;
    });
    return stats;
  };

  // Estadísticas de cumplimiento
  const getComplianceStats = () => {
    const now = Date.now();
    let onTime = 0;
    let Late = 0;
    let completedTasks = tasks.filter(t => t.status === 'cerrada');
    
    completedTasks.forEach(task => {
      if (task.dueAt && task.completedAt) {
        if (task.completedAt <= task.dueAt) {
          onTime++;
        } else {
          Late++;
        }
      }
    });
    
    const total = onTime + Late;
    return {
      onTime,
      Late,
      onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
      total
    };
  };

  // Próximos vencimientos
  const getUpcomingDeadlines = () => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    
    return tasks
      .filter(t => 
        t.dueAt && 
        t.dueAt > now && 
        t.dueAt <= now + week && 
        t.status !== 'cerrada'
      )
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0))
      .slice(0, 5);
  };

  // Tareas vencidas
  const getOverdueTasks = () => {
    const result = tasks.filter(t => 
      t.dueAt && 
      t.dueAt < Date.now() && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
    
    console.log('[DashboardScreen] getOverdueTasks:', {
      totalTareas: tasks.length,
      tareasVencidas: result.length,
      rol: currentUser?.role,
      email: currentUser?.email
    });
    
    return result;
  };

  // Exportar datos
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportStatsToCSV(metrics, trendData);
      if (result.success) {
        setToastMessage('Datos exportados correctamente');
        setToastType('success');
      } else {
        setToastMessage('Error al exportar datos');
        setToastType('error');
      }
    } catch (error) {
      setToastMessage('Error al exportar');
      setToastType('error');
    } finally {
      setIsExporting(false);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    }
  };

  const isDesktopLarge = screenWidth >= 1440;
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, isDesktopLarge, screenWidth, padding, columns), [theme, isDark, isDesktop, isTablet, isDesktopLarge, screenWidth, padding, columns]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LoadingIndicator type="spinner" color={theme.primary} size={14} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="stats-chart-outline"
          title="Sin datos"
          message="No hay suficiente información para mostrar estadísticas"
        />
      </View>
    );
  }

  // Datos para gráfica de dona (distribución de estados)
  const statusPieData = [
    { name: 'Completadas', population: metrics.completed, color: '#10B981', legendFontColor: theme.text },
    { name: 'En Proceso', population: metrics.inProgress, color: '#3B82F6', legendFontColor: theme.text },
    { name: 'Pendientes', population: metrics.pending, color: '#F59E0B', legendFontColor: theme.text },
    { name: 'En Revisión', population: metrics.inReview, color: '#8B5CF6', legendFontColor: theme.text },
  ].filter(item => item.population > 0);

  // Datos para gráfica de línea (tendencia)
  const lineData = {
    labels: trendData.slice(-7).map(d => d.label),
    datasets: [
      {
        data: trendData.slice(-7).map(d => d.created),
        color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: trendData.slice(-7).map(d => d.completed),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Creadas', 'Completadas'],
  };

  // Datos para gráfica de barras (por prioridad)
  const priorityBarData = {
    labels: ['Alta', 'Media', 'Baja'],
    datasets: [{
      data: [
        metrics.byPriority.alta,
        metrics.byPriority.media,
        metrics.byPriority.baja,
      ],
    }],
  };

  const periodData = metrics.periods[selectedPeriod];

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingContainer}>
                <Ionicons name="bar-chart" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.95 }} />
                <Text style={styles.greeting}>Análisis y Métricas</Text>
              </View>
              <Text style={styles.heading}>Dashboard + Reportes</Text>
            </View>
            <TouchableOpacity 
              style={[styles.exportButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* LAYOUT KANBAN - Columnas de Estados */}
        <View style={styles.kanbanContainer}>
          <View style={styles.sectionHeaderContainer}>
            <View style={[styles.sectionIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="layers-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                Estado de Tareas
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Vista general de progreso
              </Text>
            </View>
          </View>

          {isDesktop ? (
            // Desktop: 4 columnas en 1 fila
            <View style={styles.kanbanColumns}>
              {/* Columna Pendientes */}
              <View style={styles.columnWrapper}>
                <StatColumn
                  icon="alert-circle"
                  title="Pendientes"
                  count={metrics.pending}
                  headerColor="#F59E0B"
                  items={[
                    { label: 'Total', value: metrics.pending.toString() },
                    { 
                      label: 'Vencidas', 
                      value: metrics.overdue?.toString() || '0',
                      subtitle: 'Requieren atención'
                    },
                  ]}
                />
              </View>

              {/* Columna En Proceso */}
              <View style={styles.columnWrapper}>
                <StatColumn
                  icon="play-circle"
                  title="En Proceso"
                  count={metrics.inProgress}
                  headerColor="#3B82F6"
                  items={[
                    { label: 'Activas', value: metrics.inProgress.toString() },
                    { 
                      label: 'Progreso', 
                      value: '50%',
                      subtitle: 'Promedio'
                    },
                  ]}
                />
              </View>

              {/* Columna En Revisión */}
              <View style={styles.columnWrapper}>
                <StatColumn
                  icon="eye-outline"
                  title="En Revisión"
                  count={metrics.inReview}
                  headerColor="#8B5CF6"
                  items={[
                    { label: 'Esperando', value: metrics.inReview.toString() },
                    { 
                      label: 'Tiempo promedio', 
                      value: '2 días',
                      subtitle: 'En revisión'
                    },
                  ]}
                />
              </View>

              {/* Columna Completadas */}
              <View style={styles.columnWrapper}>
                <StatColumn
                  icon="checkmark-done-sharp"
                  title="Completadas"
                  count={metrics.completed}
                  headerColor="#10B981"
                  items={[
                    { label: 'Terminadas', value: metrics.completed.toString() },
                    { 
                      label: 'Tasa', 
                      value: `${metrics.completionRate}%`,
                      subtitle: 'De completitud'
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            // Mobile/Tablet: 2 filas de 2 columnas
            <>
              <View style={styles.kanbanRow}>
                <View style={styles.columnWrapperMobile}>
                  <StatColumn
                    icon="alert-circle"
                    title="Pendientes"
                    count={metrics.pending}
                    headerColor="#F59E0B"
                    items={[
                      { label: 'Total', value: metrics.pending.toString() },
                      { 
                        label: 'Vencidas', 
                        value: metrics.overdue?.toString() || '0',
                        subtitle: 'Requieren atención'
                      },
                    ]}
                  />
                </View>

                <View style={styles.columnWrapperMobile}>
                  <StatColumn
                    icon="play-circle"
                    title="En Proceso"
                    count={metrics.inProgress}
                    headerColor="#3B82F6"
                    items={[
                      { label: 'Activas', value: metrics.inProgress.toString() },
                      { 
                        label: 'Progreso', 
                        value: '50%',
                        subtitle: 'Promedio'
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.kanbanRow}>
                <View style={styles.columnWrapperMobile}>
                  <StatColumn
                    icon="eye-outline"
                    title="En Revisión"
                    count={metrics.inReview}
                    headerColor="#8B5CF6"
                    items={[
                      { label: 'Esperando', value: metrics.inReview.toString() },
                      { 
                        label: 'Tiempo promedio', 
                        value: '2 días',
                        subtitle: 'En revisión'
                      },
                    ]}
                  />
                </View>

                <View style={styles.columnWrapperMobile}>
                  <StatColumn
                    icon="checkmark-done-sharp"
                    title="Completadas"
                    count={metrics.completed}
                    headerColor="#10B981"
                    items={[
                      { label: 'Terminadas', value: metrics.completed.toString() },
                      { 
                        label: 'Tasa', 
                        value: `${metrics.completionRate}%`,
                        subtitle: 'De completitud'
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Sección de Tareas Críticas y Vencidas */}
        {(getCriticalTasks().length > 0 || getOverdueTasks().length > 0) && (
          <View style={[styles.alertSection, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: theme.border }]}>
            <View style={styles.sectionHeaderContainer}>
              <View style={[styles.sectionIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                Atención Requerida
              </Text>
            </View>
            
            {getOverdueTasks().length > 0 && (
              <OverdueAlert 
                tasks={getOverdueTasks().slice(0, 10)} 
                currentUserEmail={currentUser?.email || ''}
                role={currentUser?.role || 'operativo'}
              />
            )}
          </View>
        )}

        {/* Resumen del periodo - Mejorado */}
        <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="bar-chart" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                Resumen del {selectedPeriod === 'today' ? 'Día' : selectedPeriod === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.summaryValue, { color: theme.primary }]}>{periodData.created}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Creadas</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{periodData.completed}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>{metrics.weeklyProductivity}%</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Productividad</Text>
            </View>
          </View>
        </View>

        {/* Gráfica de tendencia */}
        {trendData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="trending-up" size={20} color={theme.text} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>Tendencia (últimos 7 días)</Text>
            </View>
            <LineChart
              data={lineData}
              width={screenWidth - 32}
              height={200}
              chartConfig={{
                backgroundColor: theme.background,
                backgroundGradientFrom: theme.background,
                backgroundGradientTo: theme.background,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
                labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: theme.primary },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Distribución por estado */}
        {/* Gráficas de Estados */}
        {statusPieData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart" size={20} color={theme.text} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>Distribución por Estado</Text>
            </View>
            <PieChart
              data={statusPieData}
              width={screenWidth - 32}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </View>
        )}

        {/* Top performers (solo admin) */}
        {currentUser?.role === 'admin' && performers.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="trophy" size={20} color={theme.text} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>Mejores Desempeños</Text>
            </View>
            {performers.slice(0, 5).map((performer, index) => (
              <View key={performer.userId} style={[styles.performerRow, index < 4 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.performerRank, { 
                    backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.border
                  }]}>
                    <Text style={[styles.performerRankText, { color: index < 3 ? '#000' : theme.text }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.performerName, { color: theme.text }]}>{performer.name}</Text>
                    <Text style={[styles.performerStats, { color: theme.textSecondary }]}>
                      {performer.completedThisWeek} tareas • {performer.onTimeRate}% a tiempo
                    </Text>
                  </View>
                </View>
                <View style={[styles.performerBadge, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.performerBadgeText, { color: '#10B981' }]}>
                    {performer.completionRate}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Información de Áreas (Admin) */}
        {currentUser?.role === 'admin' && (
          <>
            {console.log('[DashboardScreen] Renderizando "Tareas por Área" - Admin detectado')}
            <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="layers" size={20} color={theme.text} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>Tareas por Área</Text>
            </View>
            <View style={styles.areaGridContainer}>
              {AREAS.map((area) => {
                const stats = areaStats[area] || { total: 0, completed: 0, pending: 0 };
                const areaColors = {
                  'Jurídica': '#8B5CF6',
                  'Obras': '#F59E0B',
                  'Tesorería': '#10B981',
                  'Administración': '#3B82F6',
                  'Recursos Humanos': '#EC4899'
                };
                const color = areaColors[area] || '#9F2241';
                const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                return (
                  <TouchableOpacity 
                    key={area} 
                    style={[
                      styles.areaGridCard,
                      { 
                        backgroundColor: isDark ? `${color}12` : `${color}08`,
                        borderColor: isDark ? `${color}40` : `${color}25`,
                        borderWidth: 1.5,
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Color indicator dot */}
                    <View style={[styles.areaColorDot, { backgroundColor: color }]} />
                    
                    {/* Título del área */}
                    <Text style={[styles.areaGridCardTitle, { color: theme.text }]}>
                      {area}
                    </Text>

                    {/* Stats row con progreso visual */}
                    <View style={styles.areaGridStats}>
                      <View style={styles.areaGridStatItem}>
                        <Text style={[styles.areaGridStatValue, { color }]}>
                          {stats.total}
                        </Text>
                        <Text style={[styles.areaGridStatLabel, { color: theme.textSecondary }]}>
                          Total
                        </Text>
                      </View>
                      
                      <View style={[styles.gridDivider, { backgroundColor: `${color}25` }]} />
                      
                      <View style={styles.areaGridStatItem}>
                        <Text style={[styles.areaGridStatValue, { color: '#10B981' }]}>
                          {stats.completed}
                        </Text>
                        <Text style={[styles.areaGridStatLabel, { color: theme.textSecondary }]}>
                          Hechas
                        </Text>
                      </View>

                      <View style={[styles.gridDivider, { backgroundColor: `${color}25` }]} />

                      <View style={styles.areaGridStatItem}>
                        <Text style={[styles.areaGridStatValue, { color: '#FF9500' }]}>
                          {completionRate}%
                        </Text>
                        <Text style={[styles.areaGridStatLabel, { color: theme.textSecondary }]}>
                          Progreso
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={[
                      styles.progressBar,
                      { backgroundColor: isDark ? `${color}20` : `${color}12` }
                    ]}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${completionRate}%`,
                            backgroundColor: color
                          }
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
            </>
        )}

        {/* Heatmap de Actividad */}
        {!loadingAdvanced && heatmapData.length > 0 && (
          <>
            {console.log('[DashboardScreen] Renderizando Heatmap', { dataLength: heatmapData.length, loading: loadingAdvanced })}
            <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
              <View style={styles.chartHeader}>
                <Ionicons name="calendar" size={20} color={theme.text} />
                <Text style={[styles.chartTitle, { color: theme.text }]}>Actividad (Últimos 90 días)</Text>
              </View>
              <Heatmap data={heatmapData} />
            </View>
            </>
        )}

        {/* Estadísticas Pomodoro */}
        {pomodoroStats && (
          <>
            {console.log('[DashboardScreen] Renderizando Pomodoro', { stats: pomodoroStats })}
            <View style={[styles.chartCard, { backgroundColor: theme.background }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="timer" size={20} color={theme.text} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>Tiempo de Enfoque (Últimos 30 días)</Text>
            </View>
            <View style={styles.pomodoroStats}>
              <View style={styles.pomodoroItem}>
                <Text style={[styles.pomodoroValue, { color: theme.primary }]}>
                  {pomodoroStats.totalSessions}
                </Text>
                <Text style={[styles.pomodoroLabel, { color: theme.textSecondary }]}>Sesiones</Text>
              </View>
              <View style={styles.pomodoroItem}>
                <Text style={[styles.pomodoroValue, { color: '#10B981' }]}>
                  {pomodoroStats.totalMinutes}m
                </Text>
                <Text style={[styles.pomodoroLabel, { color: theme.textSecondary }]}>Minutos</Text>
              </View>
              <View style={styles.pomodoroItem}>
                <Text style={[styles.pomodoroValue, { color: '#8B5CF6' }]}>
                  {pomodoroStats.averageSessionLength}m
                </Text>
                <Text style={[styles.pomodoroLabel, { color: theme.textSecondary }]}>Promedio</Text>
              </View>
            </View>
          </View>
            </>
        )}
      </ScrollView>
      </View>

      {/* Toast de Exportación */}
      {toastVisible && (
        <Toast 
          message={toastMessage}
          type={toastType}
          visible={toastVisible}
          onDismiss={() => setToastVisible(false)}
        />
      )}
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, isDesktopLarge, screenWidth, padding, columns) => {
  const isWebDesktop = Platform.OS === 'web' && isDesktop;
  const responsiveHeaderPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const responsiveContentPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const contentMaxWidth = isWebDesktop ? 1120 : screenWidth;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center', // Centrar en web
    },
    contentWrapper: {
      flex: 1,
      width: contentMaxWidth,
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: theme.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    headerGradient: {
      paddingHorizontal: responsiveHeaderPadding,
      paddingTop: isTablet ? 48 : 40,
      paddingBottom: isTablet ? 24 : 20,
      borderBottomLeftRadius: isDesktop ? 32 : 20,
      borderBottomRightRadius: isDesktop ? 32 : 20,
      shadowColor: '#9F2241',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 14,
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    greetingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    greeting: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      opacity: 0.95,
      letterSpacing: 0.3,
    },
    heading: { 
      fontSize: isDesktop ? 44 : 40, 
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -2.2,
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: responsiveContentPadding,
      paddingTop: 20,
      paddingBottom: 80,
    },
    sectionHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isDesktop ? 32 : 24,
      paddingHorizontal: 0,
      paddingVertical: isDesktop ? 16 : 12,
    },
    sectionIconBadge: {
      width: isDesktop ? 64 : 56,
      height: isDesktop ? 64 : 56,
      borderRadius: isDesktop ? 18 : 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isDesktop ? 18 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionLabel: {
      fontSize: isDesktop ? 22 : 20,
      fontWeight: '900',
      marginBottom: 4,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sectionSubtitle: {
      fontSize: isDesktop ? 15 : 14,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    quickMetricsSection: {
      marginBottom: isDesktop ? 32 : 24,
    },
    quickMetricsScroll: {
      marginHorizontal: -responsiveContentPadding,
      paddingHorizontal: responsiveContentPadding,
    },
    metricsCardsRow: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : 10,
      paddingRight: responsiveContentPadding,
    },
    metricsContainer: {
      marginBottom: isDesktop ? 32 : 24,
    },
    metricsGrid: {
      gap: isDesktop ? 16 : 12,
    },
    metricsGridRow: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : 12,
      justifyContent: 'space-between',
    },
    metricCardLarge: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: isDesktop ? 24 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    metricCircle: {
      width: isDesktop ? 72 : 64,
      height: isDesktop ? 72 : 64,
      borderRadius: isDesktop ? 36 : 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    metricNumberLarge: {
      fontSize: isDesktop ? 44 : 40,
      fontWeight: '900',
      marginBottom: 6,
      letterSpacing: -1,
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    metricLabelLarge: {
      fontSize: isDesktop ? 16 : 14,
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metricPercentLarge: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: '700',
      marginTop: 4,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : 10,
      marginBottom: isDesktop ? 32 : 24,
      borderRadius: 10,
      overflow: 'visible',
      paddingHorizontal: 0,
    },
    periodButton: {
      flex: 1,
      paddingVertical: isDesktop ? 16 : 14,
      paddingHorizontal: isDesktop ? 18 : 14,
      alignItems: 'center',
      borderWidth: 2.5,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    periodButtonText: {
      fontSize: isDesktop ? 16 : 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    summaryCard: {
      padding: isDesktop ? 32 : 24,
      borderRadius: 20,
      marginBottom: isDesktop ? 32 : 24,
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
    summaryValue: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '800',
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: isDesktop ? 15 : 13,
      fontWeight: '500',
    },
    chartCard: {
      padding: isDesktop ? 28 : 22,
      borderRadius: 20,
      marginBottom: isDesktop ? 32 : 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 14 : 12,
      marginBottom: 20,
    },
    chartTitle: {
      fontSize: isDesktop ? 20 : 18,
      fontWeight: '900',
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    performerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    performerRank: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    performerRankText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFF',
    },
    performerName: {
      fontSize: isDesktop ? 17 : 16,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    performerStats: {
      fontSize: isDesktop ? 15 : 13,
      marginTop: 3,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    performerBadge: {
      paddingHorizontal: isDesktop ? 16 : 14,
      paddingVertical: 8,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    performerBadgeText: {
      fontSize: isDesktop ? 15 : 13,
      fontWeight: '700',
    },
    kanbanContainer: {
      marginBottom: isDesktop ? 32 : 24,
      width: '100%',
    },
    kanbanScroll: {
      flexGrow: 0,
      width: '100%',
    },
    kanbanColumns: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'space-between',
      width: '100%',
    },
    kanbanRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
      justifyContent: 'space-between',
      width: '100%',
    },
    columnWrapper: {
      flex: 1,
      minHeight: 250,
    },
    columnWrapperMobile: {
      flex: 1,
      minHeight: 280,
    },
    columnWrapperGrid: {
      flex: 0,
      width: (screenWidth - (responsiveContentPadding * 2) - (isTablet ? 12 : 10)) / 2,
      minHeight: isTablet ? 280 : 250,
    },
    exportButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertSection: {
      marginBottom: isDesktop ? 32 : 24,
      padding: isDesktop ? 20 : 16,
      borderRadius: 12,
      borderWidth: 1,
      width: '100%',
    },
    pomodoroStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 20,
    },
    pomodoroItem: {
      alignItems: 'center',
      flex: 1,
    },
    pomodoroValue: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '900',
      marginBottom: 4,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    pomodoroLabel: {
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    areaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    areaName: {
      fontSize: isDesktop ? 16 : 14,
      fontWeight: '600',
      flex: 1,
    },
    areaStats: {
      flexDirection: 'row',
      gap: isDesktop ? 24 : 16,
    },
    areaStat: {
      alignItems: 'center',
    },
    areaStatValue: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
    },
    areaStatLabel: {
      fontSize: isDesktop ? 12 : 11,
      marginTop: 2,
    },
    // Nuevos estilos para KPIs
    kpiSection: {
      marginBottom: 20,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    kpiCard: {
      flex: 1,
      minWidth: '45%',
      borderRadius: 16,
      borderWidth: 2.5,
      paddingVertical: 20,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    kpiValue: {
      fontSize: 28,
      fontWeight: '900',
      marginBottom: 6,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    // Estilos para charts row
    chartsRowContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    chartCardHalf: {
      flex: 1,
    },
    // Estilos para performer cards mejorados
    performersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    performerCard: {
      flex: 1,
      minWidth: '30%',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      backgroundColor: 'rgba(159, 34, 65, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(159, 34, 65, 0.15)',
      alignItems: 'center',
    },
    performerMedal: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    performerMedalText: {
      fontSize: 16,
      fontWeight: '700',
    },
    performerCardName: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    performerCardStat: {
      alignItems: 'center',
      marginBottom: 6,
    },
    performerCardValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    performerCardStatLabel: {
      fontSize: 10,
      fontWeight: '500',
      marginTop: 2,
    },
    // Estilos para área grid mejorado
    areaGridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    areaGridCard: {
      flex: 1,
      minWidth: '47%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 2,
    },
    areaColorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
    areaGridCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
      textAlign: 'center',
    },
    areaGridStats: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 8,
    },
    areaGridStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    areaGridCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
      textAlign: 'center',
    },
    areaGridStats: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 0,
    },
    areaGridStatItem: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    areaGridStatValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    areaGridStatLabel: {
      fontSize: 10,
      fontWeight: '500',
      marginTop: 2,
    },
    gridDivider: {
      width: 1,
      height: 30,
      marginHorizontal: 2,
    },
    progressBar: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      minWidth: 2,
    },
  });
};
