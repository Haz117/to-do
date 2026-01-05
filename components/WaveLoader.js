// components/WaveLoader.js
// Skeleton con ondas animadas más avanzado
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WaveLoader = ({ 
  width = '100%',
  height = 100,
  borderRadius = 16,
  baseColor = '#E5E5EA',
  waveColor = 'rgba(255, 255, 255, 0.6)',
}) => {
  const wave1Anim = useRef(new Animated.Value(-1)).current;
  const wave2Anim = useRef(new Animated.Value(-1)).current;
  const wave3Anim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const createWaveAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createWaveAnimation(wave1Anim, 0),
      createWaveAnimation(wave2Anim, 300),
      createWaveAnimation(wave3Anim, 600),
    ]).start();
  }, []);

  const createWaveStyle = (anim) => ({
    transform: [
      {
        translateX: anim.interpolate({
          inputRange: [-1, 1],
          outputRange: [-500, 500],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius, backgroundColor: baseColor }]}>
      <Animated.View style={[styles.wave, createWaveStyle(wave1Anim)]}>
        <LinearGradient
          colors={['transparent', waveColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
      <Animated.View style={[styles.wave, createWaveStyle(wave2Anim)]}>
        <LinearGradient
          colors={['transparent', waveColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
      <Animated.View style={[styles.wave, createWaveStyle(wave3Anim)]}>
        <LinearGradient
          colors={['transparent', waveColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    width: 500,
  },
});

export default WaveLoader;
