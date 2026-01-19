import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium } from '../utils/haptics';

/**
 * ThemeToggle button - Switches between light and dark mode
 */
const ThemeToggle = ({ size = 28, style }) => {
  const { theme, toggleTheme } = useTheme();
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    hapticMedium();
    
    // Simple scale animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    toggleTheme();
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Ionicons
          name={theme.isDark ? 'moon' : 'sunny'}
          size={size}
          color={theme.isDark ? '#FFD700' : '#FFA500'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
});

export default React.memo(ThemeToggle);
