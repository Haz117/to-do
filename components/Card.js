// components/Card.js
// Card moderno con glassmorphism y animaciones
import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function Card({ 
  children, 
  variant = 'elevated', // elevated, flat, glass, outlined
  onPress = null,
  style,
  padding = 16,
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: theme.surface,
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'glass':
        return {
          backgroundColor: theme.glass,
          borderWidth: 1,
          borderColor: theme.borderLight,
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
        };
      default: // elevated
        return {
          backgroundColor: theme.card,
          elevation: 4,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const CardContent = () => (
    <View
      style={[
        styles.card,
        variantStyles,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <CardContent />
        </Pressable>
      </Animated.View>
    );
  }

  return <CardContent />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
