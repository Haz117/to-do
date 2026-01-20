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

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { theme, isDark } = useTheme();
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
      console.error('Error cargando dashboard:', error);
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

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

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
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSubtitle}>Estadísticas y Métricas</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjetas de métricas principales */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
            <View style={[styles.metricIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{metrics.completed}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Completadas</Text>
            <Text style={[styles.metricPercent, { color: '#10B981' }]}>{metrics.completionRate}%</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
            <View style={[styles.metricIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="time" size={24} color="#FFF" />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{metrics.pending}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Pendientes</Text>
            {metrics.overdue > 0 && (
              <Text style={[styles.metricPercent, { color: '#EF4444' }]}>{metrics.overdue} vencidas</Text>
            )}
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
            <View style={[styles.metricIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="play-circle" size={24} color="#FFF" />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{metrics.inProgress}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>En Proceso</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
            <View style={[styles.metricIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="eye" size={24} color="#FFF" />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{metrics.inReview}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>En Revisión</Text>
          </View>
        </View>

        {/* Selector de periodo */}
        <View style={styles.periodSelector}>
          {['today', 'week', 'month'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: theme.primary },
              ]}
              onPress={() => { setSelectedPeriod(period); hapticMedium(); }}
            >
              <Text style={[
                styles.periodButtonText,
                { color: selectedPeriod === period ? '#FFF' : theme.textSecondary }
              ]}>
                {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Métricas del periodo */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Resumen del {selectedPeriod === 'today' ? 'Día' : selectedPeriod === 'week' ? 'de la Semana' : 'Mes'}
          </Text>
          <View style={styles.periodStats}>
            <View style={styles.periodStat}>
              <Text style={[styles.periodValue, { color: theme.primary }]}>{periodData.created}</Text>
              <Text style={[styles.periodLabel, { color: theme.textSecondary }]}>Creadas</Text>
            </View>
            <View style={styles.periodStat}>
              <Text style={[styles.periodValue, { color: '#10B981' }]}>{periodData.completed}</Text>
              <Text style={[styles.periodLabel, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
            <View style={styles.periodStat}>
              <Text style={[styles.periodValue, { color: '#8B5CF6' }]}>{metrics.weeklyProductivity}%</Text>
              <Text style={[styles.periodLabel, { color: theme.textSecondary }]}>Productividad</Text>
            </View>
          </View>
        </View>

        {/* Tiempo promedio de completado */}
        {metrics.avgCompletionTime > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="timer-outline" size={24} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiempo Promedio</Text>
            </View>
            <Text style={[styles.avgTime, { color: theme.text }]}>
              {formatCompletionTime(metrics.avgCompletionTime)}
            </Text>
            <Text style={[styles.avgTimeLabel, { color: theme.textSecondary }]}>
              Tiempo promedio para completar tareas
            </Text>
          </View>
        )}

        {/* Gráfica de tendencia */}
        {trendData.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Tendencia (últimos 7 días)</Text>
            <LineChart
              data={lineData}
              width={width - 60}
              height={220}
              chartConfig={{
                backgroundColor: theme.card,
                backgroundGradientFrom: theme.card,
                backgroundGradientTo: theme.card,
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
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Distribución por Estado</Text>
            <PieChart
              data={statusPieData}
              width={width - 60}
              height={220}
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

        {/* Tareas por prioridad */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Tareas por Prioridad</Text>
          <BarChart
            data={priorityBarData}
            width={width - 60}
            height={220}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              barPercentage: 0.7,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        {/* Top performers (solo admin) */}
        {currentUser?.role === 'admin' && performers.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top Performers (Esta Semana)</Text>
            {performers.slice(0, 5).map((performer, index) => (
              <View key={performer.userId} style={[styles.performer, { borderBottomColor: theme.border }]}>
                <View style={styles.performerLeft}>
                  <View style={[styles.performerRank, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.surface }]}>
                    <Text style={styles.performerRankText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={[styles.performerName, { color: theme.text }]}>{performer.name}</Text>
                    <Text style={[styles.performerStats, { color: theme.textSecondary }]}>
                      {performer.completedThisWeek} completadas • {performer.completionRate}% tasa
                    </Text>
                  </View>
                </View>
                <View style={[styles.performerBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.performerBadgeText, { color: '#10B981' }]}>
                    {performer.onTimeRate}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Estadísticas por área (solo admin) */}
        {currentUser?.role === 'admin' && Object.keys(areaStats).length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Estadísticas por Área</Text>
            {Object.entries(areaStats).map(([area, stats]) => (
              <View key={area} style={[styles.areaStat, { borderBottomColor: theme.border }]}>
                <Text style={[styles.areaName, { color: theme.text }]}>{area}</Text>
                <View style={styles.areaMetrics}>
                  <View style={styles.areaMetric}>
                    <Text style={[styles.areaMetricValue, { color: theme.text }]}>{stats.total}</Text>
                    <Text style={[styles.areaMetricLabel, { color: theme.textSecondary }]}>Total</Text>
                  </View>
                  <View style={styles.areaMetric}>
                    <Text style={[styles.areaMetricValue, { color: '#10B981' }]}>{stats.completed}</Text>
                    <Text style={[styles.areaMetricLabel, { color: theme.textSecondary }]}>Completadas</Text>
                  </View>
                  <View style={styles.areaMetric}>
                    <Text style={[styles.areaMetricValue, { color: theme.primary }]}>{stats.completionRate}%</Text>
                    <Text style={[styles.areaMetricLabel, { color: theme.textSecondary }]}>Tasa</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF90',
  },
  scroll: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  metricPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  periodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  periodStat: {
    alignItems: 'center',
  },
  periodValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  periodLabel: {
    fontSize: 13,
  },
  avgTime: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  avgTimeLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  performerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    fontWeight: '700',
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
  areaStat: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  areaMetrics: {
    flexDirection: 'row',
    gap: 20,
  },
  areaMetric: {
    alignItems: 'center',
  },
  areaMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  areaMetricLabel: {
    fontSize: 12,
  },
});
