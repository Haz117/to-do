import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * EmptyState component - Shows a friendly message when no data is available
 * ✨ Mejorado con animaciones y tema
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación flotante del ícono
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in del contenido
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: theme.statusClosedBg || 'rgba(16, 185, 129, 0.1)',
          iconColor: theme.statusClosed || '#10B981',
        };
      case 'info':
        return {
          bgColor: theme.infoAlpha || 'rgba(59, 130, 246, 0.1)',
          iconColor: theme.info || '#3B82F6',
        };
      case 'warning':
        return {
          bgColor: theme.statusPendingBg || 'rgba(245, 158, 11, 0.1)',
          iconColor: theme.statusPending || '#F59E0B',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'rgba(159, 34, 65, 0.08)',
          iconColor: theme.textSecondary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: variantStyles.bgColor,
            transform: [{ translateY: floatY }],
          },
        ]}
      >
        <Ionicons name={icon} size={80} color={variantStyles.iconColor} />
      </Animated.View>
      
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
    paddingVertical: 60,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  actionContainer: {
    marginTop: 28,
  },
});

export default React.memo(EmptyState);
