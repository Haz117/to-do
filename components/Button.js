// components/Button.js
// Botón moderno reutilizable con variantes y animaciones
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', // primary, secondary, ghost, danger
  size = 'medium', // small, medium, large
  icon = null,
  iconPosition = 'left', // left, right
  loading = false,
  disabled = false,
  fullWidth = false,
  style 
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: theme.gradientPrimary,
          textColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          background: [theme.buttonSecondaryBg, theme.buttonSecondaryBg],
          textColor: theme.buttonSecondaryText,
        };
      case 'ghost':
        return {
          background: ['transparent', 'transparent'],
          textColor: theme.primary,
          border: true,
        };
      case 'danger':
        return {
          background: theme.gradientError,
          textColor: '#FFFFFF',
        };
      default:
        return {
          background: theme.gradientPrimary,
          textColor: '#FFFFFF',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 10,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
      case 'large':
        return {
          paddingVertical: 18,
          paddingHorizontal: 28,
          fontSize: 18,
          iconSize: 24,
        };
      default: // medium
        return {
          paddingVertical: 14,
          paddingHorizontal: 20,
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[
          styles.button,
          variantStyles.border && styles.buttonGhost,
          isDisabled && styles.buttonDisabled,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        <LinearGradient
          colors={variantStyles.background}
          style={[
            styles.gradient,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
            },
            variantStyles.border && { backgroundColor: 'transparent' },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {icon && iconPosition === 'left' && (
            <Ionicons 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={{ marginRight: 8 }} 
            />
          )}
          
          <Text
            style={[
              styles.text,
              {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
              },
              isDisabled && styles.textDisabled,
            ]}
          >
            {loading ? 'Cargando...' : title}
          </Text>

          {icon && iconPosition === 'right' && !loading && (
            <Ionicons 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={{ marginLeft: 8 }} 
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGhost: {
    borderWidth: 2,
    borderColor: 'rgba(159, 34, 65, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textDisabled: {
    opacity: 0.6,
  },
});
