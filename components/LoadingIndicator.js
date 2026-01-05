// components/LoadingIndicator.js
// Diferentes tipos de indicadores de carga
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function LoadingIndicator({ 
  type = 'dots', 
  color = '#007AFF',
  size = 10 
}) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (type === 'dots') {
      const animateDots = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.parallel([
              Animated.timing(dot1, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(dot2, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(dot3, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
          ])
        ).start();
      };
      animateDots();
    } else if (type === 'spinner') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else if (type === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [type]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (type === 'dots') {
    return (
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              backgroundColor: color,
              opacity: dot1,
              transform: [{ scale: dot1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              backgroundColor: color,
              opacity: dot2,
              transform: [{ scale: dot2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              backgroundColor: color,
              opacity: dot3,
              transform: [{ scale: dot3 }],
            },
          ]}
        />
      </View>
    );
  }

  if (type === 'spinner') {
    return (
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size * 3,
            height: size * 3,
            borderColor: color,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
          },
        ]}
      />
    );
  }

  if (type === 'pulse') {
    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size * 2,
            height: size * 2,
            backgroundColor: color,
            opacity: dot1,
            transform: [{ scale: dot1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
          },
        ]}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 50,
  },
  spinner: {
    borderRadius: 100,
    borderWidth: 3,
  },
  pulse: {
    borderRadius: 100,
  },
});
