import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * EmptyState component - Shows a friendly message when no data is available
 * ✨ Mejorado con animaciones fluidas y rápidas
 * 
 * @param {string} icon - Ionicons icon name
 * @param {string} title - Main heading text
 * @param {string} message - Descriptive message
 * @param {React.ReactNode} action - Optional action button/component
 */
const EmptyState = ({ 
  icon = 'document-text-outline', 
  title = 'Sin tareas', 
  message = 'No hay tareas disponibles en este momento',
  action = null,
  variant = 'default', // default, success, info, warning
}) => {
  const { theme, isDark } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // ✨ Entrada rápida con spring
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // 🌊 Animación flotante suave (más rápida)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 💫 Pulso suave del círculo de fondo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: theme.statusClosedBg || 'rgba(16, 185, 129, 0.1)',
          iconColor: theme.statusClosed || '#10B981',
          pulseColor: 'rgba(16, 185, 129, 0.3)',
        };
      case 'info':
        return {
          bgColor: theme.infoAlpha || 'rgba(59, 130, 246, 0.1)',
          iconColor: theme.info || '#3B82F6',
          pulseColor: 'rgba(59, 130, 246, 0.3)',
        };
      case 'warning':
        return {
          bgColor: theme.statusPendingBg || 'rgba(245, 158, 11, 0.1)',
          iconColor: theme.statusPending || '#F59E0B',
          pulseColor: 'rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'rgba(159, 34, 65, 0.08)',
          iconColor: theme.textSecondary,
          pulseColor: isDark ? 'rgba(255, 107, 157, 0.2)' : 'rgba(159, 34, 65, 0.15)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <Animated.View style={[
      styles.container, 
      { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      {/* 🎨 Capa de pulso expansivo de fondo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: variantStyles.pulseColor,
          transform: [{ scale: pulseAnim }],
          opacity: 0.5,
        }}
      />

      {/* ✨ Contenedor del ícono con animaciones */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: variantStyles.bgColor,
            transform: [
              { translateY: floatY },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Ionicons name={icon} size={72} color={variantStyles.iconColor} />
      </Animated.View>
      
      {/* 📝 Texto principal */}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      
      {action && <View style={styles.actionContainer}>{action}</View>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  actionContainer: {
    marginTop: 24,
  },
});

export default React.memo(EmptyState);
