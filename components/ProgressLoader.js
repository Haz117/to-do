// components/ProgressLoader.js
// Loader con barra de progreso para operaciones de guardado
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ProgressLoader = ({ 
  visible = false, 
  message = 'Guardando...',
  progress = null, // 0-100 or null for indeterminate
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (progress === null) {
        // Animación indeterminada
        Animated.loop(
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ).start();
      }
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (progress !== null) {
      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [progress]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {progress === null ? (
              <Animated.View 
                style={[
                  styles.spinner,
                  { transform: [{ rotate: spin }] }
                ]}
              />
            ) : (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}
            <Text style={styles.message}>{message}</Text>
            
            {progress !== null && (
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { width: progressWidth }
                  ]} 
                />
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  spinner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
    marginBottom: 16,
  },
  progressContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

export default ProgressLoader;
