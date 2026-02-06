// components/StatCard.js
// Tarjeta de estadística con icono, valor y descripción
// ✨ Componente nuevo para mejorar visualización de datos

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StatCard({
  icon = 'checkmark-circle',
  iconColor = '#10B981',
  label = 'Completadas',
  value = '0',
  subtitle = '',
  trend = null,  // { direction: 'up' | 'down', value: '5%' }
  variant = 'default', // default, success, warning, error, info
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: theme.statusClosedBg || 'rgba(16, 185, 129, 0.1)',
          borderColor: theme.statusClosed || '#10B981',
          textColor: theme.statusClosed || '#10B981',
        };
      case 'warning':
        return {
          bgColor: theme.statusPendingBg || 'rgba(245, 158, 11, 0.1)',
          borderColor: theme.statusPending || '#F59E0B',
          textColor: theme.statusPending || '#F59E0B',
        };
      case 'error':
        return {
          bgColor: theme.errorAlpha || 'rgba(239, 68, 68, 0.1)',
          borderColor: theme.error || '#EF4444',
          textColor: theme.error || '#EF4444',
        };
      case 'info':
        return {
          bgColor: theme.infoAlpha || 'rgba(59, 130, 246, 0.1)',
          borderColor: theme.info || '#3B82F6',
          textColor: theme.info || '#3B82F6',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'rgba(159, 34, 65, 0.08)',
          borderColor: theme.primary,
          textColor: theme.primary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.bgColor,
          borderColor: variantStyles.borderColor,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${variantStyles.textColor}15` },
        ]}
      >
        <Ionicons name={icon} size={32} color={iconColor || variantStyles.textColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
        
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: variantStyles.textColor }]}>
            {value}
          </Text>

          {trend && (
            <View
              style={[
                styles.trend,
                {
                  backgroundColor: trend.direction === 'up' ? '#10B98115' : '#EF444415',
                  borderColor: trend.direction === 'up' ? '#10B981' : '#EF4444',
                },
              ]}
            >
              <Ionicons
                name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={trend.direction === 'up' ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: trend.direction === 'up' ? '#10B981' : '#EF4444' },
                ]}
              >
                {trend.value}
              </Text>
            </View>
          )}
        </View>

        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '400',
  },
});
