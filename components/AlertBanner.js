// components/AlertBanner.js
// ✨ Banner de alerta profesional con 4 variantes
// Reemplaza emojis con iconos reales y diseño moderno

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveSpacing } from '../utils/responsiveTypography';
import { useResponsive } from '../utils/responsive';

export default function AlertBanner({
  type = 'info',           // 'success' | 'warning' | 'error' | 'info'
  title = 'Alerta',
  message = '',
  icon = null,             // Custom icon name
  action = null,           // { label, onPress }
  onClose = null,
  animated = true,
  dismissible = true,
}) {
  const { theme, isDark } = useTheme();
  const { width } = useResponsive();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animated]);

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
          borderColor: isDark ? '#10B981' : '#10B981',
          iconColor: isDark ? '#6EE7B7' : '#10B981',
          titleColor: isDark ? '#6EE7B7' : '#047857',
          messageColor: isDark ? '#D1FAE5' : '#065F46',
          iconName: icon || 'checkmark-circle',
        };
      case 'warning':
        return {
          backgroundColor: isDark ? '#78350F' : '#FFFBEB',
          borderColor: isDark ? '#FBBF24' : '#F59E0B',
          iconColor: isDark ? '#FCD34D' : '#F59E0B',
          titleColor: isDark ? '#FCD34D' : '#D97706',
          messageColor: isDark ? '#FEF3C7' : '#92400E',
          iconName: icon || 'alert-circle',
        };
      case 'error':
        return {
          backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
          borderColor: isDark ? '#F87171' : '#EF4444',
          iconColor: isDark ? '#FCA5A5' : '#EF4444',
          titleColor: isDark ? '#FCA5A5' : '#DC2626',
          messageColor: isDark ? '#FECACA' : '#991B1B',
          iconName: icon || 'close-circle',
        };
      case 'info':
      default:
        return {
          backgroundColor: isDark ? '#0C42A3' : '#EFF6FF',
          borderColor: isDark ? '#60A5FA' : '#3B82F6',
          iconColor: isDark ? '#93C5FD' : '#3B82F6',
          titleColor: isDark ? '#93C5FD' : '#1E40AF',
          messageColor: isDark ? '#DBEAFE' : '#1E3A8A',
          iconName: icon || 'information-circle',
        };
    }
  };

  const alertStyles = getAlertStyles();
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { scale: scaleAnim },
          ],
          marginHorizontal: responsiveSpacing.itemGap(width),
          marginVertical: responsiveSpacing.itemGap(width) / 2,
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: alertStyles.backgroundColor,
            borderColor: alertStyles.borderColor,
          },
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${alertStyles.iconColor}15` },
          ]}
        >
          <Ionicons
            name={alertStyles.iconName}
            size={28}
            color={alertStyles.iconColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: alertStyles.titleColor },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                { color: alertStyles.messageColor },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          ) : null}
          {action ? (
            <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
              <Text
                style={[
                  styles.actionText,
                  { color: alertStyles.iconColor },
                ]}
              >
                {action.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={alertStyles.iconColor}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Close Button */}
        {dismissible && onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={20}
              color={alertStyles.iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: 8,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
