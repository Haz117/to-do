// components/AnimatedCard.js
// Tarjeta con animaciones avanzadas para mejor UX
import React, { useEffect, useState, memo } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';

const AnimatedCard = memo(function AnimatedCard({ 
  children, 
  onPress, 
  delay = 0,
  style = {},
  pressScale = 0.95
}) {
  const scaleAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const pressAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Animación de entrada con spring
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        delay,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [delay]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: pressScale,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pressAnim) },
              { translateY: slideAnim }
            ],
            opacity: scaleAnim
          },
          style
        ]}
      >
        {children}
      </Animated.View>
    </Component>
  );
});

export default AnimatedCard;
