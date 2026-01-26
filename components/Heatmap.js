// components/Heatmap.js
// Heatmap de actividad estilo GitHub
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const Heatmap = memo(function Heatmap({ data = [], onDayPress }) {
  const { theme, isDark } = useTheme();
  
  // Colores por nivel de actividad
  const getLevelColor = (level) => {
    if (isDark) {
      const colors = ['#161B22', '#0E4429', '#006D32', '#26A641', '#39D353'];
      return colors[level] || colors[0];
    }
    const colors = ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'];
    return colors[level] || colors[0];
  };
  
  // Agrupar datos por semanas
  const weeks = [];
  let currentWeek = [];
  
  data.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    
    // Si es domingo y no es el primer día, empezar nueva semana
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
    
    currentWeek.push(day);
    
    // Última semana
    if (index === data.length - 1) {
      weeks.push(currentWeek);
    }
  });
  
  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Actividad</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Labels de días */}
        <View style={styles.dayLabels}>
          {dayLabels.map((label, i) => (
            <Text key={i} style={[styles.dayLabel, { color: theme.textSecondary }]}>
              {i % 2 === 1 ? label : ''}
            </Text>
          ))}
        </View>
        
        {/* Grid de semanas */}
        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((day, dayIndex) => (
                <TouchableOpacity
                  key={`${weekIndex}-${dayIndex}`}
                  style={[
                    styles.cell,
                    { backgroundColor: getLevelColor(day.level) }
                  ]}
                  onPress={() => onDayPress && onDayPress(day)}
                  activeOpacity={0.7}
                >
                  {day.count > 0 && (
                    <Text style={styles.cellCount}>{day.count}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Leyenda */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Menos</Text>
        {[0, 1, 2, 3, 4].map(level => (
          <View
            key={level}
            style={[
              styles.legendCell,
              { backgroundColor: getLevelColor(level) }
            ]}
          />
        ))}
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Más</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  dayLabels: {
    marginRight: 8,
    justifyContent: 'space-around',
    height: 91, // 7 días * 13px
  },
  dayLabel: {
    fontSize: 10,
    height: 13,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  week: {
    gap: 3,
  },
  cell: {
    width: 13,
    height: 13,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellCount: {
    fontSize: 7,
    color: '#FFF',
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  legendCell: {
    width: 13,
    height: 13,
    borderRadius: 2,
  },
});

export default Heatmap;
