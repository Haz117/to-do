// screens/DashboardScreen.js
// Dashboard con métricas, gráficas y estadísticas
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentSession } from '../services/authFirestore';
import { getGeneralMetrics, getTrendData, getAreaStats, getTopPerformers, formatCompletionTime } from '../services/analytics';
import { hapticMedium } from '../utils/haptics';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
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
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // today, week, month

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
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
      }
    } catch (error) {
      // Error silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    hapticMedium();
    loadData();
  }, [loadData]);

  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, screenWidth, padding, columns), [theme, isDark, isDesktop, isTablet, screenWidth, padding, columns]);

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
                <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Hola!</Text>
              </View>
              <Text style={styles.heading}>Reportes</Text>
            </View>
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
        {/* Tarjetas de métricas principales con StatCard */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <StatCard
              icon="checkmark-done"
              value={metrics.completed.toString()}
              label="Completadas"
              variant="success"
              trend={{ direction: metrics.completionRate >= 70 ? 'up' : 'down', value: `${metrics.completionRate}%` }}
            />

            <StatCard
              icon="time"
              value={metrics.pending.toString()}
              label="Pendientes"
              variant="warning"
              trend={metrics.overdue > 0 ? { direction: 'down', value: `${metrics.overdue} vencidas` } : undefined}
            />

            <StatCard
              icon="play-circle"
              value={metrics.inProgress.toString()}
              label="En Proceso"
              variant="info"
            />

            <StatCard
              icon="eye"
              value={metrics.inReview.toString()}
              label="En Revisión"
              variant="info"
            />
          </View>
        </View>

        {/* Selector de periodo */}
        <View style={styles.periodSelector}>
          {['today', 'week', 'month'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                { backgroundColor: theme.background },
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => { setSelectedPeriod(period); hapticMedium(); }}
            >
              <Text style={[
                styles.periodButtonText,
                { color: theme.text },
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumen del periodo */}
        <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            Resumen del {selectedPeriod === 'today' ? 'Día' : selectedPeriod === 'week' ? 'de la Semana' : 'Mes'}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>{periodData.created}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Creadas</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{periodData.completed}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
            <View style={styles.summaryItem}>
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
              <Text style={[styles.chartTitle, { color: theme.text }]}>Top Performers (Esta Semana)</Text>
            </View>
            {performers.slice(0, 3).map((performer, index) => (
              <View key={performer.userId} style={[styles.performerRow, index < 2 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.performerRank, { 
                    backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                  }]}>
                    <Text style={styles.performerRankText}>{index + 1}</Text>
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
      </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding, columns) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentWrapper: {
    alignSelf: 'center',
    width: '100%',
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCardLarge: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  metricCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricNumberLarge: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 4,
  },
  metricLabelLarge: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  metricPercentLarge: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodButtonActive: {
    backgroundColor: theme.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  performerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  performerStats: {
    fontSize: 12,
    marginTop: 2,
  },
  performerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  performerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
